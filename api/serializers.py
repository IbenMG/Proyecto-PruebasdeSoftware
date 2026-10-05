from rest_framework import serializers
from .models import Usuario, Campania
from django.contrib.auth import get_user_model
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import PerfilUsuario

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'email', 'contra']

class CampaniaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campania
        fields = ['id', 'titulo', 'descripcion', 'categoria', 'imagenes', 'meta_financiera', 'fecha_limite', 'informacion_creador', 'progeso_financiero']



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