from django.db import models
from django.contrib.auth.models import User

class Role(models.TextChoices):
    ADMIN    = "admin", "Admin"
    OPERATOR = "operator", "Operador"
    USER     = "user", "Usuario"

class LinkRequestStatus(models.TextChoices):
    PENDING  = "pending", "Pendiente"
    APPROVED = "approved", "Aprobado"
    REJECTED = "rejected", "Rechazado"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # RF03
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER)
    is_active = models.BooleanField(default=True)
    # Campo para tracking de estado online
    is_online = models.BooleanField(default=False)
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

class LinkRequest(models.Model):
    operator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_link_requests')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_link_requests')
    status = models.CharField(max_length=16, choices=LinkRequestStatus.choices, default=LinkRequestStatus.PENDING)
    message = models.TextField(blank=True, null=True, help_text="Mensaje opcional del operador para el usuario")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = (('operator', 'user', 'status'),)
        indexes = [
            models.Index(fields=['operator', 'status']),
            models.Index(fields=['user', 'status']),
        ]
        
    def __str__(self):
        return f"{self.operator.username} -> {self.user.username} [{self.status}]"

class OperatorUserLink(models.Model):
    operator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='linked_users')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='linked_operators')
    created_at = models.DateTimeField(auto_now_add=True)
    link_request = models.OneToOneField(LinkRequest, on_delete=models.SET_NULL, null=True, blank=True, 
                                        help_text="Solicitud que originó este vínculo")
    
    class Meta:
        unique_together = (('operator', 'user'),)
        indexes = [models.Index(fields=['operator', 'user'])]
        
    def __str__(self):
        return f"{self.operator.username} -> {self.user.username}"