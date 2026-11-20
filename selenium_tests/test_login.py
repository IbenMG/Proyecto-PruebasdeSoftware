import uuid
from datetime import date
from urllib.parse import urlparse

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


def visible(driver, by, value):
    return WebDriverWait(driver, 15).until(
        EC.visibility_of_element_located((by, value))
    )


def click_text(driver, text):
    locator = (
        By.XPATH,
        f"//*[self::button or self::a][normalize-space()='{text}']",
    )
    WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable(locator)
    ).click()


def fill_id(driver, element_id, value):
    element = visible(driver, By.ID, element_id)
    element.send_keys(Keys.CONTROL, "a")
    element.send_keys(Keys.BACKSPACE)
    element.send_keys(value)


def fill_label(driver, label_text, value):
    label = visible(
        driver, By.XPATH, f"//label[normalize-space()='{label_text}']"
    )
    element_id = label.get_attribute("for")
    assert element_id, f"Etiqueta sin campo asociado: {label_text}"
    fill_id(driver, element_id, value)


def set_date(driver, element_id, value):
    """Evita depender del formato regional del campo date."""
    element = visible(driver, By.ID, element_id)
    driver.execute_script(
        """
        const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype, 'value'
        ).set;
        setter.call(arguments[0], arguments[1]);
        arguments[0].dispatchEvent(new Event('input', {bubbles: true}));
        arguments[0].dispatchEvent(new Event('change', {bubbles: true}));
        """,
        element,
        value,
    )


def expect_heading(driver, text):
    return visible(
        driver,
        By.XPATH,
        f"//*[self::h1 or self::h2 or self::h3]"
        f"[normalize-space()='{text}']",
    )


def expect_text(driver, text):
    WebDriverWait(driver, 15).until(
        lambda d: text in d.find_element(By.TAG_NAME, "body").text
    )


def login(driver, base_url, user):
    driver.get(f"{base_url}/")
    fill_id(driver, "login-email", user["email"])
    fill_id(driver, "login-password", user["password"])
    click_text(driver, "Iniciar Sesión")

    WebDriverWait(driver, 15).until(
        lambda d: urlparse(d.current_url).path == "/main"
    )
    visible(
        driver,
        By.XPATH,
        "//button[normalize-space()='Cerrar sesión']",
    )


def registration(driver, base_url):
    driver.get(f"{base_url}/registro")
    expect_heading(driver, "Crear cuenta")


def registration_data():
    suffix = uuid.uuid4().hex[:16]
    return {
        "username": f"ui_{suffix}",
        "email": f"ui_{suffix}@example.com",
        "password": "Selenium-Registro-2026!",
        "fecha_nacimiento": "2000-01-15",
    }


def fill_registration(driver, data):
    for name in ("username", "email", "password"):
        fill_id(driver, f"registro-{name}", data[name])

    set_date(
        driver,
        "registro-fecha_nacimiento",
        data["fecha_nacimiento"],
    )


# LOGIN: 3 casos

def test_login_correo_invalido(driver, base_url):
    driver.get(f"{base_url}/")
    fill_id(driver, "login-email", "correo-invalido")
    fill_id(driver, "login-password", "ClavePrueba!")
    click_text(driver, "Iniciar Sesión")

    email = driver.find_element(By.ID, "login-email")
    assert driver.execute_script(
        "return arguments[0].validity.typeMismatch;", email
    )
    assert urlparse(driver.current_url).path == "/"
    expect_heading(driver, "Iniciar sesión")


def test_login_contrasena_en_blanco(driver, base_url):
    driver.get(f"{base_url}/")
    fill_id(driver, "login-email", "persona@example.com")
    fill_id(driver, "login-password", "   ")
    click_text(driver, "Iniciar Sesión")

    expect_text(driver, "Contraseña requerida")
    assert urlparse(driver.current_url).path == "/"


def test_login_cuenta_inexistente(driver, base_url):
    driver.get(f"{base_url}/")
    fill_id(
        driver, "login-email",
        f"inexistente_{uuid.uuid4().hex}@example.com",
    )
    fill_id(driver, "login-password", "ClaveIncorrecta!")
    click_text(driver, "Iniciar Sesión")

    expect_text(driver, "Correo o contraseña incorrectos")
    assert urlparse(driver.current_url).path == "/"


# REGISTRO: 7 casos (4 parametrizados + 3)

@pytest.mark.parametrize(
    "missing",
    ["username", "email", "password", "fecha_nacimiento"],
)
def test_registro_campo_obligatorio(driver, base_url, missing):
    registration(driver, base_url)
    data = registration_data()
    data[missing] = ""
    fill_registration(driver, data)
    click_text(driver, "Registrarse")

    field = driver.find_element(By.ID, f"registro-{missing}")
    assert driver.execute_script(
        "return arguments[0].validity.valueMissing;", field
    )
    expect_heading(driver, "Crear cuenta")


def test_registro_correo_invalido(driver, base_url):
    registration(driver, base_url)
    data = registration_data()
    data["email"] = "email-invalido"
    fill_registration(driver, data)
    click_text(driver, "Registrarse")

    field = driver.find_element(By.ID, "registro-email")
    assert driver.execute_script(
        "return arguments[0].validity.typeMismatch;", field
    )
    expect_heading(driver, "Crear cuenta")


def test_registro_menor_de_edad(driver, base_url):
    registration(driver, base_url)
    data = registration_data()
    data["fecha_nacimiento"] = f"{date.today().year - 10}-01-15"
    fill_registration(driver, data)
    click_text(driver, "Registrarse")

    expect_text(driver, "Debes ser mayor de 18 años para registrarte")
    expect_heading(driver, "Crear cuenta")


def test_registro_duplicados_login_y_logout(driver, base_url):
    registration(driver, base_url)
    data = registration_data()
    fill_registration(driver, data)
    click_text(driver, "Registrarse")

    expect_heading(driver, "Iniciar sesión")
    expect_text(
        driver, "Cuenta creada correctamente. Ya puedes iniciar sesión."
    )

    click_text(driver, "Crear una cuenta")
    fill_registration(driver, data)
    click_text(driver, "Registrarse")

    expect_text(driver, "Este nombre de usuario ya está en uso.")
    expect_text(driver, "Este correo electrónico ya está en uso.")

    login(driver, base_url, data)
    click_text(driver, "Cerrar sesión")
    expect_heading(driver, "Iniciar sesión")

    assert driver.execute_script(
        "return localStorage.getItem('access_token');"
    ) is None


# PERMISOS DE NAVEGACIÓN: 3 casos

@pytest.mark.parametrize(
    "path", ["/main", "/campaigns/create", "/campaigns/my"]
)
def test_ruta_protegida_sin_sesion(driver, base_url, path):
    driver.get(f"{base_url}{path}")
    expect_heading(driver, "Iniciar sesión")
    assert urlparse(driver.current_url).path == "/"


# CAMPAÑAS: 3 casos

def test_crud_campania(driver, base_url, account, api):
    user = account()
    login(driver, base_url, user)
    click_text(driver, "Crear campaña")

    title = f"Proyecto Selenium {uuid.uuid4().hex[:12]}"

    for label, value in [
        ("Título", title),
        ("Descripción", "Proyecto de prueba para validar el CRUD."),
        ("Categoría", "Comunidad"),
        ("Meta de financiamiento", "1000"),
        ("Información del creador", "Equipo Selenium."),
    ]:
        fill_label(driver, label, value)

    date_label = driver.find_element(
        By.XPATH, "//label[normalize-space()='Fecha límite']"
    )
    set_date(driver, date_label.get_attribute("for"), "2099-12-31")

    click_text(driver, "Publicar campaña")
    expect_text(driver, "Campaña creada exitosamente")
    expect_heading(driver, title)

    campaign_id = urlparse(driver.current_url).path.rstrip("/").split("/")[-1]
    assert campaign_id.isdigit()

    click_text(driver, "Editar campaña")
    updated = f"{title} actualizado"
    fill_label(driver, "Título", updated)
    click_text(driver, "Guardar cambios")

    expect_text(driver, "Campaña actualizada exitosamente")
    expect_heading(driver, updated)

    driver.get(f"{base_url}/campaigns/my")
    expect_heading(driver, "Mis campañas")
    expect_heading(driver, updated)

    driver.get(f"{base_url}/campaigns/{campaign_id}")
    expect_heading(driver, updated)

    # Cancelar no debe eliminar.
    click_text(driver, "Eliminar campaña")
    alert = WebDriverWait(driver, 10).until(EC.alert_is_present())
    assert updated in alert.text
    alert.dismiss()

    status, _ = api("GET", f"campanias/{campaign_id}/")
    assert status == 200
    expect_heading(driver, updated)

    # Confirmar debe eliminar y volver al listado.
    click_text(driver, "Eliminar campaña")
    WebDriverWait(driver, 10).until(EC.alert_is_present()).accept()

    WebDriverWait(driver, 15).until(
        lambda d: urlparse(d.current_url).path == "/campaigns/my"
    )
    expect_text(driver, "Campaña eliminada correctamente.")

    status, _ = api("GET", f"campanias/{campaign_id}/")
    assert status == 404


def test_busqueda_abre_detalle(driver, base_url, campaign):
    owner, item = campaign
    login(driver, base_url, owner)

    search = visible(
        driver,
        By.CSS_SELECTOR,
        "input[type='search']",
    )
    search.send_keys(item["titulo"])

    result = WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((
            By.XPATH,
            "//*[@aria-label='Resultados de búsqueda']"
            f"//a[normalize-space()='{item['titulo']}']",
        ))
    )
    result.click()

    expect_heading(driver, item["titulo"])
    assert urlparse(driver.current_url).path == f"/campaigns/{item['id']}"


def test_otro_usuario_no_puede_eliminar(
    driver, base_url, campaign, account, api
):
    _, item = campaign
    other = account()
    login(driver, base_url, other)

    driver.get(f"{base_url}/campaigns/{item['id']}")
    expect_heading(driver, item["titulo"])

    assert not driver.find_elements(
        By.XPATH, "//button[normalize-space()='Eliminar campaña']"
    )
    assert not driver.find_elements(
        By.XPATH, "//a[normalize-space()='Editar campaña']"
    )

    status, _ = api(
        "DELETE",
        f"campanias/{item['id']}/delete/",
        token=other["access"],
    )
    assert status == 403

    status, _ = api("GET", f"campanias/{item['id']}/")
    assert status == 200