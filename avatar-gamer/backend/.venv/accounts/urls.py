from django.urls import path
from .views import LoginView, AdminPing, OperatorPing, LinkUserView, UnlinkUserView, LinkedUsersView

urlpatterns = [
    path('login', LoginView.as_view(), name='login'),  # POST /api/v1/login
    path('ping/admin', AdminPing.as_view()),
    path('ping/operator', OperatorPing.as_view()),
    path('users/link', LinkUserView.as_view()),  # POST /api/v1/users/link
    path('users/unlink/<int:user_id>', UnlinkUserView.as_view()),  # DELETE /api/v1/users/unlink/<user_id>
    path('users/linked', LinkedUsersView.as_view()),  # GET /api/v1/users/linked
]
