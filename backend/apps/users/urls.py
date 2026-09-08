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

from users.views import ProfileView

urlpatterns = [
    path("profile/", ProfileView.as_view(), name="user-profile"),
]