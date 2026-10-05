from rest_framework_simplejwt.views import TokenViewBase
from .serializers import LoginCorreoSerializer
from rest_framework import generics
from .models import Usuario, Campania
from .serializers import UsuarioSerializer, CampaniaSerializer
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import RegistroSerializer


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


class RegistroView(generics.GenericAPIView):
    serializer_class = RegistroSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()

        return Response(
            {
                "mensaje": "Cuenta creada correctamente.",
                "usuario": {
                    "id": usuario.id,
                    "username": usuario.username,
                    "email": usuario.email,
                },
            },
            status=status.HTTP_201_CREATED,
        )



class LoginCorreoView(TokenViewBase):
    serializer_class = LoginCorreoSerializer
