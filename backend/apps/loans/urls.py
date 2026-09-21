from django.urls import path

from loans.views import (
    CurrentLoanStatusView,
    LoanStatusUpdateView
)

urlpatterns = [
    path(
        "current-status/",
        CurrentLoanStatusView.as_view(),
        name="current-loan-status"
    ),
    path(
        "status/",
        LoanStatusUpdateView.as_view(),
        name="loan-status-update"
    )
]

