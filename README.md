# CrowdStarter

Plataforma de crowdfunding para INF331 — Pruebas de Software, Universidad Técnica Federico Santa María. Permite registrar usuarios, publicar y descubrir campañas, y realizar donaciones simuladas; no procesa pagos reales.

## Las tres entregas

1. **Entrega 1:** MVP con Django REST Framework, React y PostgreSQL; registro, login, CRUD de campañas, búsqueda, permisos y pruebas automatizadas.
2. **Entrega 2:** hitos y actualizaciones de campañas, pruebas unitarias y de integración, E2E con **Playwright** y CI/CD con GitHub Actions y Jenkins. El CD genera artefactos; no despliega a producción.
3. **Entrega 3:** suite adicional de interfaz con **Selenium y pytest**, integrada como etapa separada de Jenkins. La ejecución automática, los resultados y las notificaciones requieren evidencia real; véase [Entrega 3](docs/Entrega-3.md).

## Tecnologías y pruebas

Backend: Python, Django REST Framework y JWT. Frontend: React y Vite. La configuración habitual utiliza PostgreSQL; Jenkins usa SQLite aislada.

| Nivel | Herramienta | Alcance |
|---|---|---|
| Unitarias e integración | pytest, pytest-django, Node.js Test Runner | API, validaciones, permisos y utilidades |
| E2E de Entrega 2 | Playwright | Flujos en Chromium; `frontend/tests/` |
| E2E de Entrega 3 | Selenium + pytest | Flujos de navegador; `selenium_tests/` |

El [pipeline Jenkins](Jenkinsfile) ejecuta ambas suites E2E en etapas distintas y publica resultados y artefactos cuando están disponibles. Su configuración, webhook y Slack se describen en [CI/CD](docs/CI-CD.md). GitHub Actions mantiene su propia suite Playwright.

## Ejecución

Para instalar las dependencias Python, desde la raíz:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

En Windows, activar con `.\.venv\Scripts\Activate.ps1`. Para el frontend, ejecutar `npm ci` en `frontend/`. La aplicación necesita una base configurada mediante `DB_ENGINE` y `DB_NAME`, migraciones y servidores Django y Vite. Para una ejecución aislada de Selenium con SQLite, puertos y comandos completos, consultar [Entrega 3: ejecución local](docs/Entrega-3.md#ejecución-local).

Las pruebas generan datos: usar solo una base dedicada a pruebas. Para Playwright, instalar Chromium con `npx playwright install chromium` y consultar [CI/CD](docs/CI-CD.md#ejecución-local).

## Documentación

- [Entrega 3: Selenium, ejecución y evidencias pendientes](docs/Entrega-3.md).
- [CI/CD](docs/CI-CD.md).
- [Pruebas unitarias](docs/pruebas-unitarias.md).
- [Creación de campañas](docs/HU03.md), [mis campañas](docs/HU04.md), [búsqueda](docs/HU05.md) y [eliminación](docs/Eliminar-campanias.md).
- [Decisiones de usabilidad](docs/usabilidad-interfaz.md).
- [Repositorio](https://github.com/IbenMG/Proyecto-PruebasdeSoftware), [Wiki](https://github.com/IbenMG/Proyecto-PruebasdeSoftware/wiki) y [releases](https://github.com/IbenMG/Proyecto-PruebasdeSoftware/releases).
- Video Entrega 1: [ver video](https://usmcl-my.sharepoint.com/:v:/g/personal/iben_munoz_usm_cl/IQB4rWI5bBhDS6ayKutz5tzoAXQ0Ta8v61SwzMZj1dAdJJo?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcFBsYXRmb3JtIjoiV2ViIiwicmVmZXJyYWxWaWV3IjoiTXlGaWxlc0xpbmtDb3B5In19&e=TPSdtb).
- Video Entrega 2: [ver video](https://drive.google.com/file/d/1DhhoYorLBMYnuGxOsrG8Hvt5eUWF34OX/view?usp=sharing).
- Video Entrega 3: [ver video](https://usmcl-my.sharepoint.com/:v:/g/personal/iben_munoz_usm_cl/IQCsA74oQ_WnTqkhFPBY0xW8AdaGesMtBvcS29lMEUTklSg?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=2HMDB1)

