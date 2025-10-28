from datetime import timedelta
from django.utils import timezone
from .models import AccountLock, AuthEvent
from django.contrib.auth.models import User

MAX_FAILS = 5
LOCK_MINUTES = 5

def client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    return (xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR"))

def is_locked(username: str):
    lock = AccountLock.objects.filter(username=username).first()
    if not lock or not lock.locked_until:
        return False, None
    now = timezone.now()
    if lock.locked_until > now:
        return True, (lock.locked_until - now)
    return False, None

def register_attempt(request, username: str, success: bool, user: User | None):
    AuthEvent.objects.create(
        username=username, user=user, success=success,
        ip=client_ip(request), user_agent=request.META.get("HTTP_USER_AGENT","")
    )

def register_fail(username: str):
    now = timezone.now()
    lock, _ = AccountLock.objects.get_or_create(username=username)
    lock.fail_count += 1
    if lock.fail_count >= MAX_FAILS:
        lock.locked_until = now + timedelta(minutes=LOCK_MINUTES)
        # Don't reset fail_count to keep track of failed attempts during lockout
        # for escalating lockout times in the future if needed
    lock.save()
    return lock.locked_until

def register_success(username: str):
    AccountLock.objects.filter(username=username).delete()
