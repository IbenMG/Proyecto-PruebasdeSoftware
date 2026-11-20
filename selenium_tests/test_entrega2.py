from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from conftest import colocar_fecha
# tests_selenium/test_busqueda_y_entrega2.py
import time
import requests
from selenium.webdriver.common.by import By
from conftest import (
    API,
    sufijo_unico,
    fecha_chile,
    crear_cuenta_api,
    iniciar_sesion_localstorage,
    esperar_elemento,
    esperar_clickeable,
)


def test_busqueda_sin_tildes_ni_mayusculas_y_sin_resultados(driver):
    tokens = crear_cuenta_api("busca")
    suf = sufijo_unico()

    def crear(titulo):
        r = requests.post(
            f"{API}/campanias/create/",
            headers={"Authorization": f"Bearer {tokens['access']}"},
            json={
                "titulo": titulo,
                "descripcion": f"Descripción de {titulo}",
                "categoria": "Comunidad",
                "meta_financiera": "100",
                "fecha_limite": "2099-12-31",
                "informacion_creador": "Equipo",
            },
            timeout=10,
        )
        assert r.status_code == 201
        return r.json()

    exacta = crear(f"Árbol {suf}")
    parcial = crear(f"Plantemos Árbol {suf} juntos")

    iniciar_sesion_localstorage(driver, tokens, "/main")

    campo = esperar_elemento(driver, By.XPATH, "//label[contains(., 'Buscar campañas por nombre')]/following::input[1]")
    campo.send_keys(f"  {exacta['titulo'].replace('Á', 'A').upper()}  ")

    lista = esperar_elemento(driver, By.CSS_SELECTOR, "ul[aria-label='Resultados de búsqueda']")
    WebDriverWait(driver, 10).until(lambda d: [a.text for a in lista.find_elements(By.TAG_NAME, "a")] == [exacta["titulo"], parcial["titulo"]])
    enlaces = lista.find_elements(By.TAG_NAME, "a")
    assert [a.text for a in enlaces] == [exacta["titulo"], parcial["titulo"]]

    # Búsqueda sin coincidencias
    campo.send_keys(Keys.CONTROL, "a")
    campo.send_keys(Keys.BACKSPACE)
    campo.send_keys(f"inexistente_{exacta['id']}_{int(time.time())}")
    status = esperar_elemento(driver, By.CSS_SELECTOR, "[role='status']")
    WebDriverWait(driver, 10).until(lambda d: "No se encontraron campañas" in d.find_element(By.TAG_NAME, "body").text)


def test_hu06_checkpoints_ordenados_y_hu07_actualizaciones(driver):
    tokens = crear_cuenta_api("ent2")
    iniciar_sesion_localstorage(driver, tokens, "/main")

    # HU06: Crear campaña con checkpoints desordenados y verificar orden ascendente
    esperar_clickeable(driver, By.LINK_TEXT, "Crear campaña").click()
    titulo = f"Roadmap {int(time.time() * 1000)}"

    esperar_elemento(driver, By.XPATH, "//label[normalize-space()='Título']/following::input[1]").send_keys(titulo)
    driver.find_element(By.XPATH, "//label[normalize-space()='Descripción']/following::textarea[1]").send_keys("Proyecto con metas graduales.")
    driver.find_element(By.XPATH, "//label[normalize-space()='Categoría']/following::input[1]").send_keys("Comunidad")
    driver.find_element(By.XPATH, "//label[normalize-space()='Meta de financiamiento']/following::input[1]").send_keys("1000")
    colocar_fecha(driver, driver.find_element(By.XPATH, "//label[normalize-space()='Fecha límite']/following::input[1]"), fecha_chile(7))
    driver.find_element(By.XPATH, "//label[normalize-space()='Información del creador']/following::*[self::input or self::textarea][1]").send_keys("Equipo.")

    # Checkpoint 1 (800)
    driver.find_element(By.XPATH, "//button[contains(., 'Agregar checkpoint')]").click()
    driver.find_elements(By.XPATH, "//label[contains(., 'Título del checkpoint')]/following::input[1]")[0].send_keys("Lanzamiento")
    driver.find_elements(By.XPATH, "//label[contains(., 'Descripción del checkpoint')]/following::*[self::input or self::textarea][1]")[0].send_keys("Publicar beta.")
    driver.find_elements(By.XPATH, "//label[contains(., 'Monto objetivo')]/following::input[1]")[0].send_keys("800")

    # Checkpoint 2 (250)
    driver.find_element(By.XPATH, "//button[contains(., 'Agregar checkpoint')]").click()
    driver.find_elements(By.XPATH, "//label[contains(., 'Título del checkpoint')]/following::input[1]")[1].send_keys("Prototipo")
    driver.find_elements(By.XPATH, "//label[contains(., 'Descripción del checkpoint')]/following::*[self::input or self::textarea][1]")[1].send_keys("Terminar prototipo.")
    driver.find_elements(By.XPATH, "//label[contains(., 'Monto objetivo')]/following::input[1]")[1].send_keys("250")

    driver.find_element(By.XPATH, "//button[contains(., 'Publicar campaña')]").click()

    esperar_elemento(driver, By.XPATH, "//h2[normalize-space()='Hitos y metas graduales'] | //h3[normalize-space()='Hitos y metas graduales']")
    items = driver.find_elements(By.CSS_SELECTOR, ".checkpoint-item")
    assert len(items) == 2
    assert "Prototipo" in items[0].text and "Pendiente" in items[0].text
    assert "Lanzamiento" in items[1].text

    # HU07: Publicar actualización en el muro
    esperar_elemento(driver, By.XPATH, "//label[contains(., 'Título de la actualización')]/following::input[1]").send_keys("Primer avance")
    driver.find_element(By.XPATH, "//label[normalize-space()='Contenido']/following::textarea[1]").send_keys("El prototipo ya está listo.")
    driver.find_element(By.XPATH, "//button[contains(., 'Publicar actualización')]").click()

    esperar_elemento(driver, By.XPATH, "//*[normalize-space()='Primer avance']")
    esperar_elemento(driver, By.XPATH, "//*[normalize-space()='El prototipo ya está listo.']")
