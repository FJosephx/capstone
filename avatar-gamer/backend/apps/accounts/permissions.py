from rest_framework.permissions import BasePermission

def _role(request):
    if not request.user.is_authenticated:
        return None
    p = getattr(request.user, "profile", None)
    return getattr(p, "role", None) if p else None

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == "admin"

class IsOperator(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == "operator"

class IsEndUser(BasePermission):
    def has_permission(self, request, view):
        return _role(request) == "user"
