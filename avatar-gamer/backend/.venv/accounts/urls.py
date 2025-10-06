from django.urls import path
from .views import LoginView, AdminPing, OperatorPing

urlpatterns = [
    path('login', LoginView.as_view(), name='login'),  # POST /api/v1/login
    path('ping/admin', AdminPing.as_view()),
    path('ping/operator', OperatorPing.as_view()),
]
