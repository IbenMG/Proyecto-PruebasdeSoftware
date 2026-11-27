# CI/CD de CrowdStarter

El CD genera artefactos para un despliegue posterior; no despliega a producción. La configuración no demuestra por sí sola que haya ejecutado un build, llegado un webhook o entregado un mensaje Slack.

## Pipeline Jenkins actual

El [Jenkinsfile](../Jenkinsfile) requiere un agente Unix/Linux con `sh`, Git, Python 3 compatible con `requirements.txt`, `venv`, Node.js, npm, curl, Chrome y dependencias del sistema para navegador. Selenium necesita ChromeDriver compatible en PATH o acceso de Selenium Manager para resolverlo; Playwright necesita descargar Chromium. Se necesitan los plugins Jenkins correspondientes a Git, Pipeline, JUnit, timestamps y Slack. El agente debe poder usar los puertos 8000 y 5173.

1. **Checkout:** `checkout scm`.
2. **Backend:** crea `.venv-ci`, instala `requirements.txt`, usa `jenkins.sqlite3`, ejecuta `manage.py check`, pytest y cobertura mínima de 70%.
3. **Frontend:** `npm ci`, unitarias con cobertura, lint y build.
4. **E2E: Chromium:** migra SQLite, inicia Django, espera su disponibilidad e instala y ejecuta Playwright. Playwright inicia y detiene Vite.
5. **Selenium: E2E tests:** inicia Vite, espera su disponibilidad y ejecuta pytest con Chrome headless; detiene Vite al salir. Django sigue activo desde la etapa anterior. Si Playwright falla, esta etapa no se ejecuta.
6. **Post:** detiene Django; publica JUnit de `reports/*.xml` y `frontend/test-results/*.xml` y archiva reportes, cobertura backend, build y artefactos Playwright. En particular `reports/selenium.xml`, `reports/frontend-selenium.log` y `reports/selenium/` se publican cuando existen. Capturas y HTML se generan en fallos con navegador disponible, no necesariamente si este no inicia.
7. **Slack:** intenta notificar `SUCCESS`, `FAILURE` o `UNSTABLE`. Los errores de Slack se registran sin cambiar el resultado del build: comprobar la entrega por separado.

Una prueba fallida produce fallo de etapa; un reporte JUnit también puede marcar el build inestable. `allowEmptyResults` y `allowEmptyArchive` permiten ejecutar post aunque una etapa anterior no haya generado reportes; no prueban que Selenium haya corrido. La SQLite se recrea al iniciar la etapa backend, no entre suites; las pruebas usan identificadores únicos y crean datos mediante API.

## Automatización GitHub → Jenkins

Crear un job Pipeline o Multibranch conectado al repositorio y seleccionar la rama o ramas que se quiere validar y `Jenkinsfile`. Para un job Pipeline habilitar **GitHub hook trigger for GITScm polling**; para PR configurar el descubrimiento correspondiente del Multibranch y los eventos necesarios. No hay `triggers` en el Jenkinsfile: el alcance real depende del job.

En GitHub configurar **Settings → Webhooks**, URL pública HTTPS terminada en `/github-webhook/`, contenido `application/json` y eventos adecuados (push y, si corresponde, pull request). Para Jenkins local puede usarse `ngrok http 8080`; actualizar la URL si cambia. Comprobar Recent Deliveries y que el commit recibido haya iniciado el job correcto. Configurar seguridad y credenciales sin guardarlas en el repositorio.

## Slack

Instalar y configurar Slack Notification y sus credenciales en Jenkins, con acceso al canal; el canal predeterminado es `#crowdstarter-ci` y puede cambiarse con `SLACK_CHANNEL`. Verificar con builds de éxito y fallo y conservar capturas sin secretos. **Pendiente:** demostrar que la integración y ambas notificaciones funcionan en el entorno real.

## GitHub Actions

El workflow [ci.yml](../.github/workflows/ci.yml) valida push y PR hacia `develop`, `main` y `master`: backend con PostgreSQL, frontend y Playwright Chromium; conserva artefactos. No ejecuta la suite Selenium de Jenkins.

## Ejecución local

Para Selenium, requisitos y comandos reproducibles en [Entrega 3](Entrega-3.md#ejecución-local). Para Playwright, iniciar Django en `127.0.0.1:8001` con base de pruebas migrada y, desde `frontend/`:

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

Playwright inicia Vite en 5174 fuera de CI. En CI se usan 8000 y 5173. Para backend aislado: `DB_ENGINE=django.db.backends.sqlite3 DB_NAME=:memory: python -m pytest api --ds=config.settings -q`.

## Evidencias pendientes

Recopilar enlaces reales al build y logs, reportes JUnit y capturas de fallos, webhook recibido, Slack de éxito y fallo y artefactos. Ver la lista de [Entrega 3](Entrega-3.md#evidencias-pendientes). No incluir tokens ni datos privados.
