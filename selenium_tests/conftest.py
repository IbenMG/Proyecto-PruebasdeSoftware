import os
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest
import requests
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

IS_CI = os.getenv('CI', '').lower() in ('true', '1')
API = os.getenv('TEST_API_URL', 'http://127.0.0.1:8000/api' if IS_CI else 'http://127.0.0.1:8001/api').rstrip('/')
BASE_URL = os.getenv('BASE_URL', 'http://127.0.0.1:5173' if IS_CI else 'http://127.0.0.1:5174').rstrip('/')


def sufijo_unico():
    return uuid.uuid4().hex[:16]


def fecha_chile(offset_dias=0):
    return (datetime.now(ZoneInfo('America/Santiago')) + timedelta(days=offset_dias)).strftime('%Y-%m-%d')


def crear_cuenta_api(prefijo='sel'):
    suffix = sufijo_unico()
    data = {
        'username': f'{prefijo}_{suffix}',
        'email': f'{prefijo}_{suffix}@example.com',
        'password': 'ClaveSelenium-E2E!',
        'fecha_nacimiento': '2000-01-15',
    }
    response = requests.post(f'{API}/registro/', json=data, timeout=20)
    assert response.status_code == 201, f'Registro: {response.status_code} {response.text}'
    response = requests.post(f'{API}/token/', json={
        'email': data['email'], 'password': data['password'],
    }, timeout=20)
    assert response.status_code == 200, f'Login: {response.status_code} {response.text}'
    return {**data, **response.json()}


def iniciar_sesion_localstorage(driver, tokens, ruta='/main'):
    driver.get(f'{BASE_URL}/')
    driver.execute_script(
        "localStorage.setItem('access_token', arguments[0]); localStorage.setItem('refresh_token', arguments[1]);",
        tokens['access'], tokens['refresh'],
    )
    driver.get(f'{BASE_URL}{ruta}')


def esperar_elemento(driver, by, selector, timeout=15):
    return WebDriverWait(driver, timeout).until(EC.visibility_of_element_located((by, selector)))


def esperar_clickeable(driver, by, selector, timeout=15):
    return WebDriverWait(driver, timeout).until(EC.element_to_be_clickable((by, selector)))


@pytest.fixture
def base_url():
    return BASE_URL


@pytest.fixture
def account():
    return crear_cuenta_api


@pytest.fixture
def api():
    def call(method, path, data=None, token=None):
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        response = requests.request(method, f'{API}/{path.lstrip("/")}',
                                    json=data, headers=headers, timeout=20)
        try:
            body = response.json() if response.content else None
        except ValueError:
            body = response.text
        return response.status_code, body
    return call


@pytest.fixture
def campaign(api, account):
    owner = account()
    status, data = api('POST', 'campanias/create/', {
        'titulo': f'Campana Selenium {sufijo_unico()}',
        'descripcion': 'Proyecto de prueba Selenium.',
        'categoria': 'Comunidad',
        'meta_financiera': '1000',
        'fecha_limite': '2099-12-31',
        'informacion_creador': 'Equipo de pruebas.',
    }, token=owner['access'])
    assert status == 201, f'Crear campana: {status} {data}'
    return owner, data


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    setattr(item, f'rep_{report.when}', report)


@pytest.fixture
def driver(request):
    name = os.getenv('SELENIUM_BROWSER', 'edge').lower()
    if name == 'edge':
        options = webdriver.EdgeOptions()
        constructor = webdriver.Edge
    elif name == 'chrome':
        options = webdriver.ChromeOptions()
        constructor = webdriver.Chrome
    else:
        raise ValueError('SELENIUM_BROWSER debe ser edge o chrome')
    if os.getenv('HEADLESS', '1') != '0':
        options.add_argument('--headless=new')
    options.add_argument('--window-size=1440,1000')
    browser = constructor(options=options)
    browser.set_page_load_timeout(30)
    try:
        yield browser
    finally:
        failed = any(getattr(request.node, f'rep_{phase}', None)
                     and getattr(request.node, f'rep_{phase}').failed
                     for phase in ('setup', 'call'))
        if failed:
            folder = Path(request.config.rootpath) / 'reports' / 'selenium'
            folder.mkdir(parents=True, exist_ok=True)
            name = re.sub(r'[^a-zA-Z0-9_-]', '_', request.node.nodeid)
            try:
                browser.save_screenshot(str(folder / f'{name}.png'))
                (folder / f'{name}.html').write_text(browser.page_source, encoding='utf-8')
            except Exception as error:
                print(f'No se pudo guardar evidencia: {error}')
        browser.quit()


def colocar_fecha(driver, element, value):
    driver.execute_script("""
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(arguments[0], arguments[1]);
        arguments[0].dispatchEvent(new Event('input', {bubbles: true}));
        arguments[0].dispatchEvent(new Event('change', {bubbles: true}));
    """, element, value)
