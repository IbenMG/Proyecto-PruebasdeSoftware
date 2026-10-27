import json
from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone

from api.models import Campania, Checkpoint
from api.serializers import (
    ActualizacionSerializer,
    CampaniaSerializer,
    CheckpointSerializer,
    LoginCorreoSerializer,
    RegistroSerializer,
)


def checkpoint_data(monto='250'):
    return {
        'titulo': 'Prototipo',
        'descripcion': 'Primera etapa del proyecto.',
        'monto_objetivo': monto,
    }


def campania_data(checkpoints=None, meta='1000'):
    return {
        'titulo': 'Campaña de prueba',
        'descripcion': 'Descripción de prueba.',
        'categoria': 'Comunidad',
        'meta_financiera': meta,
        'fecha_limite': (timezone.localdate() + timedelta(days=30)).isoformat(),
        'informacion_creador': 'Equipo de prueba.',
        **({'checkpoints': checkpoints} if checkpoints is not None else {}),
    }


def test_checkpoint_serializer_recorta_texto_valido():
    serializer = CheckpointSerializer(data={
        'titulo': '  Prototipo  ',
        'descripcion': '  Primera etapa.  ',
        'monto_objetivo': '250',
    })

    assert serializer.is_valid()
    assert serializer.validated_data['titulo'] == 'Prototipo'
    assert serializer.validated_data['descripcion'] == 'Primera etapa.'


@pytest.mark.parametrize('campo', ['titulo', 'descripcion'])
def test_checkpoint_serializer_rechaza_texto_vacío(campo):
    data = checkpoint_data()
    data[campo] = '   '
    serializer = CheckpointSerializer(data=data)

    assert not serializer.is_valid()
    assert campo in serializer.errors


@pytest.mark.parametrize('monto', ['0', '-1', 'abc'])
def test_checkpoint_serializer_rechaza_monto_inválido(monto):
    serializer = CheckpointSerializer(data=checkpoint_data(monto))

    assert not serializer.is_valid()
    assert 'monto_objetivo' in serializer.errors


def test_checkpoint_serializer_calcula_estado_alcanzado():
    campania = Campania(meta_financiera=1000, progeso_financiero=500)
    checkpoint = Checkpoint(campania=campania, monto_objetivo=500)
    serializer = CheckpointSerializer()

    assert serializer.get_alcanzado(checkpoint) is True
    checkpoint.monto_objetivo = 500.01
    assert serializer.get_alcanzado(checkpoint) is False


def test_campania_serializer_acepta_checkpoints_en_json_multipart():
    payload = campania_data(checkpoints=json.dumps([checkpoint_data()]))
    serializer = CampaniaSerializer(data=payload)

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data['checkpoints'][0]['monto_objetivo'] == Decimal('250.00')


def test_campania_serializer_rechaza_json_de_checkpoints_inválido():
    serializer = CampaniaSerializer(data=campania_data(checkpoints='{no-json'))

    assert not serializer.is_valid()
    assert 'checkpoints' in serializer.errors


def test_campania_serializer_rechaza_checkpoint_sobre_meta_global():
    serializer = CampaniaSerializer(data=campania_data(
        checkpoints=[checkpoint_data('1000.01')],
        meta='1000',
    ))

    assert not serializer.is_valid()
    assert 'checkpoints' in serializer.errors


def test_campania_serializer_acepta_checkpoint_igual_a_meta_global():
    serializer = CampaniaSerializer(data=campania_data(
        checkpoints=[checkpoint_data('1000')],
        meta='1000',
    ))

    assert serializer.is_valid(), serializer.errors


def test_campania_serializer_calcula_permiso_del_propietario():
    campania = Campania(creador_id=7)
    request = SimpleNamespace(user=SimpleNamespace(is_authenticated=True, pk=7))
    serializer = CampaniaSerializer(context={'request': request})

    assert serializer.get_puede_editar(campania) is True
    request.user.pk = 8
    assert serializer.get_puede_editar(campania) is False


def test_campania_serializer_valida_meta_positiva():
    serializer = CampaniaSerializer()

    with pytest.raises(serializers.ValidationError):
        serializer.validate_meta_financiera(Decimal('0'))

    assert serializer.validate_meta_financiera(Decimal('0.01')) == Decimal('0.01')


def test_campania_serializer_valida_fecha_limite():
    serializer = CampaniaSerializer()
    hoy = date(2026, 10, 27)
    with patch('api.serializers.timezone.localdate', return_value=hoy):
        with pytest.raises(serializers.ValidationError):
            serializer.validate_fecha_limite(date(2026, 10, 26))
        assert serializer.validate_fecha_limite(hoy) == hoy


def test_actualizacion_serializer_recorta_texto_valido():
    serializer = ActualizacionSerializer(data={
        'titulo': '  Avance  ',
        'contenido': '  El prototipo está listo.  ',
    })

    assert serializer.is_valid()
    assert serializer.validated_data['titulo'] == 'Avance'
    assert serializer.validated_data['contenido'] == 'El prototipo está listo.'


@pytest.mark.parametrize('titulo', ['', 'No', '  '])
def test_actualizacion_serializer_exige_titulo_de_tres_caracteres(titulo):
    serializer = ActualizacionSerializer(data={
        'titulo': titulo,
        'contenido': 'Contenido de prueba.',
    })

    assert not serializer.is_valid()
    assert 'titulo' in serializer.errors


def test_actualizacion_serializer_exige_contenido():
    serializer = ActualizacionSerializer(data={'titulo': 'Avance', 'contenido': ' '})

    assert not serializer.is_valid()
    assert 'contenido' in serializer.errors


@pytest.mark.parametrize(
    'nacimiento, válida',
    [(date(2008, 10, 27), True), (date(2008, 10, 28), False), (date(2027, 1, 1), False)],
)
def test_registro_serializer_valida_mayoría_de_edad(nacimiento, válida):
    serializer = RegistroSerializer()
    with patch('api.serializers.timezone.localdate', return_value=date(2026, 10, 27)):
        if válida:
            assert serializer.validate_fecha_nacimiento(nacimiento) == nacimiento
        else:
            with pytest.raises(serializers.ValidationError):
                serializer.validate_fecha_nacimiento(nacimiento)


def test_registro_serializer_normaliza_correo():
    user_model = Mock()
    user_model.objects.filter.return_value.exists.return_value = False
    perfil_model = Mock()
    perfil_model.objects.filter.return_value.exists.return_value = False

    with patch('api.serializers.get_user_model', return_value=user_model), \
            patch('api.serializers.PerfilUsuario', perfil_model):
        resultado = RegistroSerializer().validate_email('  Persona@Example.COM  ')

    assert resultado == 'persona@example.com'


def test_registro_serializer_rechaza_usuario_duplicado():
    user_model = Mock()
    user_model.objects.filter.return_value.exists.return_value = True

    with patch('api.serializers.get_user_model', return_value=user_model):
        with pytest.raises(serializers.ValidationError):
            RegistroSerializer().validate_username('persona')


def test_login_serializer_entrega_tokens_para_credenciales_válidas():
    usuario = SimpleNamespace(username='persona', is_active=True)
    user_model = Mock()
    user_model.objects.filter.return_value = [usuario]
    refresh = SimpleNamespace(access_token='access-token')

    with patch('api.serializers.get_user_model', return_value=user_model), \
            patch('api.serializers.authenticate', return_value=usuario), \
            patch('api.serializers.RefreshToken.for_user', return_value=refresh):
        resultado = LoginCorreoSerializer().validate({
            'email': 'persona@example.com',
            'password': 'ClaveCorrecta!',
        })

    assert resultado['access'] == 'access-token'
    assert 'refresh' in resultado


def test_login_serializer_rechaza_credenciales_invalidas():
    usuario = SimpleNamespace(username='persona', is_active=True)
    user_model = Mock()
    user_model.objects.filter.return_value = [usuario]

    with patch('api.serializers.get_user_model', return_value=user_model), \
            patch('api.serializers.authenticate', return_value=None):
        with pytest.raises(AuthenticationFailed):
            LoginCorreoSerializer().validate({
                'email': 'persona@example.com',
                'password': 'ClaveIncorrecta!',
            })
