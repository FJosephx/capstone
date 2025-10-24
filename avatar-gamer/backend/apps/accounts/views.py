from datetime import timedelta

from django.shortcuts import render, get_object_or_404
from django.db import models
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import (
    LoginSerializer, UserListItemSerializer, LinkCreateSerializer,
    LinkRequestSerializer, LinkRequestCreateSerializer, LinkRequestUpdateSerializer,
    AdminUserSerializer
)
from .auth_utils import is_locked, register_attempt, register_fail, register_success
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import permissions
from .permissions import IsAdmin, IsOperator, IsEndUser
from .models import (
    OperatorUserLink,
    LinkRequest,
    LinkRequestStatus,
    Profile,
    AuthEvent,
    AccountLock,
)
from django.contrib.auth.models import User
from apps.chat.models import ChatMessage
from .ai_service import send_message_to_ai, AIServiceError

# Vista para probar la api de login
class LoginView(APIView):
    authentication_classes = []              # sin JWT aún
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.validated_data['user']
        return Response({
            "ok": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        }, status=status.HTTP_200_OK)

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        u = request.user
        role = getattr(getattr(u, "profile", None), "role", None)
        return Response({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "role": role,
        })
        
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        request = self.context.get("request")
        username = attrs['username']

        locked, remaining = is_locked(username)
        if locked:
            mins = int(remaining.total_seconds() // 60) + 1
            raise serializers.ValidationError({"detail": f"Cuenta bloqueada. Intenta en ~{mins} min."})

        user = authenticate(request=request, username=username, password=attrs['password'])
        if not user:
            register_attempt(request, username, False, None)
            until = register_fail(username)
            if until:
                raise serializers.ValidationError({"detail":"Cuenta bloqueada por múltiples intentos fallidos."})
            raise serializers.ValidationError({"detail":"Credenciales inválidas"})

        register_success(username)
        register_attempt(request, username, True, user)
        attrs['user'] = user
        return attrs

class SafeTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        
        username = attrs.get('username', '')
        request = self.context.get("request")
        
        
        locked, remaining = is_locked(username)
        if locked:
            mins = int(remaining.total_seconds() // 60) + 1
            raise serializers.ValidationError({"detail": f"Cuenta bloqueada. Intenta en ~{mins} min."})
        
        try:

            data = super().validate(attrs)
            
            register_success(username)
            register_attempt(request, username, True, self.user)
            return data
        except Exception as e:
            
            register_attempt(request, username, False, None)
            until = register_fail(username)
            
            
            if until:
                raise serializers.ValidationError({"detail":"Cuenta bloqueada por múltiples intentos fallidos."})
            
            raise e

class SafeTokenObtainPairView(TokenObtainPairView):
    serializer_class = SafeTokenObtainPairSerializer

class AdminPing(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    def get(self, request):
        return Response({"ok": True, "who": "admin"})

class OperatorPing(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperator]
    def get(self, request):
        return Response({"ok": True, "who": "operator"})
    
class LinkedUsersView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperator]
    def get (self, request):
        q = User.objects.filter(linked_operators__operator=request.user).select_related('profile').distinct()
        search = request.query_params.get('search')
        
        if search:
            q = q.filter(username__icontains=search) | q.filter(first_name__icontains=search) | q.filter(last_name__icontains=search)
        data = UserListItemSerializer(q, many=True).data
        return Response({"count": len(data), "results": data})
    
class LinkUserView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperator]
    def post(self, request):
        s = LinkCreateSerializer(data=request.data, context={'request': request})
        s.is_valid(raise_exception=True)
        link = s.save()
        return Response({"ok": True, "link_id": link.id}, status=status.HTTP_201_CREATED)
    
class UnlinkUserView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOperator]
    def delete(self, request, user_id:int):
        OperatorUserLink.objects.filter(operator=request.user, user_id=user_id).delete()
        return Response(status=204)

# Vistas para la gestión de solicitudes de vinculación

class LinkRequestCreateView(APIView):
    """Vista para crear solicitudes de vinculación entre operadores y usuarios"""
    permission_classes = [permissions.IsAuthenticated, IsOperator]
    
    def post(self, request):
        serializer = LinkRequestCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        link_request = serializer.save()
        
        return Response({
            "ok": True, 
            "request_id": link_request.id,
            "status": link_request.status
        }, status=status.HTTP_201_CREATED)

class LinkRequestOperatorListView(APIView):
    """Vista para que los operadores vean las solicitudes de vinculación que han enviado"""
    permission_classes = [permissions.IsAuthenticated, IsOperator]
    
    def get(self, request):
        # Filtrar solicitudes enviadas por este operador
        link_requests = LinkRequest.objects.filter(operator=request.user)
        
        # Filtrar por estado si se especifica
        request_status = request.query_params.get('status')
        if request_status:
            link_requests = link_requests.filter(status=request_status)
        
        # Ordenar por fecha de creación (más reciente primero)
        link_requests = link_requests.order_by('-created_at')
        
        serializer = LinkRequestSerializer(link_requests, many=True)
        return Response({
            "count": len(serializer.data),
            "results": serializer.data
        })

class LinkRequestUserListView(APIView):
    """Vista para que los usuarios vean las solicitudes de vinculación recibidas"""
    permission_classes = [permissions.IsAuthenticated, IsEndUser]
    
    def get(self, request):
        # Filtrar solicitudes recibidas por este usuario
        link_requests = LinkRequest.objects.filter(user=request.user)
        
        # Filtrar por estado si se especifica
        request_status = request.query_params.get('status')
        if request_status:
            link_requests = link_requests.filter(status=request_status)
        
        # Ordenar por fecha de creación (más reciente primero)
        link_requests = link_requests.order_by('-created_at')
        
        serializer = LinkRequestSerializer(link_requests, many=True)
        return Response({
            "count": len(serializer.data),
            "results": serializer.data
        })

class LinkRequestDetailView(APIView):
    """Vista para obtener, actualizar o eliminar una solicitud de vinculación específica"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self, pk):
        # Solo permitir acceso a solicitudes donde el usuario es parte (operador o usuario)
        obj = get_object_or_404(LinkRequest, pk=pk)
        
        if obj.operator != self.request.user and obj.user != self.request.user:
            self.permission_denied(self.request)
            
        return obj
    
    def get(self, request, pk):
        link_request = self.get_object(pk)
        serializer = LinkRequestSerializer(link_request)
        return Response(serializer.data)
    
class LinkRequestResponseView(APIView):
    """Vista para que los usuarios respondan (aprobar/rechazar) a una solicitud de vinculación"""
    permission_classes = [permissions.IsAuthenticated, IsEndUser]
    
    def patch(self, request, pk):
        serializer = LinkRequestUpdateSerializer(
            data=request.data, 
            context={'request': request, 'link_request_id': pk}
        )
        serializer.is_valid(raise_exception=True)
        
        link_request = serializer.validated_data['link_request']
        updated_request = serializer.update(link_request, serializer.validated_data)
        
        response_data = LinkRequestSerializer(updated_request).data
        
        # Agregar información sobre el vínculo creado si se aprobó
        if updated_request.status == LinkRequestStatus.APPROVED:
            try:
                link = OperatorUserLink.objects.get(link_request=updated_request)
                response_data['link_id'] = link.id
            except OperatorUserLink.DoesNotExist:
                pass
        
        return Response(response_data)

class LinkedOperatorsView(APIView):
    """Vista para que los usuarios obtengan la lista de operadores vinculados a ellos"""
    permission_classes = [permissions.IsAuthenticated, IsEndUser]
    
    def get(self, request):
        # Filtrar operadores vinculados al usuario actual
        linked_operators = User.objects.filter(
            linked_users__user=request.user
        ).select_related('profile').distinct()
        
        # Buscar por nombre/username si se proporciona un parámetro de búsqueda
        search = request.query_params.get('search')
        if search:
            linked_operators = linked_operators.filter(
                models.Q(username__icontains=search) | 
                models.Q(first_name__icontains=search) | 
                models.Q(last_name__icontains=search)
            )
        
        serializer = UserListItemSerializer(linked_operators, many=True)
        return Response({
            "count": len(serializer.data),
            "results": serializer.data
        })

class OperatorDetailView(APIView):
    """Vista para obtener detalles de un operador específico"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, operator_id):
        # Obtener el operador solicitado
        try:
            operator = User.objects.select_related('profile').get(id=operator_id)
            
            # Verificar que el operador realmente tenga el rol de operador
            profile = getattr(operator, 'profile', None)
            if not profile or getattr(profile, 'role', None) != 'operator':
                return Response(
                    {"detail": "El usuario especificado no es un operador"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            # Para usuarios normales, verificar que estén vinculados con este operador
            if hasattr(request.user, 'profile') and request.user.profile.role == 'user':
                link_exists = OperatorUserLink.objects.filter(
                    operator=operator,
                    user=request.user
                ).exists()
                
                if not link_exists:
                    return Response(
                        {"detail": "No estás vinculado con este operador"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            serializer = UserListItemSerializer(operator)
            return Response(serializer.data)
            
        except User.DoesNotExist:
            return Response(
                {"detail": "Operador no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )


class AdminUserListCreateView(APIView):
    """Listado y creación de usuarios para administradores."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.all().select_related('profile').order_by('id')

        role = request.query_params.get('role')
        if role:
            users = users.filter(profile__role=role)

        user_id = request.query_params.get('id')
        if user_id:
            try:
                users = users.filter(id=int(user_id))
            except (TypeError, ValueError):
                return Response(
                    {"detail": "El parámetro 'id' debe ser numérico."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        search = request.query_params.get('search')
        if search:
            users = users.filter(
                models.Q(username__icontains=search) |
                models.Q(email__icontains=search) |
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search)
            )

        serializer = AdminUserSerializer(users, many=True)
        return Response({
            "count": users.count(),
            "results": serializer.data
        })

    def post(self, request):
        serializer = AdminUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response_serializer = AdminUserSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class AdminMetricsView(APIView):
    """Panel de métricas para administradores."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)

        total_users = User.objects.count()
        active_users = Profile.objects.filter(is_active=True).count()
        inactive_users = Profile.objects.filter(is_active=False).count()
        dau = (
            AuthEvent.objects.filter(
                success=True,
                created_at__gte=last_24h,
                user__isnull=False,
            )
            .values("user_id")
            .distinct()
            .count()
        )
        wau = (
            AuthEvent.objects.filter(
                success=True,
                created_at__gte=last_7d,
                user__isnull=False,
            )
            .values("user_id")
            .distinct()
            .count()
        )
        mau = (
            AuthEvent.objects.filter(
                success=True,
                created_at__gte=last_30d,
                user__isnull=False,
            )
            .values("user_id")
            .distinct()
            .count()
        )
        new_users_last_7_days = User.objects.filter(date_joined__gte=last_7d).count()
        total_sessions_last_7_days = AuthEvent.objects.filter(
            success=True, created_at__gte=last_7d
        ).count()

        link_requests_last_30 = LinkRequest.objects.filter(created_at__gte=last_30d)
        total_link_requests_last_30 = link_requests_last_30.count()
        approved_link_requests_last_30 = link_requests_last_30.filter(
            status=LinkRequestStatus.APPROVED
        ).count()
        pending_link_requests = LinkRequest.objects.filter(
            status=LinkRequestStatus.PENDING
        ).count()
        active_links_total = OperatorUserLink.objects.count()
        new_links_last_30 = OperatorUserLink.objects.filter(
            created_at__gte=last_30d
        ).count()
        messages_last_7 = ChatMessage.objects.filter(created_at__gte=last_7d)
        messages_last_7_days = messages_last_7.count()
        conversations_last_7_days = (
            messages_last_7.values("conversation_id").distinct().count()
        )

        auth_events_last_7 = AuthEvent.objects.filter(created_at__gte=last_7d)
        total_auth_events = auth_events_last_7.count()
        failed_auth_events = auth_events_last_7.filter(success=False).count()
        success_auth_events = auth_events_last_7.filter(success=True).count()
        distinct_users_last_7 = (
            auth_events_last_7.filter(user__isnull=False)
            .values("user_id")
            .distinct()
            .count()
        )
        failure_rate = (
            round(failed_auth_events / total_auth_events, 4)
            if total_auth_events
            else 0.0
        )
        success_rate = (
            round(success_auth_events / total_auth_events, 4)
            if total_auth_events
            else 0.0
        )
        avg_attempts_per_user = (
            round(total_auth_events / distinct_users_last_7, 2)
            if distinct_users_last_7
            else 0.0
        )
        locked_accounts = AccountLock.objects.filter(locked_until__gt=now).count()

        data = {
            "userActivity": {
                "totalUsers": total_users,
                "activeUsers": active_users,
                "inactiveUsers": inactive_users,
                "dailyActiveUsers": dau,
                "weeklyActiveUsers": wau,
                "monthlyActiveUsers": mau,
                "newUsersLast7Days": new_users_last_7_days,
                "sessionsLast7Days": total_sessions_last_7_days,
            },
            "userInteraction": {
                "linkRequestsLast30Days": total_link_requests_last_30,
                "approvedLinkRequestsLast30Days": approved_link_requests_last_30,
                "pendingLinkRequests": pending_link_requests,
                "activeLinks": active_links_total,
                "newLinksLast30Days": new_links_last_30,
                "messagesLast7Days": messages_last_7_days,
                "conversationsLast7Days": conversations_last_7_days,
            },
            "resourcePerformance": {
                "authSuccessRate": success_rate,
                "authFailureRate": failure_rate,
                "authAttemptsLast7Days": total_auth_events,
                "avgAuthAttemptsPerUser": avg_attempts_per_user,
                "lockedAccounts": locked_accounts,
            },
        }

        return Response(data)


class AdminUserDetailView(APIView):
    """Detalle, actualización y eliminación de usuarios para administradores."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_user(self, user_id):
        return get_object_or_404(User.objects.select_related('profile'), id=user_id)

    def put(self, request, user_id):
        user = self.get_user(user_id)
        serializer = AdminUserSerializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminUserSerializer(user).data)

    def patch(self, request, user_id):
        user = self.get_user(user_id)
        serializer = AdminUserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminUserSerializer(user).data)

    def delete(self, request, user_id):
        user = self.get_user(user_id)

        if user.id == request.user.id:
            return Response(
                {"detail": "No puedes eliminar tu propia cuenta mientras estás autenticado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Vista para interactuar con la IA
class AIAssistantView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Endpoint para enviar mensajes a la IA y recibir respuestas
        
        Payload:
        {
            "text": "Mensaje para la IA",
            "context": "Contexto opcional para personalizar la IA",
            "response_length": "normal", // very_brief, brief, normal, complete, very_complete
            "character_name": "sinclair", // Nombre del personaje/asistente
            "language": "es" // Idioma (es, en)
        }
        """
        try:
            # Validar datos de entrada
            text = request.data.get('text')
            if not text:
                return Response({"error": "El campo 'text' es requerido"}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            # Parámetros opcionales
            context = request.data.get('context')
            response_length = request.data.get('response_length', 'normal')
            character_name = request.data.get('character_name', 'sinclair')
            language = request.data.get('language', 'es')
            
            # Enviar mensaje a la IA
            ai_response = send_message_to_ai(
                text=text,
                context=context,
                response_length=response_length,
                character_name=character_name,
                language=language
            )
            
            return Response(ai_response, status=status.HTTP_200_OK)
            
        except AIServiceError as e:
            return Response(
                {"error": str(e)},
                status=e.status_code if e.status_code else status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {"error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
