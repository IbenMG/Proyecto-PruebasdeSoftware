from django.db import models
from django.conf import settings

# Usuario model
class Usuario(models.Model):
    nombre = models.CharField(max_length=100)
    email = models.EmailField()
    contra = models.CharField(max_length=100)

# Campaña model
class Campania(models.Model):
    titulo = models.CharField(max_length=100)
    descripcion = models.TextField()
    categoria = models.CharField(max_length=50)
    imagenes = models.ImageField(upload_to='imagenes/')
    meta_financiera = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_limite = models.DateField()
    informacion_creador = models.TextField()
    progeso_financiero = models.DecimalField(max_digits=10, decimal_places=2, default=0)

class PerfilUsuario(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil",
    )
    correo = models.EmailField(unique=True)
    fecha_nacimiento = models.DateField()

    def __str__(self):
        return self.usuario.username