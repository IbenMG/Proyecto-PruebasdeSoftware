# Entrega 3

## Objetivo y herramienta

Automatizar flujos críticos de interfaz e integrarlos en Jenkins, con resultados visibles y notificaciones. Se eligió Selenium WebDriver con pytest para controlar un navegador real; Playwright permanece como suite independiente de Entrega 2. La [pauta oficial](https://github.com/Pruebas-de-Software/HandsOnProject/blob/main/semestres/2026-1/entrega3.md) recomienda al menos diez pruebas E2E y permite herramientas equivalentes.

## Casos cubiertos en el código

Los tests de `selenium_tests/` incluyen casos parametrizados y algunos flujos solapados. El número de casos recolectados se puede comprobar con `python -m pytest selenium_tests --collect-only -q`; su presencia no implica que hayan pasado.

| Área | Qué se verifica |
|---|---|
| Login | Correo inválido, contraseña vacía, cuenta inexistente o credenciales incorrectas |
| Registro | Campos obligatorios, correo inválido, minoría de edad, creación, duplicados y acceso posterior |
| Sesión y permisos | Cierre de sesión, rutas protegidas y eliminación por otro usuario |
| Campañas | Crear, listar, detalle y editar; validaciones del formulario |
| Eliminación | Cancelar y confirmar; comprobación por API |
| Búsqueda | Sin distinguir tildes ni mayúsculas, sin resultados y apertura de detalle |
| Donación | Donación simulada de otro usuario |
| Entrega 2 | Orden de checkpoints y muro de actualizaciones |

Algunos preparativos usan solicitudes a la API y tokens en localStorage; no todos los pasos de cada caso ocurren en la interfaz. No se prueban pagos reales, porque la aplicación solo simula donaciones.

## Ejecución local

Requisitos: Python compatible con `requirements.txt`, Node.js/npm, Chrome instalado, ChromeDriver compatible en PATH o Selenium Manager con acceso para obtenerlo, y dependencias gráficas de Chrome. Se muestra Linux/macOS con shell POSIX; Windows requiere activar `.venv\\Scripts\\Activate.ps1` y adaptar `export` a `$env:NOMBRE = "valor"`. Usar una base exclusiva para pruebas: se crean usuarios y campañas con identificadores únicos y no se eliminan automáticamente. No usar datos reales.

Terminal 1, desde la raíz:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export DB_ENGINE=django.db.backends.sqlite3
export DB_NAME="$PWD/selenium-local.sqlite3"
python manage.py migrate --noinput
python manage.py runserver 127.0.0.1:8001
```

Terminal 2, desde la raíz:

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Terminal 3, desde la raíz, con ambos servidores disponibles:

```bash
source .venv/bin/activate
export BASE_URL=http://127.0.0.1:5174
export TEST_API_URL=http://127.0.0.1:8001/api
export SELENIUM_BROWSER=chrome HEADLESS=1
mkdir -p reports
python -m pytest selenium_tests -q --junitxml=reports/selenium.xml
```

Detener los servidores con Ctrl+C. La configuración Vite por defecto usa los puertos indicados; `CI=true` cambia a 5173/8000. `BASE_URL` y `TEST_API_URL` deben apuntar al frontend y API realmente disponibles. `HEADLESS=0` permite ver el navegador; `SELENIUM_BROWSER=edge` selecciona Edge si está instalado.

**Nota SQLite:** `selenium-local.sqlite3` está ignorada. `e2e-local.sqlite3` también figura en `.gitignore`, pero ya está versionada: Git seguirá rastreándola. No modificarla ni eliminarla del índice sin decisión explícita.

## Jenkins, webhook y reportes

La etapa `Selenium: E2E tests` de [Jenkinsfile](../Jenkinsfile) usa `HEADLESS=1`, Chrome, `BASE_URL` y `TEST_API_URL`; inicia Vite, ejecuta pytest y detiene Vite al salir. La etapa previa inicia Django y migra SQLite; si falla, Selenium no corre. Jenkins publica `reports/selenium.xml` como JUnit y archiva el log Vite y, si se generan, capturas PNG y HTML en `reports/selenium/`. La base de CI se recrea por build, no entre pruebas; los datos se identifican con sufijos únicos.

El agente requiere Linux/Unix, Python con venv, Node/npm, curl, Chrome y un ChromeDriver compatible o Selenium Manager con acceso de descarga, además de las dependencias de sistema del navegador y los plugins Jenkins. Playwright necesita su propio Chromium. Ver [CI/CD](CI-CD.md) para etapas, artefactos y requisitos completos.

El webhook de GitHub debe apuntar al Jenkins accesible por HTTPS (`/github-webhook/`) y el job debe configurarse para escuchar las ramas y eventos deseados. Un push o PR solo dispara el job si la configuración externa lo admite. Revisar Recent Deliveries y el build asociado; **configuración y ejecución automática pendientes de verificar**.

## Slack

El pipeline intenta notificar éxito, fallo o inestabilidad mediante el plugin Slack Notification. Se deben configurar credenciales y canal en Jenkins; los errores de envío se registran sin alterar el resultado. **Pendiente:** conservar pruebas reales de notificaciones de éxito y fallo.

## Problemas y soluciones

| Problema o riesgo | Solución aplicada o propuesta |
|---|---|
| El log de Vite se redirigía a `frontend/reports/`, carpeta que no se creaba | Iniciar desde la raíz y guardar en `reports/`; limpiar el proceso con `trap`. |
| Faltan paquetes Python al instalar desde requirements | Declarar Selenium y requests en `requirements.txt`. |
| El navegador o driver no inicia | Instalar Chrome y dependencias del sistema; comprobar ChromeDriver o acceso de Selenium Manager. |
| El webhook no llega o cambia el túnel | Verificar URL pública, eventos, job y Recent Deliveries; actualizar URL si cambia ngrok. |
| Slack no recibe mensajes | Revisar plugin, credenciales y canal; comprobar el log y probar la integración. |
| Los tests dejan datos | Usar una SQLite dedicada y recrearla solo cuando corresponda; no usar datos de producción. |

## Evidencias pendientes

- [ ] Ejecutar la suite y registrar número de casos y resultado real.
- [ ] Enlace a build Jenkins real, log completo y JUnit de Selenium.
- [ ] Evidencia de un fallo controlado, captura/HTML si se generan y resultado del build.
- [ ] Evidencia de push/PR, entrega del webhook y build asociado.
- [ ] Capturas reales de Slack para éxito y fallo, sin credenciales.
- [ ] Enlace al video real de Entrega 3, con alcance, herramienta, ejecución, pipeline y problemas/soluciones.
- [ ] Publicar o enlazar esta documentación en una página Wiki titulada «Entrega 3», según la pauta.
- [ ] Verificar y documentar el tablero Kanban, tareas priorizadas y estimaciones, sin asumir su estado.
