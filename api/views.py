from rest_framework import generics
from .models import Usuario, Campania
from .serializers import UsuarioSerializer, CampaniaSerializer


# =======================
#    CRUD de Usuario
# =======================

# Crear usuario
class UsuarioCreateView(generics.CreateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

# Lista de usuarios
class UsuarioListView(generics.ListAPIView):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

# Extraer o actualizar usuario
class UsuarioRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

# Borrar usuario
class UsuarioDestroyView(generics.DestroyAPIView):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

# =======================
#    CRUD de Campaña
# =======================

# Crear campaña
class CampaniaCreateView(generics.CreateAPIView):
    queryset = Campania.objects.all()
    serializer_class = CampaniaSerializer

# Listar campañas
class CampaniaListView(generics.ListAPIView):
    queryset = Campania.objects.all()
    serializer_class = CampaniaSerializer

# Extraer o actualizar campaña
class CampaniaRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Campania.objects.all()
    serializer_class = CampaniaSerializer

# Borrar campaña
class CampaniaDestroyView(generics.DestroyAPIView):
    queryset = Campania.objects.all()
    serializer_class = CampaniaSerializer