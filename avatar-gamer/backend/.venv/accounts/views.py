from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import LoginSerializer
from .auth_utils import is_locked, register_attempt, register_fail, register_success
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import permissions
from .permissions import IsAdmin, IsOperator

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
        # Get username before parent validation to handle failed auth
        username = attrs.get('username', '')
        request = self.context.get("request")
        
        # First check if the account is already locked
        locked, remaining = is_locked(username)
        if locked:
            mins = int(remaining.total_seconds() // 60) + 1
            raise serializers.ValidationError({"detail": f"Cuenta bloqueada. Intenta en ~{mins} min."})
        
        try:
            # Try regular token validation
            data = super().validate(attrs)
            # Login success: register success and reset lock counter
            register_success(username)
            register_attempt(request, username, True, self.user)
            return data
        except Exception as e:
            # Login failed: register attempt and failure
            register_attempt(request, username, False, None)
            until = register_fail(username)
            
            # Check if account should be locked after this failure
            if until:
                raise serializers.ValidationError({"detail":"Cuenta bloqueada por múltiples intentos fallidos."})
            # Re-raise the original validation error
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