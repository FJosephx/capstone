from django.contrib.auth import authenticate
from rest_framework import serializers
from .auth_utils import is_locked, register_attempt, register_fail, register_success
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from .models import OperatorUserLink

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        user = authenticate(username=attrs['username'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError("Credenciales inválidas")
        attrs['user'] = user
        return attrs

class SafeTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        request = self.context.get("request")
        username = attrs.get(self.username_field)

        locked, remaining = is_locked(username)
        if locked:
            mins = int(remaining.total_seconds() // 60) + 1
            raise serializers.ValidationError({"detail": f"Cuenta bloqueada. Intenta en ~{mins} min."})

        user = authenticate(request=request, username=username, password=attrs.get("password"))
        if not user:
            register_attempt(request, username, False, None)
            until = register_fail(username)
            if until:
                raise serializers.ValidationError({"detail": "Cuenta bloqueada por múltiples intentos fallidos."})
            raise serializers.ValidationError({"detail": "Credenciales inválidas"})

        register_success(username)
        register_attempt(request, username, True, user)

        data = super().validate(attrs)
        data["user"] = {
            "id": user.id, "username": user.username, "email": user.email,
            "first_name": user.first_name, "last_name": user.last_name
        }
        return data
    
class UserListItemSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'email', 'role']
    def get_role(self, obj):
        p = getattr(obj, 'profile', None)
        return getattr(p, 'role', None)
    
class LinkCreateSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    def validate(self, attrs):
        request = self.context["request"]
        operator = request.user
        
        op_role = getattr(getattr(operator, "profile", None), "role", None)
        
        if op_role != "operator":
            raise serializers.ValidationError({"detail": "Solo operadores pueden crear enlaces."})
        try:
            target = User.objects.get(id=attrs['user_id'])
        except User.DoesNotExist:
            raise serializers.ValidationError({'user_id':'Usuario destino no existe'})
        
        tgt_role = getattr(getattr(target, 'profile', None), 'role', None)
        
        if tgt_role not in ('user', None):
            raise serializers.ValidationError('Solo se vinculan usuarios finales')
        if OperatorUserLink.objects.filter(operator=operator, user=target).exists():
            raise serializers.ValidationError({'user_id':'Ya existe el vínculo'})
        
        attrs['target'] = target
        return attrs
    
    def create(self, validated_data):
        operator = self.context["request"].user
        return OperatorUserLink.objects.create(operator=operator, user=validated_data['target'])