from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from accounts.views import MeView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('accounts.urls')),
    path('api/v1/auth/token', TokenObtainPairView.as_view(), name='token_obtain_pair'), # JWT
    path('api/v1/auth/token/refresh', TokenRefreshView.as_view(), name='token_refresh'), # JWT
    path('api/v1/me', MeView.as_view(), name='me'), # JWT
]
