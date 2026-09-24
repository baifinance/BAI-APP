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

from authentication.permissions import IsLoanProcessingTeam
from asana_integration.services.asana import (
    AsanaProfileError,
    AsanaProfileService,
    get_client_asana_profile,
)

from django.contrib.auth import get_user_model

from notifications.choices import NotificationType
from notifications.services import create_notification, publish_stream_notification

class LoanStatusUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    loan_status = serializers.CharField(max_length=100)


class CurrentLoanStatusView(APIView):
    """
    GET /api/loans/current-status/

    Reads the current status directly from Asana.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "client":
            return Response(
                {
                    "loan_status": None,
                    "message": "This endpoint is for client accounts.",
                }
            )

        try:
            profile = get_client_asana_profile(request.user.email)

        except AsanaProfileError:
            return Response(
                {
                    "error": "Loan status is temporarily unavailable."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "loan_status": (
                    profile.get("loan_status")
                    if profile
                    else None
                ),
            }
        )


class LoanStatusUpdateView(APIView):
    """
    PATCH /api/loans/status/

    Moves a client task to another Asana project section.
    Does not write to the local database.
    """

    permission_classes = [IsLoanProcessingTeam]

    def patch(self, request):
        serializer = LoanStatusUpdateSerializer(
            data=request.data
        )
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        loan_status = serializer.validated_data["loan_status"]

        try:
            service = AsanaProfileService()

            result = service.move_task_to_status(
                email=email,
                loan_status=loan_status,
            )

        except ValueError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except AsanaProfileError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        User = get_user_model()

        client_user = User.objects.filter(
            email__iexact=email,
            role="client",
            is_active=True
        ).first()

        if client_user:
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
                loan_status=loan_status
            )

        return Response(
            {
                "message": "Loan status updated in Asana.",
                **result,
            },
            status=status.HTTP_200_OK,
        )