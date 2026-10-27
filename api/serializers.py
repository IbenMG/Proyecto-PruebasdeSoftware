import json

from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Actualizacion, Checkpoint, Usuario, Campania
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import PerfilUsuario

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'email', 'contra']


class CheckpointSerializer(serializers.ModelSerializer):
    alcanzado = serializers.SerializerMethodField()

    class Meta:
        model = Checkpoint
        fields = ['id', 'titulo', 'descripcion', 'monto_objetivo', 'alcanzado']
        read_only_fields = ['id', 'alcanzado']

    def validate_titulo(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El título del checkpoint es obligatorio.')
        return value

    def validate_descripcion(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('La descripción del checkpoint es obligatoria.')
        return value

    def validate_monto_objetivo(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'Los hitos deben estar dentro del rango (0, meta global].'
            )
        return value

    def get_alcanzado(self, obj):
        return obj.campania.progeso_financiero >= obj.monto_objetivo


class ActualizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Actualizacion
        fields = ['id', 'titulo', 'contenido', 'fecha_publicacion']
        read_only_fields = ['id', 'fecha_publicacion']

    def validate_titulo(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError(
                'El título debe tener al menos 3 caracteres.'
            )
        return value

    def validate_contenido(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                'El contenido de la actualización es obligatorio.'
            )
        return value


class CampaniaSerializer(serializers.ModelSerializer):
    puede_editar = serializers.SerializerMethodField()
    quitar_imagen = serializers.BooleanField(write_only=True, required=False, default=False)
    checkpoints = CheckpointSerializer(many=True, required=False)

    class Meta:
        model = Campania
        fields = [
            'id', 'titulo', 'descripcion', 'categoria', 'imagenes',
            'meta_financiera', 'fecha_limite', 'informacion_creador',
            'progeso_financiero', 'creador', 'puede_editar', 'quitar_imagen',
            'checkpoints',
        ]
        read_only_fields = ['progeso_financiero', 'creador']
        extra_kwargs = {'imagenes': {'required': False}}

    def to_internal_value(self, data):
        """Accept checkpoint arrays sent inside a multipart form as JSON."""
        raw_checkpoints = data.get('checkpoints') if hasattr(data, 'get') else None
        if isinstance(raw_checkpoints, str):
            try:
                parsed_checkpoints = json.loads(raw_checkpoints)
            except json.JSONDecodeError as error:
                raise serializers.ValidationError({
                    'checkpoints': 'El formato de los checkpoints no es válido.'
                }) from error
            if hasattr(data, 'keys') and hasattr(data, 'getlist'):
                data = {key: data.get(key) for key in data.keys()}
            else:
                data = data.copy()
            data['checkpoints'] = parsed_checkpoints
        return super().to_internal_value(data)

    def validate(self, attrs):
        if 'checkpoints' in attrs:
            checkpoints = attrs['checkpoints']
        elif self.instance is not None and 'meta_financiera' in attrs:
            checkpoints = self.instance.checkpoints.all()
        else:
            return attrs

        meta_global = attrs.get('meta_financiera')
        if meta_global is None and self.instance is not None:
            meta_global = self.instance.meta_financiera

        for checkpoint in checkpoints:
            monto = checkpoint.monto_objetivo if isinstance(checkpoint, Checkpoint) else checkpoint['monto_objetivo']
            if monto > meta_global:
                raise serializers.ValidationError({
                    'checkpoints': (
                        'Los hitos deben estar dentro del rango '
                        '(0, meta global].'
                    )
                })
        return attrs

    def create(self, validated_data):
        checkpoints = validated_data.pop('checkpoints', [])
        validated_data.pop('quitar_imagen', None)
        with transaction.atomic():
            campania = super().create(validated_data)
            Checkpoint.objects.bulk_create([
                Checkpoint(campania=campania, **checkpoint)
                for checkpoint in checkpoints
            ])
        return campania

    def update(self, instance, validated_data):
        checkpoints = validated_data.pop('checkpoints', serializers.empty)
        if validated_data.pop('quitar_imagen', False):
            validated_data['imagenes'] = ''
        with transaction.atomic():
            campania = super().update(instance, validated_data)
            if checkpoints is not serializers.empty:
                Checkpoint.objects.filter(campania=campania).delete()
                Checkpoint.objects.bulk_create([
                    Checkpoint(campania=campania, **checkpoint)
                    for checkpoint in checkpoints
                ])
        return campania

    def get_puede_editar(self, obj):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated
                    and obj.creador_id == request.user.pk)

    def validate_meta_financiera(self, value):
        if value <= 0:
            raise serializers.ValidationError('La meta de financiamiento debe ser mayor que cero.')
        return value

    def validate_fecha_limite(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('La fecha límite no puede ser anterior al día actual.')
        return value


class RegistroSerializer(serializers.Serializer):
    username = serializers.CharField(
        max_length=150,
        validators=[UnicodeUsernameValidator()],
    )
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    fecha_nacimiento = serializers.DateField()

    def validate_username(self, value):
        User = get_user_model()

        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                "Este nombre de usuario ya está en uso."
            )

        return value

    def validate_email(self, value):
        correo = value.strip().lower()
        User = get_user_model()

        if (
            User.objects.filter(email__iexact=correo).exists()
            or PerfilUsuario.objects.filter(correo__iexact=correo).exists()
        ):
            raise serializers.ValidationError(
                "Este correo electrónico ya está en uso."
            )

        return correo

    def validate_fecha_nacimiento(self, value):
        hoy = timezone.localdate()

        if value > hoy:
            raise serializers.ValidationError(
                "La fecha de nacimiento no puede ser futura."
            )

        edad = hoy.year - value.year - (
            (hoy.month, hoy.day) < (value.month, value.day)
        )

        if edad < 18:
            raise serializers.ValidationError(
                "Debes ser mayor de 18 años para registrarte"
            )

        return value

    def create(self, validated_data):
        User = get_user_model()
        fecha_nacimiento = validated_data.pop("fecha_nacimiento")

        try:
            with transaction.atomic():
                usuario = User.objects.create_user(**validated_data)

                PerfilUsuario.objects.create(
                    usuario=usuario,
                    correo=usuario.email,
                    fecha_nacimiento=fecha_nacimiento,
                )

        except IntegrityError:
            raise serializers.ValidationError(
                "No se pudo completar el registro: "
                "el usuario o el correo ya están en uso."
            )

        return usuario

class LoginCorreoSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        User = get_user_model()
        candidatos = list(User.objects.filter(email__iexact=attrs["email"])[:2])
        usuario = None
        if len(candidatos) == 1:
            usuario = authenticate(
                request=self.context.get("request"),
                username=candidatos[0].username,
                password=attrs["password"],
            )
        if usuario is None or not usuario.is_active:
            raise AuthenticationFailed("Correo o contraseña incorrectos")

        refresh = RefreshToken.for_user(usuario)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}
