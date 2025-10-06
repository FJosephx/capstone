from django.contrib import admin
from .models import AuthEvent, AccountLock, Profile

admin.site.register(AuthEvent)
admin.site.register(AccountLock)
admin.site.register(Profile)