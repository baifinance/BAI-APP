# loans/views.py
# -----------------------------------------------------------------------
# Define your loan-related API views here.
#
# Examples:
#   - LoanApplicationListView     – GET  /api/loans/
#   - LoanApplicationDetailView   – GET  /api/loans/<id>/
#   - LoanApplicationCreateView   – POST /api/loans/
#   - LoanApplicationUpdateView   – PUT  /api/loans/<id>/
#   - LoanApplicationDeleteView   – DELETE /api/loans/<id>/
#
# Use DRF generics or viewsets:
#   from rest_framework import generics, viewsets
# -----------------------------------------------------------------------

from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import IsLoanProcessingTeam, IsOtpVerified
from asana_integration.services.asana import (
    AsanaProfileError,
    AsanaProfileService,
    get_client_asana_profile,
)

from django.contrib.auth import get_user_model

from loans.choices import ApplicationStatus
from loans.models import LoanApplication
from users.choices import UserRole
from users.models import ClientProfile
from users.services import apply_application_status_change, apply_loan_status_change
from notifications.choices import NotificationType
from notifications.services import create_notification, publish_stream_notification

class LoanStatusUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    loan_status = serializers.CharField(max_length=100)
    application_id = serializers.UUIDField(required=False, allow_null=True)
    task_gid = serializers.CharField(required=False, allow_blank=True)
    project_gid = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not any(
            [
                attrs.get("email"),
                attrs.get("application_id"),
                attrs.get("task_gid"),
            ]
        ):
            raise serializers.ValidationError(
                "Provide email, application_id, or task_gid to identify the "
                "application."
            )
        return attrs


class LoanApplicationSerializer(serializers.ModelSerializer):
    """Read-only representation of a client's loan application."""

    class Meta:
        model = LoanApplication
        fields = [
            "id",
            "asana_project_gid",
            "asana_project_name",
            "asana_task_gid",
            "asana_task_name",
            "amount",
            "status",
            "asana_status",
            "asana_status_history",
            "asana_created_at",
            "asana_synced_at",
            "is_primary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class LoanApplicationStatusUpdateSerializer(serializers.Serializer):
    loan_status = serializers.CharField(max_length=100)


def _client_application_queryset(user):
    try:
        profile = user.client_profile
    except ClientProfile.DoesNotExist:
        return LoanApplication.objects.none()
    return LoanApplication.objects.filter(client=profile)


def _applications_for_client_user(client_user):
    try:
        profile = client_user.client_profile
    except ClientProfile.DoesNotExist:
        return LoanApplication.objects.none()
    return LoanApplication.objects.filter(client=profile)


def _select_application(user, application_id=None):
    """Return the application to use for legacy single-status endpoints.

    Precedes the explicitly requested application, then the primary
    application, then the most recently updated application.
    """
    qs = _client_application_queryset(user)
    if application_id:
        return qs.filter(id=application_id).first()
    return qs.filter(is_primary=True).first() or qs.order_by("-updated_at").first()


class LoanApplicationListView(APIView):
    """
    GET /api/loans/applications/

    Client portal only: lists the authenticated client's loan applications.
    """

    permission_classes = [permissions.IsAuthenticated, IsOtpVerified]

    def get(self, request):
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "This endpoint is for client accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = _client_application_queryset(request.user).order_by("-created_at")
        serializer = LoanApplicationSerializer(qs, many=True)
        response = Response(serializer.data)
        response["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response["Pragma"] = "no-cache"
        return response


class LoanApplicationDetailView(APIView):
    """
    GET /api/loans/applications/<id>/

    Client portal only: returns one application owned by the client.
    """

    permission_classes = [permissions.IsAuthenticated, IsOtpVerified]

    def get(self, request, application_id):
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "This endpoint is for client accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        application = _client_application_queryset(request.user).filter(
            id=application_id
        ).first()
        if application is None:
            return Response(
                {"error": "Loan application not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = LoanApplicationSerializer(application)
        return Response(serializer.data)


class LoanApplicationStatusUpdateView(APIView):
    """
    PATCH /api/loans/applications/<id>/status/

    Loan-processing staff only: moves the matching Asana task to the target
    section and records the application-level transition.
    """

    permission_classes = [IsLoanProcessingTeam, IsOtpVerified]

    def patch(self, request, application_id):
        application = LoanApplication.objects.filter(id=application_id).first()
        if application is None:
            return Response(
                {"error": "Loan application not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = LoanApplicationStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        loan_status = serializer.validated_data["loan_status"]

        client_user = application.client.user

        related_applications = list(
            LoanApplication.objects.filter(
                asana_project_gid=application.asana_project_gid,
                asana_task_gid=application.asana_task_gid,
            ).select_related("client__user")
        )

        try:
            result = AsanaProfileService(
                project_gid=application.asana_project_gid
            ).move_task_to_status(
                email=client_user.email,
                loan_status=loan_status,
                task_gid=application.asana_task_gid,
                project_gid=application.asana_project_gid,
            )
        except ValueError as error:
            return Response({"error": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except AsanaProfileError as error:
            return Response({"error": str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        application_ids = [str(app.id) for app in related_applications]
        changed_any = False
        for app in related_applications:
            app, changed = apply_application_status_change(
                app,
                loan_status,
                actor=request.user,
                asana_event_at=None,
            )
            if changed:
                changed_any = True
                notification = create_notification(
                    recipient=app.client.user,
                    notification_type=NotificationType.LOAN_STATUS,
                    title="Loan status updated",
                    message=(
                        f"Your loan status has been updated to "
                        f"{loan_status.replace('_', ' ').title()}."
                    ),
                )
                publish_stream_notification(
                    app.client.user_id,
                    notification,
                    loan_status=loan_status,
                    application_id=str(app.id),
                )

        return Response(
            {
                "message": "Loan application status updated.",
                "application_id": str(application.id),
                "application_ids": application_ids,
                "changed": changed_any,
                **result,
            },
            status=status.HTTP_200_OK,
        )


class CurrentLoanStatusView(APIView):
    """
    GET /api/loans/current-status/

    Reads the current status directly from Asana.
    """

    permission_classes = [permissions.IsAuthenticated, IsOtpVerified]

    def get(self, request):
        if request.user.role != UserRole.CLIENT:
            return Response(
                {
                    "loan_status": None,
                    "status_history": [],
                    "message": "This endpoint is for client accounts.",
                }
            )

        application_id = request.query_params.get("application_id")
        application = _select_application(request.user, application_id)

        if application is not None:
            loan_status = application.asana_status or application.status
            history = [
                {"status": status, "changed_at": changed_at}
                for status, changed_at in sorted(
                    (application.asana_status_history or {}).items(),
                    key=lambda item: item[1],
                )
            ]
            response = Response(
                {
                    "loan_status": loan_status,
                    "status_history": history,
                    "application_id": str(application.id),
                }
            )
            response["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response["Pragma"] = "no-cache"
            return response

        # The locally recorded status is kept in sync by the Asana webhook and
        # the manual update endpoint, so it is authoritative and instant. Only
        # fall back to a live Asana lookup when nothing has been recorded yet.
        try:
            profile = request.user.client_profile
        except ClientProfile.DoesNotExist:
            profile = None

        loan_status = profile.loan_status if profile else None

        if not loan_status:
            try:
                asana_profile = get_client_asana_profile(request.user.email)
            except AsanaProfileError:
                return Response(
                    {
                        "error": "Loan status is temporarily unavailable."
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            if asana_profile:
                loan_status = asana_profile.get("loan_status")

        response = Response(
            {
                "loan_status": loan_status,
                "status_history": self._status_history(profile),
            }
        )
        response["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response["Pragma"] = "no-cache"
        return response

    @staticmethod
    def _status_history(profile):
        """Return the client's recorded status entries, oldest first."""
        if profile is None:
            return []

        history = profile.loan_status_history or {}

        return [
            {"status": status, "changed_at": changed_at}
            for status, changed_at in sorted(history.items(), key=lambda item: item[1])
        ]


class LoanStatusUpdateView(APIView):
    """
    PATCH /api/loans/status/

    Moves a client task to another Asana project section.
    Does not write to the local database.
    """

    permission_classes = [IsLoanProcessingTeam, IsOtpVerified]

    def patch(self, request):
        serializer = LoanStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = (serializer.validated_data.get("email") or "").strip().lower()
        loan_status = serializer.validated_data["loan_status"]
        application_id = serializer.validated_data.get("application_id")
        task_gid = serializer.validated_data.get("task_gid")
        project_gid = serializer.validated_data.get("project_gid")

        application = None
        client_user = None
        User = get_user_model()

        if application_id:
            application = LoanApplication.objects.filter(id=application_id).first()
            if application is not None:
                client_user = application.client.user
        elif task_gid:
            filters = {"asana_task_gid": task_gid}
            if project_gid:
                filters["asana_project_gid"] = project_gid
            application = LoanApplication.objects.filter(**filters).first()
            if application is not None:
                client_user = application.client.user
        elif email:
            try:
                client_user = User.objects.get(
                    email__iexact=email,
                    role=UserRole.CLIENT,
                    is_active=True,
                )
            except User.DoesNotExist:
                client_user = None

            if client_user is not None:
                apps = _applications_for_client_user(client_user)
                if apps.count() > 1:
                    return Response(
                        {
                            "error": (
                                "Multiple loan applications found for this client. "
                                "Specify application_id or task_gid."
                            ),
                            "applications": LoanApplicationSerializer(
                                apps, many=True
                            ).data,
                        },
                        status=status.HTTP_409_CONFLICT,
                    )
                if apps.count() == 1:
                    application = apps.first()
                    client_user = application.client.user

        if application is not None:
            try:
                result = AsanaProfileService(
                    project_gid=application.asana_project_gid
                ).move_task_to_status(
                    email=client_user.email,
                    loan_status=loan_status,
                    task_gid=application.asana_task_gid,
                    project_gid=application.asana_project_gid,
                )
            except ValueError as error:
                return Response(
                    {"error": str(error)}, status=status.HTTP_400_BAD_REQUEST
                )
            except AsanaProfileError as error:
                return Response(
                    {"error": str(error)}, status=status.HTTP_502_BAD_GATEWAY
                )

            application, changed = apply_application_status_change(
                application,
                loan_status,
                actor=request.user,
                asana_event_at=None,
            )

            if changed:
                notification = create_notification(
                    recipient=client_user,
                    notification_type=NotificationType.LOAN_STATUS,
                    title="Loan status updated",
                    message=(
                        f"Your loan status has been updated to "
                        f"{loan_status.replace('_', ' ').title()}."
                    ),
                )
                publish_stream_notification(
                    client_user.id,
                    notification,
                    loan_status=loan_status,
                    application_id=str(application.id),
                )

            return Response(
                {
                    "message": "Loan status updated in Asana.",
                    "application_id": str(application.id),
                    **result,
                },
                status=status.HTTP_200_OK,
            )

        # Legacy fallback: no application identified, update the client profile
        # directly (single-application behaviour).
        if not email or client_user is None:
            return Response(
                {"error": "No client or loan application found for this request."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            service = AsanaProfileService()
            result = service.move_task_to_status(
                email=email,
                loan_status=loan_status,
            )
        except ValueError as error:
            return Response(
                {"error": str(error)}, status=status.HTTP_400_BAD_REQUEST
            )
        except AsanaProfileError as error:
            return Response(
                {"error": str(error)}, status=status.HTTP_502_BAD_GATEWAY
            )

        _profile, changed = apply_loan_status_change(
            client_user,
            loan_status,
            actor=request.user,
        )

        if changed:
            notification = create_notification(
                recipient=client_user,
                notification_type=NotificationType.LOAN_STATUS,
                title="Loan status updated",
                message=(
                    f"Your loan status has been updated to "
                    f"{loan_status.replace('_', ' ').title()}."
                ),
            )
            publish_stream_notification(
                client_user.id,
                notification,
                loan_status=loan_status,
            )

        return Response(
            {
                "message": "Loan status updated in Asana.",
                **result,
            },
            status=status.HTTP_200_OK,
        )