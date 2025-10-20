from django.contrib.auth import authenticate
from rest_framework import serializers
from .auth_utils import is_locked, register_attempt, register_fail, register_success
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from .models import OperatorUserLink, LinkRequest, LinkRequestStatus

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
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_online']

    def get_role(self, obj):
        p = getattr(obj, 'profile', None)
        return getattr(p, 'role', None)

    def get_is_online(self, obj):
        p = getattr(obj, 'profile', None)
        return bool(getattr(p, 'is_online', False))

class LinkRequestSerializer(serializers.ModelSerializer):
    operator_username = serializers.SerializerMethodField()
    user_username = serializers.SerializerMethodField()
    
    class Meta:
        model = LinkRequest
        fields = ['id', 'operator', 'user', 'operator_username', 'user_username', 'status', 'message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'operator', 'user', 'created_at', 'updated_at']
    
    def get_operator_username(self, obj):
        return obj.operator.username if obj.operator else None
    
    def get_user_username(self, obj):
        return obj.user.username if obj.user else None

class LinkRequestCreateSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    message = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        request = self.context["request"]
        operator = request.user
        
        op_role = getattr(getattr(operator, "profile", None), "role", None)
        
        if op_role != "operator":
            raise serializers.ValidationError({"detail": "Solo operadores pueden crear solicitudes de vinculación."})
        
        try:
            target = User.objects.get(id=attrs['user_id'])
        except User.DoesNotExist:
            raise serializers.ValidationError({'user_id': 'Usuario destino no existe'})
        
        tgt_role = getattr(getattr(target, 'profile', None), 'role', None)
        
        if tgt_role not in ('user', None):
            raise serializers.ValidationError({'user_id': 'Solo se pueden vincular usuarios finales'})
        
        # Verificar si ya existe un vínculo
        if OperatorUserLink.objects.filter(operator=operator, user=target).exists():
            raise serializers.ValidationError({'user_id': 'Ya existe un vínculo con este usuario'})
        
        # Verificar si ya hay una solicitud pendiente
        if LinkRequest.objects.filter(
            operator=operator, 
            user=target, 
            status=LinkRequestStatus.PENDING
        ).exists():
            raise serializers.ValidationError({'user_id': 'Ya existe una solicitud pendiente para este usuario'})
        
        attrs['target'] = target
        return attrs
    
    def create(self, validated_data):
        operator = self.context["request"].user
        target = validated_data['target']
        message = validated_data.get('message', '')
        
        return LinkRequest.objects.create(
            operator=operator,
            user=target,
            status=LinkRequestStatus.PENDING,
            message=message
        )

class LinkRequestUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    
    def validate(self, attrs):
        request = self.context.get('request')
        link_request_id = self.context.get('link_request_id')
        
        if not request.user:
            raise serializers.ValidationError({'detail': 'Usuario no autenticado'})
        
        try:
            link_request = LinkRequest.objects.get(id=link_request_id, user=request.user)
        except LinkRequest.DoesNotExist:
            raise serializers.ValidationError({'detail': 'Solicitud no encontrada o no autorizada'})
        
        if link_request.status != LinkRequestStatus.PENDING:
            raise serializers.ValidationError({'detail': 'Esta solicitud ya ha sido procesada'})
        
        attrs['link_request'] = link_request
        return attrs
    
    def update(self, instance, validated_data):
        status = validated_data.get('status')
        instance.status = status
        instance.save()
        
        # Si se aprueba, crear el vínculo
        if status == LinkRequestStatus.APPROVED:
            OperatorUserLink.objects.create(
                operator=instance.operator,
                user=instance.user,
                link_request=instance
            )
        
        return instance
    
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
