from django.contrib import admin
from .models import Actualizacion, Campania, Checkpoint, PerfilUsuario

admin.site.register([Campania, Checkpoint, Actualizacion, PerfilUsuario])
