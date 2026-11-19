from rest_framework_simplejwt.views import TokenViewBase
from .serializers import LoginCorreoSerializer
from rest_framework import generics
from .models import Actualizacion, Usuario, Campania
from .serializers import UsuarioSerializer, CampaniaSerializer
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import F

from .serializers import ActualizacionSerializer, DonacionSerializer, RegistroSerializer


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

class EsCreadorOConsulta(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return request.method in SAFE_METHODS or obj.creador_id == request.user.pk


class CampaniaCreateView(generics.CreateAPIView):
    queryset = Campania.objects.all()
    serializer_class = CampaniaSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(creador=self.request.user)


class CampaniaListView(generics.ListAPIView):
    queryset = Campania.objects.order_by('-id')
    serializer_class = CampaniaSerializer
    permission_classes = [AllowAny]


class MisCampaniasView(generics.ListAPIView):
    serializer_class = CampaniaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Campania.objects.filter(creador=self.request.user).order_by('-id')


class CampaniaRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Campania.objects.all()
    serializer_class = CampaniaSerializer
    permission_classes = [EsCreadorOConsulta]


class CampaniaDonarView(generics.GenericAPIView):
    serializer_class = DonacionSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            campania = get_object_or_404(
                Campania.objects.select_for_update(), pk=pk
            )
            if campania.creador_id == request.user.pk:
                raise PermissionDenied(
                    'El creador no puede donar a su propia campaña.'
                )

            campania.progeso_financiero = (
                F('progeso_financiero') + serializer.validated_data['monto']
            )
            campania.save(update_fields=['progeso_financiero'])
            campania.refresh_from_db()

        return Response(
            CampaniaSerializer(campania, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )


class CampaniaDestroyView(generics.DestroyAPIView):
    queryset = Campania.objects.all()
    serializer_class = CampaniaSerializer
    permission_classes = [IsAuthenticated, EsCreadorOConsulta]


class CampaniaActualizacionesView(generics.ListCreateAPIView):
    serializer_class = ActualizacionSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_campania(self):
        return get_object_or_404(Campania, pk=self.kwargs['pk'])

    def get_queryset(self):
        self.get_campania()
        return Actualizacion.objects.filter(campania_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        campania = self.get_campania()
        if campania.creador_id != self.request.user.pk:
            raise PermissionDenied(
                'Solo el propietario puede publicar actualizaciones.'
            )
        serializer.save(campania=campania)


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
