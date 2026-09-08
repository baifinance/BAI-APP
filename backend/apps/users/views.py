# users/views.py
# -----------------------------------------------------------------------
# Define your user-related API views here.
#
# Examples:
#   - UserListView          – GET  /api/users/
#   - UserDetailView        – GET  /api/users/<id>/
#   - UserCreateView        – POST /api/users/
#   - UserUpdateView        – PUT  /api/users/<id>/
#   - UserDeleteView        – DELETE /api/users/<id>/
#
# Use DRF generics or viewsets:
#   from rest_framework import generics, viewsets
# -----------------------------------------------------------------------

from rest_framework import generics, permissions
from rest_framework.response import Response

from users.serializers import ProfileSerializer

class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/users/profile/  → return current user's profile
    PATCH /api/users/profile/ → update first_name / last_name
    """
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    