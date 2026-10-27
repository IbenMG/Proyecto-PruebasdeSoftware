# CI/CD de CrowdStarter

## Objetivo

La Entrega 2 incorpora integración continua para que cada cambio sea validado de forma reproducible y un flujo de entrega continua basado en artefactos. El pipeline comprueba el backend, el frontend y los flujos E2E antes de dejar disponible el resultado del build.

El alcance acordado para esta entrega no incluye publicar la aplicación en una plataforma cloud. El “CD” genera y conserva los artefactos listos para un despliegue posterior: `frontend/dist/`, reportes de pruebas y reportes de cobertura.

## Arquitectura

```text
GitHub push/PR
      │
      ├── GitHub Actions (.github/workflows/ci.yml)
      │       ├── Backend + PostgreSQL + pytest + cobertura
      │       ├── Frontend + unitarias + lint + build
      │       └── Django + Vite + Playwright Chromium
      │
      └── Webhook GitHub → Jenkins (Jenkinsfile)
              ├── Las mismas etapas de validación
              ├── Artefactos y resultados JUnit
              └── Notificación opcional a Slack
```

En GitHub Actions los trabajos backend y E2E utilizan PostgreSQL 16 como servicio efímero. Jenkins utiliza SQLite para que el pipeline también pueda ejecutarse en un agente local sin administrar un servidor de base de datos; la configuración de producción continúa usando PostgreSQL.

## GitHub Actions

El workflow canónico se encuentra en `.github/workflows/ci.yml` y se ejecuta en:

- `push` a `develop`, `main` o `master`.
- Pull requests dirigidos a esas ramas.

### Etapas

1. **Backend:** instalación de dependencias, `manage.py check`, migraciones,  pruebas de `api/` y cobertura con umbral mínimo de 70%.
2. **Frontend:** `npm ci`, pruebas unitarias con cobertura, ESLint y build de Vite.
3. **E2E:** levantamiento de Django, servidor PostgreSQL temporal y Playwright con Chromium.

Cada job conserva reportes como artefactos de GitHub Actions:

- `backend-reports`: JUnit, XML y HTML de cobertura.
- `frontend-reports`: cobertura de utilidades y `dist/`.
- `e2e-reports`: reporte HTML, JUnit, resultados de Playwright y log de Django.

El estado verde o rojo del workflow queda asociado al commit o pull request. No se deben incluir tokens, contraseñas ni URLs privadas en el workflow.

## Jenkins

El pipeline declarativo está en `Jenkinsfile`. Está preparado para agentes Linux con:

- Java y Jenkins.
- Python 3, `python3-venv`, `curl` y dependencias de Chromium.
- Node.js y npm.
- Git.

El pipeline ejecuta:

1. Checkout del repositorio.
2. Entorno virtual Python y pruebas backend con cobertura mínima de 70%.
3. Pruebas unitarias frontend, cobertura, lint y build.
4. Migraciones, Django, Vite y pruebas E2E con Chromium.
5. Publicación de resultados JUnit y artefactos.
6. Notificación de éxito, fallo o estado inestable a Slack si el plugin está configurado.

### Crear el job

1. En Jenkins crear un job **Pipeline** o un **Multibranch Pipeline**.
2. Conectar el repositorio GitHub mediante HTTPS o SSH.
3. Seleccionar `Jenkinsfile` desde el repositorio.
4. En un job Pipeline habilitar **GitHub hook trigger for GITScm polling**.
5. Ejecutar primero un build manual para comprobar que el agente tenga las herramientas requeridas.

El pipeline usa SQLite en el archivo temporal `${WORKSPACE}/jenkins.sqlite3` y no modifica la base de datos local de desarrollo.

## GitHub → Jenkins mediante webhook

Si Jenkins es accesible desde Internet:

1. En GitHub abrir **Settings → Webhooks → Add webhook**.
2. Usar como URL:

   ```text
   https://JENKINS_PUBLICO/github-webhook/
   ```

3. Seleccionar `application/json`.
4. Activar eventos de `push` y pull requests, o seleccionar “Just the push event” si el job solo valida ramas.
5. Guardar el webhook y revisar la entrega de prueba en GitHub.

Para un Jenkins local se puede usar ngrok:

```bash
ngrok http 8080
```

Luego se utiliza la URL HTTPS entregada por ngrok, agregando `/github-webhook/`. La URL cambia al reiniciar ngrok en el plan gratuito, por lo que el webhook debe actualizarse cuando corresponda.

## Jenkins → Slack

1. Instalar en Jenkins el plugin **Slack Notification**.
2. Crear un Incoming Webhook en el workspace de Slack.
3. Configurar el workspace, el token o credencial y el canal `#crowdstarter-ci` en **Manage Jenkins → System → Slack Notifications**.
4. Si se utiliza un canal distinto, definir la variable global `SLACK_CHANNEL`.
5. Ejecutar un build exitoso y otro con una prueba intencionalmente fallida para comprobar las notificaciones.

El `Jenkinsfile` captura errores de configuración de Slack para que una notificación no oculte el resultado real de las pruebas. El webhook y sus tokens nunca deben guardarse en el repositorio.

## Cobertura

### Backend

Se utiliza `pytest-cov` con la configuración de `.coveragerc`, que mide el código de producción de `api/` y excluye migraciones y archivos de pruebas:

```bash
python -m pytest api --ds=config.settings -q \
  --cov=api \
  --cov-report=term-missing \
  --cov-report=xml:coverage.xml \
  --cov-report=html:htmlcov \
  --cov-fail-under=70
```

### Frontend

Las utilidades aisladas se ejecutan con `c8` y un umbral de 80% en líneas, funciones y sentencias, y 70% en ramas:

```bash
cd frontend
npm run test:unit:coverage
```

La cobertura se limita a `src/utils/`, que es el código cubierto por las pruebas unitarias del Node.js Test Runner. Los componentes React se verifican mediante lint, build y Playwright E2E.

## Ejecución local equivalente

Backend:

```bash
DB_ENGINE=sqlite DB_NAME=:memory: python -m pytest api --ds=config.settings -q
```

Frontend:

```bash
cd frontend
npm ci
npm run test:unit
npm run test:unit:coverage
npm run lint
npm run build
```

Para E2E se debe iniciar Django en `8000` y ejecutar desde `frontend`:

```bash
npx playwright install chromium
npm run test:e2e
```

El servidor Vite se inicia automáticamente por la configuración de Playwright. Django debe estar disponible antes de iniciar la suite.

## Evidencias para la entrega

Se recomienda conservar:

- Captura del workflow verde en GitHub.
- Log de Jenkins con las etapas completas.
- Reporte HTML de Playwright.
- Reporte de cobertura backend y frontend.
- Captura de la entrega exitosa del webhook GitHub.
- Captura de la notificación de Slack.
- Historial de un build fallido y su corrección.

## Problemas conocidos y soluciones

| Problema | Solución |
|---|---|
| Jenkins no recibe el webhook | Verificar que la URL sea pública, que termine en `/github-webhook/` y revisar la entrega en GitHub. |
| Playwright no inicia Chromium | Ejecutar `npx playwright install --with-deps chromium` en el agente Linux. |
| No llega Slack | Verificar el plugin, workspace, canal y credencial; la ejecución del pipeline no depende de la notificación. |
| Cobertura bajo el umbral | Revisar el reporte HTML y agregar pruebas antes de reducir el umbral. |
| Jenkins no puede crear el entorno Python | Instalar `python3-venv` y usar un agente Linux con permisos de ejecución. |
