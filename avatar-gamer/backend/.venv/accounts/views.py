from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import (
    LoginSerializer, UserListItemSerializer, LinkCreateSerializer,
    LinkRequestSerializer, LinkRequestCreateSerializer, LinkRequestUpdateSerializer
)
from .auth_utils import is_locked, register_attempt, register_fail, register_success
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import permissions
from .permissions import IsAdmin, IsOperator, IsEndUser
from .models import OperatorUserLink, LinkRequest, LinkRequestStatus
from django.contrib.auth.models import User

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
        q = User.objects.filter(linked_operators__operator=request.user).distinct()
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
