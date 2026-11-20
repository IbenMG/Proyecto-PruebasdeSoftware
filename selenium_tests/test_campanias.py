from selenium.webdriver.common.keys import Keys
from conftest import colocar_fecha
# tests_selenium/test_campanias.py
import time
import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import (
    API,
    BASE_URL,
    fecha_chile,
    crear_cuenta_api,
    iniciar_sesion_localstorage,
    esperar_elemento,
    esperar_clickeable,
)


def completar_formulario_campania(driver, datos):
    campos = {
        "Título": datos["titulo"],
        "Descripción": datos["descripcion"],
        "Categoría": datos["categoria"],
        "Meta de financiamiento": datos["meta_financiera"],
        "Fecha límite": datos["fecha_limite"],
        "Información del creador": datos["informacion_creador"],
    }
    for label_text, valor in campos.items():
        el = esperar_elemento(
            driver,
            By.XPATH,
            f"//label[normalize-space()='{label_text}']/following::*[self::input or self::textarea or self::select][1]",
        )
        if el.get_attribute('type') == 'date':
            colocar_fecha(driver, el, valor)
        else:
            el.send_keys(Keys.CONTROL, "a")
            el.send_keys(Keys.BACKSPACE)
            el.send_keys(valor)


def test_crear_editar_y_listar_campania_propia(driver):
    tokens = crear_cuenta_api("camp")
    iniciar_sesion_localstorage(driver, tokens, "/main")

    esperar_clickeable(driver, By.LINK_TEXT, "Crear campaña").click()
    titulo = f"Huerto {int(time.time() * 1000)}"

    completar_formulario_campania(
        driver,
        {
            "titulo": titulo,
            "descripcion": "Proyecto comunitario de prueba.",
            "categoria": "Comunidad",
            "meta_financiera": "100",
            "fecha_limite": fecha_chile(7),
            "informacion_creador": "Equipo local.",
        },
    )
    driver.find_element(By.XPATH, "//button[contains(., 'Publicar campaña')]").click()

    status = esperar_elemento(driver, By.CSS_SELECTOR, "[role='status']")
    assert status.text == "Campaña creada exitosamente"
    esperar_elemento(driver, By.XPATH, f"//h1[normalize-space()='{titulo}']")

    # Editar campaña
    esperar_clickeable(driver, By.LINK_TEXT, "Editar campaña").click()
    input_titulo = esperar_elemento(driver, By.XPATH, "//label[normalize-space()='Título']/following::input[1]")
    input_titulo.send_keys(Keys.CONTROL, "a")
    input_titulo.send_keys(Keys.BACKSPACE)
    input_titulo.send_keys(f"{titulo} actualizado")
    driver.find_element(By.XPATH, "//button[contains(., 'Guardar cambios')]").click()

    status_edit = esperar_elemento(driver, By.CSS_SELECTOR, "[role='status']")
    assert status_edit.text == "Campaña actualizada exitosamente"
    esperar_elemento(driver, By.XPATH, f"//h1[normalize-space()='{titulo} actualizado']")

    # Verificar en Mis campañas
    esperar_clickeable(driver, By.LINK_TEXT, "Ir al inicio").click()
    esperar_clickeable(driver, By.LINK_TEXT, "Ver mis campañas").click()
    esperar_elemento(driver, By.XPATH, f"//*[normalize-space()='{titulo} actualizado']")


def test_validaciones_formulario_campania(driver):
    tokens = crear_cuenta_api("val")
    iniciar_sesion_localstorage(driver, tokens, "/main")
    esperar_clickeable(driver, By.LINK_TEXT, "Crear campaña").click()

    # Envío vacío
    esperar_clickeable(driver, By.XPATH, "//button[contains(., 'Publicar campaña')]").click()
    WebDriverWait(driver, 10).until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "[role=alert]")) == 6)
    errores_vacios = driver.find_elements(By.XPATH, "//*[normalize-space()='Campo obligatorio.']")
    assert len(errores_vacios) == 6

    # Meta 0 y fecha pasada
    completar_formulario_campania(
        driver,
        {
            "titulo": "Inválida",
            "descripcion": "Descripción válida",
            "categoria": "Comunidad",
            "meta_financiera": "0",
            "fecha_limite": fecha_chile(-1),
            "informacion_creador": "Equipo",
        },
    )
    driver.find_element(By.XPATH, "//button[contains(., 'Publicar campaña')]").click()
    esperar_elemento(driver, By.XPATH, "//*[normalize-space()='La meta de financiamiento debe ser mayor que cero.']")
    esperar_elemento(driver, By.XPATH, "//*[normalize-space()='La fecha límite no puede ser anterior al día actual.']")


def test_donacion_simulada_otro_usuario(driver):
    creador = crear_cuenta_api("creador")
    donante = crear_cuenta_api("donante")

    res = requests.post(
        f"{API}/campanias/create/",
        headers={"Authorization": f"Bearer {creador['access']}"},
        json={
            "titulo": f"Donación {int(time.time() * 1000)}",
            "descripcion": "Campaña para donar",
            "categoria": "Comunidad",
            "meta_financiera": "100",
            "fecha_limite": fecha_chile(7),
            "informacion_creador": "Equipo local.",
        },
        timeout=10,
    )
    assert res.status_code == 201
    campaign = res.json()

    # Entrar como donante
    iniciar_sesion_localstorage(driver, donante, f"/campaigns/{campaign['id']}")
    input_monto = esperar_elemento(driver, By.XPATH, "//label[contains(., 'Monto a donar')]/following::input[1]")
    input_monto.send_keys("25")
    driver.find_element(By.XPATH, "//button[normalize-space()='Donar']").click()

    status = esperar_elemento(driver, By.CSS_SELECTOR, "[role='status']")
    assert status.text == "Donación registrada correctamente."
    assert "25" in driver.find_element(By.CSS_SELECTOR, ".progress-header").text

    # Entrar como creador y verificar que no aparece el botón Donar
    iniciar_sesion_localstorage(driver, creador, f"/campaigns/{campaign['id']}")
    esperar_elemento(driver, By.XPATH, f"//h1[normalize-space()='{campaign['titulo']}']")
    assert len(driver.find_elements(By.XPATH, "//button[normalize-space()='Donar']")) == 0
