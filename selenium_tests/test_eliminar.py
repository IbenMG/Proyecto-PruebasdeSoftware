# tests_selenium/test_eliminar.py
import time
import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import (
    API,
    crear_cuenta_api,
    iniciar_sesion_localstorage,
    esperar_elemento,
    esperar_clickeable,
)


def test_cancelar_y_confirmar_eliminacion_campania(driver):
    tokens = crear_cuenta_api("elim")
    res = requests.post(
        f"{API}/campanias/create/",
        headers={"Authorization": f"Bearer {tokens['access']}"},
        json={
            "titulo": f"Eliminar {int(time.time() * 1000)}",
            "descripcion": "Campaña de prueba",
            "categoria": "Comunidad",
            "meta_financiera": "100",
            "fecha_limite": "2099-12-31",
            "informacion_creador": "Equipo",
        },
        timeout=10,
    )
    assert res.status_code == 201
    campaign = res.json()

    iniciar_sesion_localstorage(driver, tokens, f"/campaigns/{campaign['id']}")

    # 1. Cancelar diálogo
    esperar_clickeable(driver, By.XPATH, "//button[normalize-space()='Eliminar campaña']").click()
    alerta = WebDriverWait(driver, 5).until(EC.alert_is_present())
    assert campaign["titulo"] in alerta.text
    alerta.dismiss()

    assert requests.get(f"{API}/campanias/{campaign['id']}/", timeout=10).status_code == 200

    # 2. Confirmar diálogo
    esperar_clickeable(driver, By.XPATH, "//button[normalize-space()='Eliminar campaña']").click()
    alerta = WebDriverWait(driver, 5).until(EC.alert_is_present())
    alerta.accept()

    WebDriverWait(driver, 10).until(EC.url_matches(r".*/campaigns/my$"))
    status = esperar_elemento(driver, By.CSS_SELECTOR, "[role='status']")
    WebDriverWait(driver, 10).until(lambda d: "Campaña eliminada correctamente." in d.find_element(By.TAG_NAME, "body").text)
    assert requests.get(f"{API}/campanias/{campaign['id']}/", timeout=10).status_code == 404
