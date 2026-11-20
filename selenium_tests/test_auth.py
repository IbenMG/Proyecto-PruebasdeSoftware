from selenium.webdriver.common.keys import Keys
from conftest import colocar_fecha
# tests_selenium/test_auth.py
from datetime import datetime
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import BASE_URL, sufijo_unico, esperar_elemento, esperar_clickeable


def test_login_correo_invalido_y_contrasena_vacia(driver):
    driver.get(f"{BASE_URL}/")

    email_input = esperar_elemento(driver, By.XPATH, "//label[contains(., 'Correo electrónico')]/following::input[1]")
    pass_input = driver.find_element(By.XPATH, "//label[normalize-space()='Contraseña']/following::input[1]")
    btn_login = driver.find_element(By.XPATH, "//button[normalize-space()='Iniciar Sesión']")

    # 1. Correo inválido (validación HTML5)
    email_input.send_keys("correo-invalido")
    pass_input.send_keys("ClavePrueba!")
    btn_login.click()
    es_valido = driver.execute_script("return arguments[0].checkValidity();", email_input)
    assert es_valido is False

    # 2. Contraseña en blanco
    email_input.send_keys(Keys.CONTROL, "a")
    email_input.send_keys(Keys.BACKSPACE)
    email_input.send_keys("persona@example.com")
    pass_input.send_keys(Keys.CONTROL, "a")
    pass_input.send_keys(Keys.BACKSPACE)
    pass_input.send_keys("   ")
    btn_login.click()
    alerta = esperar_elemento(driver, By.CSS_SELECTOR, "[role='alert']")
    assert alerta.text == "Contraseña requerida"


def test_login_credenciales_incorrectas_error_generico(driver):
    driver.get(f"{BASE_URL}/")
    esperar_elemento(driver, By.XPATH, "//label[contains(., 'Correo electrónico')]/following::input[1]").send_keys(
        f"inexistente_{sufijo_unico()}@example.com"
    )
    driver.find_element(By.XPATH, "//label[normalize-space()='Contraseña']/following::input[1]").send_keys("ClavePrueba!")
    driver.find_element(By.XPATH, "//button[normalize-space()='Iniciar Sesión']").click()

    alerta = esperar_elemento(driver, By.CSS_SELECTOR, "[role='alert']")
    assert alerta.text == "Correo o contraseña incorrectos"


def test_registro_menor_de_edad_rechazado(driver):
    driver.get(f"{BASE_URL}/")
    esperar_clickeable(driver, By.XPATH, "//button[contains(., 'Crear una cuenta')]").click()
    esperar_elemento(driver, By.XPATH, "//h1[contains(., 'Crear cuenta')] | //h2[contains(., 'Crear cuenta')]")

    suf = sufijo_unico()
    anio_menor = datetime.now().year - 10

    driver.find_element(By.XPATH, "//label[contains(., 'Nombre de usuario')]/following::input[1]").send_keys(f"menor_{suf}")
    driver.find_element(By.XPATH, "//label[contains(., 'Correo electrónico')]/following::input[1]").send_keys(f"menor_{suf}@example.com")
    driver.find_element(By.XPATH, "//label[normalize-space()='Contraseña']/following::input[1]").send_keys("PruebaE2E-HU01!")
    colocar_fecha(driver, driver.find_element(By.XPATH, "//label[contains(., 'Fecha de nacimiento')]/following::input[1]"), f"{anio_menor}-01-15")

    driver.find_element(By.XPATH, "//button[normalize-space()='Registrarse']").click()
    alerta = esperar_elemento(driver, By.CSS_SELECTOR, "[role='alert']")
    assert alerta.text == "Debes ser mayor de 18 años para registrarte"


def test_registro_exitoso_duplicados_y_login(driver):
    suf = sufijo_unico()
    datos = {
        "username": f"e2e_{suf}",
        "email": f"e2e_{suf}@example.com",
        "password": "PruebaE2E-HU01!",
        "fecha": "2000-01-15",
    }

    driver.get(f"{BASE_URL}/")
    esperar_clickeable(driver, By.XPATH, "//button[contains(., 'Crear una cuenta')]").click()

    driver.find_element(By.XPATH, "//label[contains(., 'Nombre de usuario')]/following::input[1]").send_keys(datos["username"])
    driver.find_element(By.XPATH, "//label[contains(., 'Correo electrónico')]/following::input[1]").send_keys(datos["email"])
    driver.find_element(By.XPATH, "//label[normalize-space()='Contraseña']/following::input[1]").send_keys(datos["password"])
    colocar_fecha(driver, driver.find_element(By.XPATH, "//label[contains(., 'Fecha de nacimiento')]/following::input[1]"), datos["fecha"])
    driver.find_element(By.XPATH, "//button[normalize-space()='Registrarse']").click()

    status = esperar_elemento(driver, By.CSS_SELECTOR, "[role='status']")
    assert status.text == "Cuenta creada correctamente. Ya puedes iniciar sesión."

    # Iniciar sesión con la cuenta recién creada
    esperar_elemento(driver, By.XPATH, "//label[normalize-space()='Correo electrónico']/following::input[1]").send_keys(datos["email"])
    driver.find_element(By.XPATH, "//label[normalize-space()='Contraseña']/following::input[1]").send_keys(datos["password"])
    driver.find_element(By.XPATH, "//button[normalize-space()='Iniciar Sesión']").click()

    esperar_elemento(driver, By.XPATH, "//button[normalize-space()='Cerrar sesión']")
    esperar_clickeable(driver, By.XPATH, "//button[contains(., 'Cerrar sesión')]").click()
    esperar_elemento(driver, By.XPATH, "//h1[contains(., 'Iniciar sesión')] | //h2[contains(., 'Iniciar sesión')]")
