"""Seed deterministic demo data for the client-portal demo.

Requires --confirm. Creates or updates demo users, profiles, applications,
bookings, notifications, and an inactive invitation. Does not send live
emails unless --send-notification-email is passed.
"""

from decimal import Decimal
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from audit.services import log_action
from authentication.models import Invitation
from authentication.choices import InviteStatus
from bookings.choices import BookingStatus, ConsultationType, MeetingPlatform
from loans.choices import ApplicationStatus
from notifications.choices import NotificationType
from notifications.email import enqueue_notification_email, send_due_notification_emails
from notifications.models import NotificationPreference
from notifications.services import create_notification
from users.choices import UserRole, UserStatus, VerificationStatus
from users.models import User, ClientProfile, BrokerProfile

DEMO_EMAILS = {
    UserRole.CLIENT: "demo-client@baifinance.example.com",
    UserRole.BROKER: "demo-broker@baifinance.example.com",
    UserRole.LOAN_PROCESSING: "demo-loan-processor@baifinance.example.com",
    UserRole.COMPLIANCE: "demo-compliance@baifinance.example.com",
}

DEMO_INVITEE_EMAIL = "demo-invitee@baifinance.example.com"


class Command(BaseCommand):
    help = "Seed deterministic demo data for the client-portal demo."

    def add_arguments(self, parser):
        parser.add_argument("--confirm", action="store_true", help="Required to run the seeder.")
        parser.add_argument("--reset", action="store_true", help="Delete seeded demo rows before seeding.")
        parser.add_argument("--send-notification-email", action="store_true", help="Send one queued notification email after seeding.")

    def handle(self, *args, **options):
        if not options["confirm"]:
            raise CommandError("Pass --confirm to run seed_demo.")

        reset = options["reset"]
        send_email = options["send_notification_email"]

        with transaction.atomic():
            users = self._seed_users(reset)
            profiles = self._seed_profiles(users, reset)
            self._seed_preferences(users)
            application, booking, invitee_token = self._seed_demo_objects(users, profiles, reset)
            notifications = self._seed_notifications(users, application, booking, reset)
            self._seed_audit(users[UserRole.COMPLIANCE])

        if send_email:
            sent, attempted = send_due_notification_emails(limit=10)
            self.stdout.write(self.style.SUCCESS(f"Notification email drain: sent={sent} attempted={attempted}"))

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
        if invitee_token:
            self.stdout.write(self.style.NOTICE(f"Invitee token: {invitee_token}"))
        self.stdout.write(self.style.NOTICE("Activation link: /auth/activate#token=<invitee-token>"))

    def _seed_users(self, reset):
        users = {}
        for role, email in DEMO_EMAILS.items():
            user, created = User.objects.update_or_create(
                email__iexact=email,
                defaults={
                    "email": email,
                    "username": email,
                    "role": role,
                    "status": UserStatus.ACTIVE,
                    "is_active": True,
                    "mfa_enabled": False,
                },
            )
            if created or reset:
                user.set_password("DemoPassword123!")
                user.save(update_fields=["password"])
            users[role] = user

        invitee, created = User.objects.update_or_create(
            email__iexact=DEMO_INVITEE_EMAIL,
            defaults={
                "email": DEMO_INVITEE_EMAIL,
                "username": DEMO_INVITEE_EMAIL,
                "role": UserRole.CLIENT,
                "status": UserStatus.INACTIVE,
                "is_active": False,
                "mfa_enabled": False,
            },
        )
        if created or reset:
            invitee.set_password(None)
            invitee.save(update_fields=["password"])
        users["invitee"] = invitee
        return users

    def _seed_profiles(self, users, reset):
        client_user = users[UserRole.CLIENT]
        broker_user = users[UserRole.BROKER]

        client_profile, _ = ClientProfile.objects.update_or_create(
            user=client_user,
            defaults={
                "verification_status": VerificationStatus.VERIFIED,
                "mobile": "+61400000000",
                "address": "Demo Street, Sydney NSW 2000",
                "dob": "1990-01-01",
                "visa": "Permanent Resident",
                "visa_subclass": "",
                "visa_expiry": "",
                "loan_amount": "450000",
                "goal": "First home purchase",
                "source": "Demo seed",
                "inquiry": "Demo loan inquiry",
                "loan_status": "submitted",
            },
        )

        broker_profile, _ = BrokerProfile.objects.update_or_create(
            user=broker_user,
            defaults={
                "license_no": "DEMO-BROKER-001",
            },
        )
        return {"client": client_profile, "broker": broker_profile}

    def _seed_preferences(self, users):
        for key, user in users.items():
            if key == "invitee":
                continue
            NotificationPreference.objects.update_or_create(
                user=user,
                defaults={
                    "push_enabled": False,
                    "email_critical_enabled": True,
                    "email_optional_enabled": False,
                },
            )

    def _seed_demo_objects(self, users, profiles, reset):
        client_user = users[UserRole.CLIENT]
        compliance_user = users[UserRole.COMPLIANCE]
        client_profile = profiles["client"]
        broker_profile = profiles["broker"]

        LoanApplication = __import__("loans.models", fromlist=["LoanApplication"]).LoanApplication
        Booking = __import__("bookings.models", fromlist=["Booking"]).Booking

        if reset:
            LoanApplication.objects.filter(client=client_profile).delete()
            Booking.objects.filter(client=client_profile).delete()

        LoanApplication.objects.filter(client=client_profile, is_primary=True).update(is_primary=False)
        application, _ = LoanApplication.objects.update_or_create(
            client=client_profile,
            is_primary=True,
            defaults={
                "broker": broker_profile,
                "amount": Decimal("450000.00"),
                "lender": "Demo Lender",
                "status": ApplicationStatus.SUBMITTED,
                "asana_status": "Under Review",
                "created_by": compliance_user,
            },
        )

        slot_time = timezone.now() + timedelta(days=2, hours=10)
        try:
            booking, _ = Booking.objects.get_or_create(
                broker=broker_profile,
                slot_time=slot_time,
                defaults={
                    "client": client_profile,
                    "consultation_type": ConsultationType.INITIAL_STRATEGY,
                    "meeting_platform": MeetingPlatform.GOOGLE_MEET,
                    "notes": "Demo consultation booking.",
                    "status": BookingStatus.SCHEDULED,
                },
            )
        except Exception:
            booking = None

        invitee = users["invitee"]
        invitation, _ = Invitation.objects.update_or_create(
            user=invitee,
            status=InviteStatus.PENDING,
            defaults={
                "expires_at": timezone.now() + timedelta(days=7),
                "sent_by": compliance_user,
            },
        )
        invitee_token = invitation.token

        return application, booking, invitee_token

    def _seed_notifications(self, users, application, booking, reset):
        client_user = users[UserRole.CLIENT]
        if reset:
            from notifications.models import Notification, EmailDelivery
            EmailDelivery.objects.filter(notification__recipient=client_user).delete()
            Notification.objects.filter(recipient=client_user).delete()

        notifications = []
        if booking:
            notification = create_notification(
                recipient=client_user,
                notification_type=NotificationType.BOOKING,
                title="Demo booking confirmed",
                message="Your demo consultation is booked.",
                related_object=booking,
            )
            enqueue_notification_email(notification)
            notifications.append(notification)

        if application:
            notification = create_notification(
                recipient=client_user,
                notification_type=NotificationType.LOAN_STATUS,
                title="Demo loan application submitted",
                message="Your demo loan application has been submitted and is under review.",
                related_object=application,
            )
            enqueue_notification_email(notification)
            notifications.append(notification)

        return notifications

    def _seed_audit(self, actor):
        try:
            log_action("SEED_DEMO", actor=actor, entity_type="DemoData", entity_id=None)
        except Exception:
            pass
