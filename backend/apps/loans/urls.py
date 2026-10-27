from django.urls import path

from loans.views import (
    CurrentLoanStatusView,
    LoanApplicationDetailView,
    LoanApplicationListView,
    LoanApplicationStatusUpdateView,
    LoanStatusUpdateView,
)

urlpatterns = [
    path(
        "current-status/",
        CurrentLoanStatusView.as_view(),
        name="current-loan-status",
    ),
    path(
        "status/",
        LoanStatusUpdateView.as_view(),
        name="loan-status-update",
    ),
    path(
        "applications/",
        LoanApplicationListView.as_view(),
        name="loan-application-list",
    ),
    path(
        "applications/<uuid:application_id>/",
        LoanApplicationDetailView.as_view(),
        name="loan-application-detail",
    ),
    path(
        "applications/<uuid:application_id>/status/",
        LoanApplicationStatusUpdateView.as_view(),
        name="loan-application-status-update",
    ),
]
