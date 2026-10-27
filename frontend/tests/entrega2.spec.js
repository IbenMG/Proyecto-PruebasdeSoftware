import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api';
const fechaChile = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(Date.now() + 7 * 86400000));

async function cuenta(request, prefijo = 'entrega2') {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const datos = {
    username: `${prefijo}_${suffix}`,
    email: `${prefijo}_${suffix}@example.com`,
    password: 'ClaveEntrega2-E2E!',
    fecha_nacimiento: '2000-01-15',
  };
  expect((await request.post(`${API}/registro/`, { data: datos })).status()).toBe(201);
  const login = await request.post(`${API}/token/`, {
    data: { email: datos.email, password: datos.password },
  });
  expect(login.status()).toBe(200);
  return login.json();
}

async function iniciarSesion(page, request) {
  const tokens = await cuenta(request);
  await page.addInitScript(({ access, refresh }) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }, tokens);
  await page.goto('/main');
  return tokens;
}

function datosCampania(titulo) {
  return {
    titulo,
    descripcion: 'Proyecto comunitario para validar la Entrega 2.',
    categoria: 'Comunidad',
    meta_financiera: '1000',
    fecha_limite: fechaChile(),
    informacion_creador: 'Equipo de prueba.',
  };
}

test('HU06: crear campaña con checkpoints ordenados y estados pendientes', async ({ page, request }) => {
  await iniciarSesion(page, request);
  await page.getByRole('link', { name: 'Crear campaña', exact: true }).click();

  await page.getByLabel('Título', { exact: true }).fill(`Roadmap ${Date.now()}`);
  await page.getByLabel('Descripción', { exact: true }).fill('Proyecto con metas graduales.');
  await page.getByLabel('Categoría', { exact: true }).fill('Comunidad');
  await page.getByLabel('Meta de financiamiento', { exact: true }).fill('1000');
  await page.getByLabel('Fecha límite', { exact: true }).fill(fechaChile());
  await page.getByLabel('Información del creador', { exact: true }).fill('Equipo de prueba.');

  await page.getByRole('button', { name: 'Agregar checkpoint' }).click();
  await page.getByLabel('Título del checkpoint').nth(0).fill('Lanzamiento');
  await page.getByLabel('Descripción del checkpoint').nth(0).fill('Publicar la versión beta.');
  await page.getByLabel('Monto objetivo').nth(0).fill('800');

  await page.getByRole('button', { name: 'Agregar checkpoint' }).click();
  await page.getByLabel('Título del checkpoint').nth(1).fill('Prototipo');
  await page.getByLabel('Descripción del checkpoint').nth(1).fill('Terminar el prototipo.');
  await page.getByLabel('Monto objetivo').nth(1).fill('250');

  await page.getByRole('button', { name: 'Publicar campaña' }).click();
  await expect(page.getByRole('heading', { name: 'Hitos y metas graduales', exact: true })).toBeVisible();
  await expect(page.locator('.checkpoint-item')).toHaveCount(2);
  await expect(page.locator('.checkpoint-item').nth(0)).toContainText('Prototipo');
  await expect(page.locator('.checkpoint-item').nth(0)).toContainText('Pendiente');
  await expect(page.locator('.checkpoint-item').nth(1)).toContainText('Lanzamiento');
});

test('HU07: propietario publica y visitante consulta actualizaciones', async ({ page, request, browser }) => {
  const tokens = await iniciarSesion(page, request);
  const titulo = `Actualizaciones ${Date.now()}`;
  const campaignResponse = await request.post(`${API}/campanias/create/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
    data: datosCampania(titulo),
  });
  expect(campaignResponse.status()).toBe(201);
  const campaign = await campaignResponse.json();
  await page.goto(`/campaigns/${campaign.id}`);

  await page.getByLabel('Título de la actualización').fill('Primer avance');
  await page.getByLabel('Contenido').fill('El prototipo ya está listo para revisión.');
  await page.getByRole('button', { name: 'Publicar actualización' }).click();
  await expect(page.getByRole('heading', { name: 'Primer avance', exact: true })).toBeVisible();
  await expect(page.getByText('El prototipo ya está listo para revisión.', { exact: true })).toBeVisible();

  const otro = await cuenta(request, 'visitante');
  const prohibida = await request.post(`${API}/campanias/${campaign.id}/actualizaciones/`, {
    headers: { Authorization: `Bearer ${otro.access}` },
    data: { titulo: 'Intento ajeno', contenido: 'No debe publicarse.' },
  });
  expect(prohibida.status()).toBe(403);

  const publicoContext = await browser.newContext();
  try {
    const publico = await publicoContext.newPage();
    await publico.goto(`/campaigns/${campaign.id}`);
    await expect(publico.getByRole('heading', { name: 'Primer avance', exact: true })).toBeVisible();
    await expect(publico.getByRole('button', { name: 'Publicar actualización' })).toHaveCount(0);
  } finally {
    await publicoContext.close();
  }
});
