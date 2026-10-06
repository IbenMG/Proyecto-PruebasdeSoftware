import { test, expect } from '@playwright/test';

async function abrirRegistro(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear una cuenta' }).click();
  await expect(
    page.getByRole('heading', { name: 'Crear cuenta' })
  ).toBeVisible();
}

async function completarRegistro(page, datos) {
  await page.getByLabel('Nombre de usuario').fill(datos.username);
  await page.getByLabel('Correo electrónico').fill(datos.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(datos.password);
  await page.getByLabel('Fecha de nacimiento').fill(datos.fecha);
}

function cuentaNueva() {
  const sufijo = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    username: `e2e_${sufijo}`,
    email: `e2e_${sufijo}@example.com`,
    password: 'PruebaE2E-HU01!',
    fecha: '2000-01-15',
  };
}

test('los campos vacíos impiden el envío', async ({ page }) => {
  await abrirRegistro(page);
  await page.getByRole('button', { name: 'Registrarse', exact: true }).click();

  const valido = await page.locator('form').evaluate(
    (formulario) => formulario.checkValidity()
  );

  expect(valido).toBe(false);
  await expect(
    page.getByRole('heading', { name: 'Crear cuenta' })
  ).toBeVisible();
});

test('un correo inválido impide el envío', async ({ page }) => {
  await abrirRegistro(page);
  await completarRegistro(page, {
    ...cuentaNueva(),
    email: 'correo-invalido',
  });

  await page.getByRole('button', { name: 'Registrarse', exact: true }).click();

  const valido = await page.getByLabel('Correo electrónico').evaluate(
    (input) => input.checkValidity()
  );

  expect(valido).toBe(false);
});

test('un menor recibe el mensaje sin enviar el registro', async ({ page }) => {
  let solicitudes = 0;

  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/registro/'
    ) {
      solicitudes += 1;
    }
  });

  await abrirRegistro(page);

  const anio = new Date().getFullYear() - 10;

  await completarRegistro(page, {
    ...cuentaNueva(),
    fecha: `${anio}-01-15`,
  });

  await page.getByRole('button', { name: 'Registrarse', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'Debes ser mayor de 18 años para registrarte'
  );
  expect(solicitudes).toBe(0);
});

test('registro, duplicados e inicio de sesión', async ({ page }) => {
  const datos = cuentaNueva();

  await abrirRegistro(page);
  await completarRegistro(page, datos);

  const respuestaRegistro = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/registro/' &&
      response.request().method() === 'POST'
  );

  await page.getByRole('button', { name: 'Registrarse', exact: true }).click();

  expect((await respuestaRegistro).status()).toBe(201);

  await expect(
    page.getByRole('heading', { name: 'Iniciar sesión' })
  ).toBeVisible();

  await expect(page.getByRole('status')).toHaveText(
    'Cuenta creada correctamente. Ya puedes iniciar sesión.'
  );

  // Intenta registrar nuevamente la misma cuenta.
  await page.getByRole('button', { name: 'Crear una cuenta' }).click();
  await completarRegistro(page, datos);
  await page.getByRole('button', { name: 'Registrarse', exact: true }).click();

  await expect(page.getByText(
    'Este nombre de usuario ya está en uso.', { exact: true }
  )).toBeVisible();

  await expect(page.getByText(
    'Este correo electrónico ya está en uso.', { exact: true }
  )).toBeVisible();

  await page.getByRole('button', { name: 'Ya tengo una cuenta' }).click();

  // La contraseña incorrecta debe impedir el acceso.
  await page.getByLabel('Correo electrónico', { exact: true }).fill(datos.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('ClaveIncorrecta');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText(
    'Correo o contraseña incorrectos'
  );

  // La contraseña correcta debe permitirlo.
  await page.getByLabel('Contraseña', { exact: true }).fill(datos.password);
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();

  await expect(
    page.getByRole('heading', { name: 'El próximo gran proyecto puede empezar contigo.' })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();

  await expect(
    page.getByRole('heading', { name: 'Iniciar sesión' })
  ).toBeVisible();
});