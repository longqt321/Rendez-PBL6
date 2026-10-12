from types import SimpleNamespace

from django.contrib.admin import AdminSite

from apps.accounts.admin import EmailUserAdmin
from apps.accounts.models import User


def test_staff_cannot_escalate_roles_in_user_admin():
    admin = EmailUserAdmin(User, AdminSite())
    request = SimpleNamespace(user=SimpleNamespace(is_superuser=False))
    for permission in (
        admin.has_add_permission,
        admin.has_change_permission,
        admin.has_delete_permission,
    ):
        assert not permission(request)
        request.user.is_superuser = True
        assert permission(request)
        request.user.is_superuser = False
    assert "is_superuser" in admin.get_readonly_fields(request)
