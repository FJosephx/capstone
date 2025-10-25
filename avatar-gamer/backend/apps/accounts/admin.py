from django.contrib import admin
from .models import AuthEvent, AccountLock, Profile, OperatorUserLink, UserConsent

admin.site.register(AuthEvent)
admin.site.register(AccountLock)
admin.site.register(Profile)
admin.site.register(OperatorUserLink)
admin.site.register(UserConsent)
