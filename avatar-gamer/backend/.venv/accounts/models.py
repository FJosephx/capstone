from django.db import models
from django.contrib.auth.models import User

class Role(models.TextChoices):
    ADMIN    = "admin", "Admin"
    OPERATOR = "operator", "Operador"
    USER     = "user", "Usuario"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # RF03
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER)
    is_active = models.BooleanField(default=True)
    # Campos existentes
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"

class AuthEvent(models.Model):
    username   = models.CharField(max_length=150)
    user       = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    success    = models.BooleanField(default=False)
    ip         = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["username", "created_at"])]

class AccountLock(models.Model):
    username     = models.CharField(max_length=150, unique=True)
    fail_count   = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.username} locked_until={self.locked_until} fails={self.fail_count}"