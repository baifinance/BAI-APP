from django.urls import path

from users.views import (
    ProfileView,
    MfaEnableView,
    MfaDisableView,
    MfaEnableSendView,
    UserListView,
)
from users.active_views import ActiveUserListView

urlpatterns = [
    path("", UserListView.as_view(), name="user-list"),
    path("active/", ActiveUserListView.as_view(), name="active-user-list"),
    path("profile/", ProfileView.as_view(), name="user-profile"),
    path("profile/mfa/enable/send/", MfaEnableSendView.as_view(), name="user-mfa-enable-send"),
    path("profile/mfa/enable/verify/", MfaEnableView.as_view(), name="user-mfa-enable-verify"),
    path("profile/mfa/disable/", MfaDisableView.as_view(), name="user-mfa-disable"),
]