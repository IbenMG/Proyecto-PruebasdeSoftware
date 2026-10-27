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
    imagenes = models.ImageField(upload_to='imagenes/', blank=True)
    creador = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='campanias',
    )
    meta_financiera = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_limite = models.DateField()
    informacion_creador = models.TextField()
    progeso_financiero = models.DecimalField(max_digits=10, decimal_places=2, default=0)


class Checkpoint(models.Model):
    campania = models.ForeignKey(
        Campania,
        on_delete=models.CASCADE,
        related_name='checkpoints',
    )
    titulo = models.CharField(max_length=120)
    descripcion = models.TextField()
    monto_objetivo = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['monto_objetivo', 'id']

    def __str__(self):
        return f'{self.titulo} - {self.campania.titulo}'


class Actualizacion(models.Model):
    campania = models.ForeignKey(
        Campania,
        on_delete=models.CASCADE,
        related_name='actualizaciones',
    )
    titulo = models.CharField(max_length=150)
    contenido = models.TextField()
    fecha_publicacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha_publicacion', '-id']

    def __str__(self):
        return f'{self.titulo} - {self.campania.titulo}'

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
