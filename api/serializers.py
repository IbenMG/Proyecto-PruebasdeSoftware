from rest_framework import serializers
from .models import Usuario, Campania

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'email', 'contra']

class CampaniaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campania
        fields = ['id', 'titulo', 'descripcion', 'categoria', 'imagenes', 'meta_financiera', 'fecha_limite', 'informacion_creador', 'progeso_financiero']