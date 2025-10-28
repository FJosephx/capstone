from django.urls import path
from .views import (
    LoginView, AdminPing, OperatorPing, LinkUserView, UnlinkUserView, LinkedUsersView,
    LinkRequestCreateView, LinkRequestOperatorListView, LinkRequestUserListView,
    LinkRequestDetailView, LinkRequestResponseView, LinkedOperatorsView, OperatorDetailView,
    AIAssistantView, AdminUserListCreateView, AdminUserDetailView, AdminMetricsView, UserConsentView
)

urlpatterns = [
    # Rutas existentes
    path('login', LoginView.as_view(), name='login'),  # POST /api/v1/login
    path('ping/admin', AdminPing.as_view()),
    path('ping/operator', OperatorPing.as_view()),
    path('users/link', LinkUserView.as_view()),  # POST /api/v1/users/link
    path('users/unlink/<int:user_id>', UnlinkUserView.as_view()),  # DELETE /api/v1/users/unlink/<user_id>
    path('users/linked', LinkedUsersView.as_view()),  # GET /api/v1/users/linked
    
    # Nuevas rutas para el sistema de solicitudes de vinculación
    path('link-requests', LinkRequestCreateView.as_view()),  # POST /api/v1/link-requests
    path('link-requests/sent', LinkRequestOperatorListView.as_view()),  # GET /api/v1/link-requests/sent
    path('link-requests/received', LinkRequestUserListView.as_view()),  # GET /api/v1/link-requests/received
    path('link-requests/<int:pk>', LinkRequestDetailView.as_view()),  # GET /api/v1/link-requests/<id>
    path('link-requests/<int:pk>/respond', LinkRequestResponseView.as_view()),  # PATCH /api/v1/link-requests/<id>/respond
    
    # Nuevas rutas para operadores vinculados (para usuarios)
    path('users/operators', LinkedOperatorsView.as_view()),  # GET /api/v1/users/operators
    path('users/operators/<int:operator_id>', OperatorDetailView.as_view()),  # GET /api/v1/users/operators/<id>
    path('admin/users', AdminUserListCreateView.as_view()),  # GET/POST /api/v1/admin/users
    path('admin/users/<int:user_id>', AdminUserDetailView.as_view()),  # PUT/PATCH/DELETE /api/v1/admin/users/<id>
    path('admin/metrics', AdminMetricsView.as_view()),  # GET /api/v1/admin/metrics
    path('consents', UserConsentView.as_view()),  # GET/POST /api/v1/consents
    
    # Ruta para el asistente IA
    path('ai/chat', AIAssistantView.as_view()),  # POST /api/v1/ai/chat
]
