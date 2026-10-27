import json
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from api.models import Actualizacion, Checkpoint, Campania


pytestmark = pytest.mark.django_db


@pytest.fixture
def usuario():
    return get_user_model().objects.create_user(
        username='creador_entrega2',
        email='creador_entrega2@example.com',
        password='Clave-Entrega2!',
    )


@pytest.fixture
def otro():
    return get_user_model().objects.create_user(
        username='visitante_entrega2',
        email='visitante_entrega2@example.com',
        password='Clave-Entrega2!',
    )


@pytest.fixture
def datos():
    return {
        'titulo': 'Biblioteca comunitaria',
        'descripcion': 'Un espacio de lectura para el barrio.',
        'categoria': 'Comunidad',
        'meta_financiera': '1000.00',
        'fecha_limite': timezone.localdate().isoformat(),
        'informacion_creador': 'Equipo vecinal.',
    }


@pytest.fixture
def cliente(usuario):
    client = APIClient()
    client.force_authenticate(usuario)
    return client


@pytest.fixture
def campania(usuario, datos):
    return Campania.objects.create(creador=usuario, **datos)


def test_checkpoints_se_guardan_ordenados_al_crear(cliente, datos):
    response = cliente.post(
        '/api/campanias/create/',
        {
            **datos,
            'checkpoints': [
                {'titulo': 'Lanzamiento', 'descripcion': 'Abrir el espacio.', 'monto_objetivo': '800'},
                {'titulo': 'Prototipo', 'descripcion': 'Terminar el diseño.', 'monto_objetivo': '250'},
            ],
        },
        format='json',
    )

    assert response.status_code == 201
    assert [item['monto_objetivo'] for item in response.data['checkpoints']] == ['250.00', '800.00']
    assert Checkpoint.objects.count() == 2


def test_checkpoints_aceptan_el_formato_multipart_del_formulario(cliente, datos):
    response = cliente.post(
        '/api/campanias/create/',
        {
            **datos,
            'checkpoints': json.dumps([
                {'titulo': 'Prototipo', 'descripcion': 'Primera etapa.', 'monto_objetivo': '250'},
            ]),
        },
        format='multipart',
    )

    assert response.status_code == 201
    assert response.data['checkpoints'][0]['titulo'] == 'Prototipo'


def test_checkpoints_se_reemplazan_al_editar(cliente, campania):
    Checkpoint.objects.create(
        campania=campania,
        titulo='Anterior',
        descripcion='Hito anterior.',
        monto_objetivo=Decimal('100'),
    )

    response = cliente.patch(
        f'/api/campanias/{campania.pk}/',
        {
            'checkpoints': [
                {'titulo': 'Nuevo hito', 'descripcion': 'Hito actualizado.', 'monto_objetivo': '500'},
            ],
        },
        format='json',
    )

    assert response.status_code == 200
    assert list(campania.checkpoints.values_list('titulo', flat=True)) == ['Nuevo hito']


def test_no_se_puede_reducir_la_meta_bajo_un_checkpoint(cliente, campania):
    Checkpoint.objects.create(
        campania=campania,
        titulo='Lanzamiento',
        descripcion='Hito existente.',
        monto_objetivo=Decimal('800'),
    )

    response = cliente.patch(
        f'/api/campanias/{campania.pk}/',
        {'meta_financiera': '700'},
        format='json',
    )

    assert response.status_code == 400
    assert 'checkpoints' in response.data


@pytest.mark.parametrize('monto', ['0', '-1', '1000.01'])
def test_checkpoint_rechaza_monto_fuera_del_rango(cliente, datos, monto):
    response = cliente.post(
        '/api/campanias/create/',
        {
            **datos,
            'checkpoints': [
                {'titulo': 'Hito inválido', 'descripcion': 'No debe guardarse.', 'monto_objetivo': monto},
            ],
        },
        format='json',
    )

    assert response.status_code == 400
    assert 'checkpoints' in response.data
    assert not Campania.objects.exists()


def test_checkpoint_muestra_estado_segun_progreso(cliente, campania):
    Checkpoint.objects.create(
        campania=campania,
        titulo='Prototipo',
        descripcion='Primera etapa.',
        monto_objetivo=Decimal('250'),
    )
    Checkpoint.objects.create(
        campania=campania,
        titulo='Lanzamiento',
        descripcion='Segunda etapa.',
        monto_objetivo=Decimal('750'),
    )
    campania.progeso_financiero = Decimal('500')
    campania.save(update_fields=['progeso_financiero'])

    response = APIClient().get(f'/api/campanias/{campania.pk}/')

    assert response.status_code == 200
    assert [item['alcanzado'] for item in response.data['checkpoints']] == [True, False]


def test_propietario_publica_y_visitantes_consultan_actualizaciones(cliente, campania):
    primera = cliente.post(
        f'/api/campanias/{campania.pk}/actualizaciones/',
        {'titulo': 'Inicio', 'contenido': 'Comenzamos el trabajo.'},
        format='json',
    )
    segunda = cliente.post(
        f'/api/campanias/{campania.pk}/actualizaciones/',
        {'titulo': 'Avance', 'contenido': 'El prototipo ya está listo.'},
        format='json',
    )

    assert primera.status_code == 201
    assert segunda.status_code == 201
    assert segunda.data['fecha_publicacion']

    publicacion = APIClient().get(
        f'/api/campanias/{campania.pk}/actualizaciones/'
    )

    assert publicacion.status_code == 200
    assert [item['titulo'] for item in publicacion.data] == ['Avance', 'Inicio']
    assert Actualizacion.objects.count() == 2


def test_no_propietario_no_puede_publicar_actualizacion(campania, otro):
    client = APIClient()
    client.force_authenticate(otro)

    response = client.post(
        f'/api/campanias/{campania.pk}/actualizaciones/',
        {'titulo': 'Intento ajeno', 'contenido': 'No debe publicarse.'},
        format='json',
    )

    assert response.status_code == 403
    assert not Actualizacion.objects.exists()


def test_actualizacion_exige_titulo_de_tres_caracteres(cliente, campania):
    response = cliente.post(
        f'/api/campanias/{campania.pk}/actualizaciones/',
        {'titulo': 'No', 'contenido': 'Contenido suficientemente descriptivo.'},
        format='json',
    )

    assert response.status_code == 400
    assert 'titulo' in response.data
