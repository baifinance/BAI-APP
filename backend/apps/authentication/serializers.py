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

    def create(self, validated_data):
        request = self.context["request"]

        # Create inactive user; they must accept invite and set password
        with transaction.atomic():
            user = User.objects.create_user(
                    email=validated_data["email"],
                    username=validated_data["email"],
                    password=User.objects.make_random_password(),
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
        broker_id = attrs.get("broker_id")
        attrs["email"] = email

        if role == UserRole.CLIENT:
            if not broker_id:
                raise serializers.ValidationError(
                    {"broker_id": "A corresponding broker is required when creating a client account."}
                )
            if not User.objects.filter(id=broker_id, role=UserRole.BROKER, is_active=True).exists():
                raise serializers.ValidationError(
                     {"broker_id": "Selected broker does not exist or is inactive."}
                )
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

        return attrs

    def create(self, validated_data, actor=None):
        """
        Create or reuse an inactive user with the given role,
        and create a new Invitation.
        Returns (user, invitation).
        """
        email = validated_data["email"]
        role = validated_data["role"]
        broker_id = validated_data.get("broker_id")
        # Link client directly to the corresponding broker

        assigned_broker = None
        if role == UserRole.CLIENT and broker_id:
            assigned_broker = User.objects.get(id=broker_id)

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
                    invited_by=assigned_broker
                )

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
    Invitee provides:
      - token
      - password, password_confirm
      - first_name, last_name
      - license_no (only if broker; enforced by validation)
    """
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    license_no = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
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

        return attrs

    def save(self, request=None):
        invitation = self.invitation
        user = invitation.user

        with transaction.atomic():
            user.first_name = self.validated_data["first_name"]
            user.last_name = self.validated_data["last_name"]
            
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
                    user=user
                    # verification_status defaults to PENDING in the model
                )
            
            invitation.status = InviteStatus.ACCEPTED
            invitation.save()

        return user