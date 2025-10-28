from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from apps.accounts.views import MeView, SafeTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.accounts.urls')),
    path('api/v1/auth/token', SafeTokenObtainPairView.as_view(), name='token_obtain_pair'), # JWT
    path('api/v1/auth/token/refresh', TokenRefreshView.as_view(), name='token_refresh'), # JWT
    path('api/v1/me', MeView.as_view(), name='me'), # JWT
]
