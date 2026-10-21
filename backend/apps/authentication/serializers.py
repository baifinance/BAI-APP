# authentication/serializers.py
# -----------------------------------------------------------------------
# Define your authentication-related serializers here.
#
# Examples:
#   - LoginSerializer       – validate email/password
#   - RegisterSerializer    – handle registration payload
#   - TokenSerializer       – serialize JWT / token responses
# -----------------------------------------------------------------------

from rest_framework import serializers  # noqa: F401
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from users.models import User, BrokerProfile, ClientProfile
from users.choices import UserRole, UserStatus
from authentication.models import Invitation
from authentication.choices import InviteStatus

User = get_user_model()

class LoanProcessingAccountCreateSerializer(serializers.Serializer):
    username = None # disable username field
    email = serializers.EmailField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )
        return email

    def create(self, validated_data):
        request = self.context["request"]

        # Create inactive user; they must accept invite and set password
        with transaction.atomic():
            user = User.objects.create_user(
                    email=validated_data["email"],
                    username=validated_data["email"],
                    password=None,
                    role=UserRole.LOAN_PROCESSING,
                    status=UserStatus.ACTIVE,
                    is_active=False,
                    invited_by=request.user
                )
            if "first_name" in validated_data:
                user.first_name = validated_data["first_name"]
            if "last_name" in validated_data:
                user.last_name = validated_data["last_name"]
            user.save()

            
            invitation = Invitation.objects.create(
                user=user,
                sent_by=request.user
            )

            user.invitation = invitation

        return user


class SendInviteSerializer(serializers.Serializer):
    """
    Serializer for Loan Processing/Brokers to send an invitation email
    to either a broker or a client.

    Validation rules:
        - Email must be valid format.
        - Role must be 'broker' or 'client'.
        - Email cannot belong to an account with a different role.
        - Email cannot belong to an account that is already active/registered.
    """
    email = serializers.EmailField()
    role = serializers.ChoiceField(
    choices=[(UserRole.BROKER, "Broker"), (UserRole.CLIENT, "Client")]
    )
    broker_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        role = attrs["role"]
        attrs["email"] = email

        try:
            user = User.objects.get(email=email)
            if user.role != role:
                 raise serializers.ValidationError(
                     {"email": f"A user with this email already exists as a '{user.role}'."}
                )
            if user.is_active:
                raise serializers.ValidationError(
                    {"email": "This account is already registered and active."}
                )
        except User.DoesNotExist:
            pass

        if role == UserRole.CLIENT:
            from django.conf import settings as dj_settings
            if getattr(dj_settings, "ASANA_PROFILE_LOOKUP_ENABLED", False):
                from asana_integration.services.asana import (
                    AsanaProfileError,
                    AsanaProfileService,
                )
                try:
                    profile = AsanaProfileService().find_profile_by_email(email)
                except AsanaProfileError:
                    raise serializers.ValidationError(
                        {"email": "Unable to verify Asana right now. Try again later."}
                    )
                if profile is None:
                    raise serializers.ValidationError(
                        {"email": "Must exist in Asana — no record found for this email in the loan project."}
                    )

        broker_id = attrs.get("broker_id")
        if broker_id:
            if role != UserRole.CLIENT:
                raise serializers.ValidationError(
                    {"broker_id": "broker_id is only valid when inviting a client."}
                )
            if not User.objects.filter(
                id=broker_id, role=UserRole.BROKER, is_active=True
            ).exists():
                raise serializers.ValidationError(
                    {"broker_id": "Broker not found or is inactive."}
                )

        return attrs

    def create(self, validated_data, actor=None):
        """
        Create or reuse an inactive user with the given role,
        and create a new Invitation.
        Returns (user, invitation).
        """
        email = validated_data["email"]
        role = validated_data["role"]

        with transaction.atomic():
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                user = User.objects.create_user(
                    email=email,
                    username=email,
                    role=role,
                    status=UserStatus.INACTIVE,
                    is_active=False,
                )

            # Link the invited client to the broker that invited them so the
            # broker can be resolved later (e.g. available booking slots).
            broker_id = validated_data.get("broker_id")
            if role == UserRole.CLIENT and broker_id:
                user.invited_by_id = broker_id
                user.save(update_fields=["invited_by"])

            # Revoke previous pending invitations for safety
            Invitation.objects.filter(user=user, status=InviteStatus.PENDING).update(status=InviteStatus.REVOKED)
            invitation = Invitation.objects.create(
                user=user,
                sent_by=actor
            )
        return user, invitation
            

    
class InvitationAcceptSerializer(serializers.Serializer):
    """
    Serializer for accepting an invitation and setting a password.
    Client: password-only (names + profile auto-filled from Asana).
    Broker: password + license_no (+ optional names).
    """
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=12)
    password_confirm = serializers.CharField(write_only=True, required=False, allow_blank=True)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    middle_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    license_no = serializers.CharField(required=False, allow_blank=True)

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        if attrs.get("password_confirm") and attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        token = attrs["token"]
        try:
            self.invitation = Invitation.objects.select_related("user").get(token=token)
        except Invitation.DoesNotExist:
            raise serializers.ValidationError({"token": "Invalid invitation token."})

        if not self.invitation.is_valid():
            raise serializers.ValidationError(
                 {"token": "Invitation is expired or no longer valid."}
            )

        user = self.invitation.user
        if user.is_active:
            raise serializers.ValidationError(
                {"token": "This account is already active."}
            )

        # Require license_no for brokers      
        if user.role == UserRole.BROKER:
            if not attrs.get("license_no"):
                raise serializers.ValidationError(
                    {"license_no": "License number is required for brokers."}
                )
            if BrokerProfile.objects.filter(license_no=attrs["license_no"]).exists():
                raise serializers.ValidationError(
                    {"license_no": "This license number is already registered."}
                )

        # Client must type First + Last; Middle optional. Typed names win over Asana split.
        if user.role == UserRole.CLIENT:
            if not (attrs.get("first_name") or "").strip():
                raise serializers.ValidationError({"first_name": "First name is required."})
            if not (attrs.get("last_name") or "").strip():
                raise serializers.ValidationError({"last_name": "Last name is required."})

        return attrs

    def save(self, request=None):
        invitation = self.invitation
        user = invitation.user

        asana_profile = None
        if user.role == UserRole.CLIENT:
            from django.conf import settings as dj_settings
            from asana_integration.services.asana import (
                AsanaProfileError,
                AsanaProfileService,
            )
            if getattr(dj_settings, "ASANA_PROFILE_LOOKUP_ENABLED", False):
                try:
                    asana_profile = AsanaProfileService().find_profile_by_email(user.email)
                except AsanaProfileError:
                    raise serializers.ValidationError(
                        {"email": "Unable to verify Asana right now. Try again later."}
                    )
                if asana_profile is None:
                    raise serializers.ValidationError(
                        {"email": "Must exist in Asana — no record found for this email in the loan project."}
                    )

        with transaction.atomic():
            if user.role == UserRole.CLIENT and asana_profile:
                fullname = (asana_profile.get("fullname") or "").strip()
                parts = fullname.split()
                typed_first = (self.validated_data.get("first_name") or "").strip()
                typed_middle = (self.validated_data.get("middle_name") or "").strip()
                typed_last = (self.validated_data.get("last_name") or "").strip()
                user.first_name = typed_first or (parts[0] if parts else "")
                if typed_last:
                    user.last_name = typed_last
                elif len(parts) >= 2 and not typed_middle:
                    user.last_name = " ".join(parts[1:])
                elif len(parts) >= 2:
                    user.last_name = " ".join(parts[1:])
                else:
                    user.last_name = ""
                middle_to_store = typed_middle or None
            else:
                if self.validated_data.get("first_name"):
                    user.first_name = self.validated_data["first_name"].strip()
                if self.validated_data.get("last_name"):
                    user.last_name = self.validated_data["last_name"].strip()
                middle_to_store = (self.validated_data.get("middle_name") or "").strip() or None
            
            user.set_password(self.validated_data["password"])
            user.status = UserStatus.ACTIVE
            user.is_active = True
            user.save()
            
            # Create role-specific profile
            if user.role == UserRole.BROKER:
                BrokerProfile.objects.create(
                    user=user,
                    license_no=self.validated_data["license_no"]
                    )
            elif user.role == UserRole.CLIENT:
                ClientProfile.objects.create(
                    user=user,
                    asana_fullname=(asana_profile or {}).get("fullname"),
                    middle_name=middle_to_store,
                    mobile=(asana_profile or {}).get("mobile"),
                    address=(asana_profile or {}).get("address"),
                    dob=(asana_profile or {}).get("dob"),
                    visa=(asana_profile or {}).get("visa"),
                    visa_subclass=(asana_profile or {}).get("visa_subclass"),
                    visa_expiry=(asana_profile or {}).get("visa_expiry"),
                    loan_amount=(asana_profile or {}).get("loan_amount"),
                    goal=(asana_profile or {}).get("goal"),
                    source=(asana_profile or {}).get("source"),
                    inquiry=(asana_profile or {}).get("inquiry"),
                    loan_status=(asana_profile or {}).get("loan_status"),
                    # Seed step 1 with the moment the client was added in Asana
                    # (task created_at), falling back to now when Asana has no
                    # record or the lookup is disabled.
                    loan_status_history={
                        "Pending": (
                            (asana_profile or {}).get("asana_created_at")
                            or timezone.now().isoformat()
                        )
                    },
                    # verification_status defaults to PENDING in the model
                )
            
            invitation.status = InviteStatus.ACCEPTED
            invitation.save()

        return user