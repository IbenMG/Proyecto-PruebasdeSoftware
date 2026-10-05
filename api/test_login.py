import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

pytestmark = pytest.mark.django_db

@pytest.fixture
def cliente():
    return APIClient()

@pytest.fixture
def usuario():
    return get_user_model().objects.create_user(
        username='usuario_login', email='login@example.com', password='Clave-HU02!'
    )

def test_login_con_correo(cliente, usuario):
    respuesta = cliente.post('/api/token/', {'email': usuario.email, 'password': 'Clave-HU02!'}, format='json')
    assert respuesta.status_code == 200
    assert int(AccessToken(respuesta.data['access'])['user_id']) == usuario.id
    assert 'refresh' in respuesta.data

@pytest.mark.parametrize('correo, clave', [
    ('login@example.com', 'Incorrecta'),
    ('noexiste@example.com', 'Clave-HU02!'),
])
def test_error_generico(cliente, usuario, correo, clave):
    respuesta = cliente.post('/api/token/', {'email': correo, 'password': clave}, format='json')
    assert respuesta.status_code == 401
    assert str(respuesta.data['detail']) == 'Correo o contraseña incorrectos'
    assert 'access' not in respuesta.data

@pytest.mark.parametrize('datos, campo', [
    ({'email': '', 'password': 'Clave-HU02!'}, 'email'),
    ({'email': 'incorrecto', 'password': 'Clave-HU02!'}, 'email'),
    ({'email': 'login@example.com', 'password': ''}, 'password'),
])
def test_campos_invalidos(cliente, datos, campo):
    respuesta = cliente.post('/api/token/', datos, format='json')
    assert respuesta.status_code == 400
    assert campo in respuesta.data

def test_usuario_inactivo(cliente, usuario):
    usuario.is_active = False
    usuario.save()
    respuesta = cliente.post('/api/token/', {'email': usuario.email, 'password': 'Clave-HU02!'}, format='json')
    assert respuesta.status_code == 401
    assert str(respuesta.data['detail']) == 'Correo o contraseña incorrectos'
