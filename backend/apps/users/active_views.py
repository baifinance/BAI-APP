from rest_framework import generics, permissions

from authentication.permissions import IsLoanProcessingTeam
from users.models import User
from users.pagination import UserListPagination
from users.serializers import ActiveUserSerializer


class ActiveUserListView(generics.ListAPIView):
    """GET /api/users/active/ -> active users and their assigned roles."""

    serializer_class = ActiveUserSerializer
    permission_classes = [IsLoanProcessingTeam]
    pagination_class = UserListPagination

    def get_queryset(self):
        return User.objects.filter(is_active=True).order_by(
            "first_name", "last_name", "email"
        )
