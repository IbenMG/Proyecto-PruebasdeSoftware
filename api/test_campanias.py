from datetime import timedelta
from decimal import Decimal
from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from api.models import Campania

pytestmark = pytest.mark.django_db

@pytest.fixture
def usuario():
    return get_user_model().objects.create_user(username='creador', email='creador@example.com')

@pytest.fixture
def otro():
    return get_user_model().objects.create_user(username='otro', email='otro@example.com')

@pytest.fixture
def cliente(usuario):
    client = APIClient()
    client.force_authenticate(usuario)
    return client

@pytest.fixture
def datos():
    return {
        'titulo': 'Huerto comunitario',
        'descripcion': 'Cultivo de alimentos para el barrio.',
        'categoria': 'Comunidad',
        'meta_financiera': '100000.00',
        'fecha_limite': timezone.localdate().isoformat(),
        'informacion_creador': 'Equipo del barrio.',
    }

@pytest.fixture
def campania(usuario, datos):
    return Campania.objects.create(creador=usuario, **datos)


def test_creacion_sin_imagen(cliente, usuario, otro, datos):
    response = cliente.post('/api/campanias/create/', {
        **datos, 'creador': otro.pk, 'progeso_financiero': '50000',
    }, format='json')
    assert response.status_code == 201
    campaign = Campania.objects.get(pk=response.data['id'])
    assert campaign.creador == usuario
    assert campaign.progeso_financiero == Decimal('0')
    assert not campaign.imagenes
    assert response.data['puede_editar'] is True


@pytest.mark.parametrize('campo', [
    'titulo', 'descripcion', 'categoria', 'meta_financiera',
    'fecha_limite', 'informacion_creador',
])
def test_campos_requeridos(cliente, datos, campo):
    datos.pop(campo)
    response = cliente.post('/api/campanias/create/', datos, format='json')
    assert response.status_code == 400
    assert campo in response.data
    assert not Campania.objects.exists()


@pytest.mark.parametrize('meta', ['0', '-1'])
def test_meta_invalida(cliente, datos, meta):
    response = cliente.post('/api/campanias/create/', {**datos, 'meta_financiera': meta}, format='json')
    assert response.status_code == 400
    assert 'meta_financiera' in response.data
    assert not Campania.objects.exists()


def test_fecha_pasada(cliente, datos):
    datos['fecha_limite'] = (timezone.localdate() - timedelta(days=1)).isoformat()
    response = cliente.post('/api/campanias/create/', datos, format='json')
    assert response.status_code == 400
    assert 'fecha_limite' in response.data
    assert not Campania.objects.exists()


def test_creacion_requiere_login(datos):
    response = APIClient().post('/api/campanias/create/', datos, format='json')
    assert response.status_code == 401
    assert not Campania.objects.exists()


def test_detalle_publico_y_financiamiento(campania):
    campania.progeso_financiero = Decimal('25000')
    campania.save()
    response = APIClient().get(f'/api/campanias/{campania.pk}/')
    assert response.status_code == 200
    assert response.data['titulo'] == campania.titulo
    assert Decimal(response.data['progeso_financiero']) == Decimal('25000')
    assert response.data['puede_editar'] is False


def test_mis_campanias_solo_propias(cliente, campania, otro, datos):
    Campania.objects.create(creador=otro, **datos)
    response = cliente.get('/api/campanias/mis/')
    assert response.status_code == 200
    assert [row['id'] for row in response.data] == [campania.pk]
    assert APIClient().get('/api/campanias/mis/').status_code == 401


def test_edicion_del_creador(cliente, campania):
    response = cliente.patch(f'/api/campanias/{campania.pk}/', {'titulo': 'Nuevo título'}, format='json')
    assert response.status_code == 200
    campania.refresh_from_db()
    assert campania.titulo == 'Nuevo título'


def test_otro_no_puede_editar_ni_eliminar(campania, otro):
    client = APIClient()
    client.force_authenticate(otro)
    assert client.patch(f'/api/campanias/{campania.pk}/', {'titulo': 'Ajeno'}, format='json').status_code == 403
    assert client.delete(f'/api/campanias/{campania.pk}/delete/').status_code == 403
    campania.refresh_from_db()
    assert campania.titulo != 'Ajeno'


def test_edicion_valida_campos(cliente, campania):
    response = cliente.patch(f'/api/campanias/{campania.pk}/', {'meta_financiera': '0'}, format='json')
    assert response.status_code == 400
    campania.refresh_from_db()
    assert campania.meta_financiera > 0


def test_imagen_opcional_y_retiro(cliente, datos, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    buffer = BytesIO()
    Image.new('RGB', (4, 4), 'green').save(buffer, format='PNG')
    imagen = SimpleUploadedFile('huerto.png', buffer.getvalue(), content_type='image/png')
    response = cliente.post('/api/campanias/create/', {**datos, 'imagenes': imagen}, format='multipart')
    assert response.status_code == 201
    campaign = Campania.objects.get(pk=response.data['id'])
    assert campaign.imagenes.storage.exists(campaign.imagenes.name)
    assert '/media/' in response.data['imagenes']
    response = cliente.patch(f'/api/campanias/{campaign.pk}/', {'quitar_imagen': True}, format='json')
    assert response.status_code == 200
    campaign.refresh_from_db()
    assert not campaign.imagenes
