from datetime import date
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from api.models import PerfilUsuario


pytestmark = pytest.mark.django_db
URL = "/api/registro/"


@pytest.fixture
def cliente():
    return APIClient()


@pytest.fixture
def datos():
    return {
        "username": "usuario_prueba",
        "email": "usuario@example.com",
        "password": "PruebaLocal-HU01!",
        "fecha_nacimiento": "2000-01-15",
    }


def test_registro_exitoso(cliente, datos):
    respuesta = cliente.post(URL, datos, format="json")

    assert respuesta.status_code == 201

    usuario = get_user_model().objects.get(username=datos["username"])
    perfil = PerfilUsuario.objects.get(usuario=usuario)

    assert usuario.check_password(datos["password"])
    assert usuario.password != datos["password"]
    assert perfil.correo == datos["email"]
    assert perfil.fecha_nacimiento == date(2000, 1, 15)
    assert "password" not in respuesta.data["usuario"]


@pytest.mark.parametrize(
    "campo",
    ["username", "email", "password", "fecha_nacimiento"],
)
def test_campos_obligatorios(cliente, datos, campo):
    datos.pop(campo)

    respuesta = cliente.post(URL, datos, format="json")

    assert respuesta.status_code == 400
    assert campo in respuesta.data
    assert not get_user_model().objects.exists()
    assert not PerfilUsuario.objects.exists()


def test_correo_invalido(cliente, datos):
    datos["email"] = "correo-invalido"

    respuesta = cliente.post(URL, datos, format="json")

    assert respuesta.status_code == 400
    assert "email" in respuesta.data
    assert not get_user_model().objects.exists()


@pytest.mark.parametrize("campo", ["username", "email"])
def test_duplicado_por_separado(cliente, datos, campo):
    assert cliente.post(URL, datos, format="json").status_code == 201

    nuevos = {
        **datos,
        "username": "otra_persona",
        "email": "otra@example.com",
    }
    nuevos[campo] = datos[campo]

    respuesta = cliente.post(URL, nuevos, format="json")

    assert respuesta.status_code == 400
    assert campo in respuesta.data
    assert get_user_model().objects.count() == 1
    assert PerfilUsuario.objects.count() == 1


@pytest.mark.parametrize(
    "nacimiento, estado",
    [
        ("2008-10-05", 201),  # Cumple 18 años hoy.
        ("2008-10-06", 400),  # Todavía tiene 17 años.
        ("2027-01-01", 400),  # Fecha futura.
    ],
)
def test_limites_de_edad(cliente, datos, nacimiento, estado):
    datos["fecha_nacimiento"] = nacimiento

    with patch(
        "api.serializers.timezone.localdate",
        return_value=date(2026, 10, 5),
    ):
        respuesta = cliente.post(URL, datos, format="json")

    assert respuesta.status_code == estado

    if estado == 400:
        assert "fecha_nacimiento" in respuesta.data
        assert not get_user_model().objects.exists()
        assert not PerfilUsuario.objects.exists()

    if nacimiento == "2008-10-06":
        assert str(respuesta.data["fecha_nacimiento"][0]) == (
            "Debes ser mayor de 18 años para registrarte"
        )
