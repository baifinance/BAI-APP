# users/urls.py
# -----------------------------------------------------------------------
# Wire up your user-related API endpoints here.
#
# Example:
#   urlpatterns = [
#       path("", views.UserListView.as_view(), name="user-list"),
#       path("<int:pk>/", views.UserDetailView.as_view(), name="user-detail"),
#   ]
# -----------------------------------------------------------------------

from django.urls import path

from users.views import (
    ProfileView,
    MfaEnableView,
    MfaDisableView,
    MfaEnableSendView
)

urlpatterns = [
    path("profile/", ProfileView.as_view(), name="user-profile"),
    path("profile/mfa/enable/send/", MfaEnableSendView.as_view(), name="user-mfa-enable-send"),
    path("profile/mfa/enable/verify/", MfaEnableView.as_view(), name="user-mfa-enable-verify"),
    path("profile/mfa/disable/", MfaDisableView.as_view(), name="user-mfa-disable")
]