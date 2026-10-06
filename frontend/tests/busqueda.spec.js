import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api';
let tokens;
let exacta;
let parcial;

test.beforeAll(async ({ request }) => {
  const sufijo = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const datos = { username: `busca_${sufijo}`, email: `busca_${sufijo}@example.com`,
    password: 'ClaveBusqueda-HU05!', fecha_nacimiento: '2000-01-15' };
  expect((await request.post(`${API}/registro/`, { data: datos })).status()).toBe(201);
  const login = await request.post(`${API}/token/`, { data: { email: datos.email, password: datos.password } });
  expect(login.status()).toBe(200);
  tokens = await login.json();
  const crear = async titulo => {
    const response = await request.post(`${API}/campanias/create/`, {
      headers: { Authorization: `Bearer ${tokens.access}` },
      data: { titulo, descripcion: `Descripción de ${titulo}`, categoria: 'Comunidad',
        meta_financiera: '100', fecha_limite: '2099-12-31', informacion_creador: 'Equipo de prueba' },
    });
    expect(response.status()).toBe(201);
    return response.json();
  };
  // La coincidencia parcial se crea después para detectar un orden incorrecto por ID.
  exacta = await crear(`Árbol ${sufijo}`);
  parcial = await crear(`Plantemos Árbol ${sufijo} juntos`);
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(data => {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
  }, tokens);
  await page.goto('/main');
});

test('HU05 CA1 y CA2: sugerencias por nombre y apertura del detalle', async ({ page }) => {
  await page.getByLabel('Buscar campañas por nombre').fill(`  ${exacta.titulo.replace('Á', 'A').toUpperCase()}  `);
  const lista = page.getByRole('list', { name: 'Resultados de búsqueda' });
  await expect(lista.getByRole('link')).toHaveText([exacta.titulo, parcial.titulo]);
  await lista.getByRole('link', { name: exacta.titulo, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/campaigns/${exacta.id}$`));
  await expect(page.getByRole('heading', { name: exacta.titulo, exact: true })).toBeVisible();
  await expect(page.getByText(exacta.descripcion, { exact: true })).toBeVisible();
});

test('consulta vacía y sin coincidencias', async ({ page }) => {
  const campo = page.getByLabel('Buscar campañas por nombre');
  await expect(page.getByRole('list', { name: 'Resultados de búsqueda' })).toHaveCount(0);
  await campo.fill(`inexistente_${exacta.id}_${Date.now()}`);
  await expect(page.getByRole('status')).toHaveText('No se encontraron campañas');
  await campo.fill(exacta.titulo);
  await expect(page.getByRole('list', { name: 'Resultados de búsqueda' })).toBeVisible();
  await campo.fill('   ');
  await expect(page.getByRole('list', { name: 'Resultados de búsqueda' })).toHaveCount(0);
});

test('un fallo al cargar no se presenta como búsqueda sin resultados', async ({ page }) => {
  await page.route('**/api/campanias/', route => route.fulfill({ status: 500,
    contentType: 'application/json', body: '{}' }));
  await page.reload();
  await page.getByLabel('Buscar campañas por nombre').fill('Árbol');
  await expect(page.getByRole('alert')).toContainText('No se pudieron cargar las campañas');
  await expect(page.getByText('No se encontraron campañas', { exact: true })).toHaveCount(0);
});
