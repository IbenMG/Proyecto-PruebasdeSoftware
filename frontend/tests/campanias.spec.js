import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api';
const fechaChile = (offset = 0) => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(Date.now() + offset * 86400000));

async function cuenta(request) {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const datos = {
    username: `camp_${suffix}`, email: `camp_${suffix}@example.com`,
    password: 'ClaveCampania-HU03!', fecha_nacimiento: '2000-01-15',
  };
  const registro = await request.post(`${API}/registro/`, { data: datos });
  expect(registro.status()).toBe(201);
  const login = await request.post(`${API}/token/`, {
    data: { email: datos.email, password: datos.password },
  });
  expect(login.status()).toBe(200);
  return login.json();
}

async function sesion(page, request) {
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
    titulo, descripcion: 'Proyecto comunitario de prueba.', categoria: 'Comunidad',
    meta_financiera: '100', fecha_limite: fechaChile(7), informacion_creador: 'Equipo local.',
  };
}

async function completar(page, datos) {
  await page.getByLabel('Título', { exact: true }).fill(datos.titulo);
  await page.getByLabel('Descripción', { exact: true }).fill(datos.descripcion);
  await page.getByLabel('Categoría', { exact: true }).fill(datos.categoria);
  await page.getByLabel('Meta de financiamiento', { exact: true }).fill(datos.meta_financiera);
  await page.getByLabel('Fecha límite', { exact: true }).fill(datos.fecha_limite);
  await page.getByLabel('Información del creador', { exact: true }).fill(datos.informacion_creador);
}

test('crear sin imagen, publicar detalle público y editar', async ({ page, request, browser }) => {
  await sesion(page, request);
  await page.getByRole('link', { name: 'Crear campaña', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Crear campaña', exact: true })).toBeVisible();
  const titulo = `Huerto ${Date.now()}`;
  await completar(page, datosCampania(titulo));
  await page.getByRole('button', { name: 'Publicar campaña' }).click();
  await expect(page.getByRole('status')).toHaveText('Campaña creada exitosamente');
  await expect(page).toHaveURL(/\/campaigns\/\d+$/);
  await expect(page.getByRole('heading', { name: titulo, exact: true })).toBeVisible();
  await expect(page.locator('.progress-header')).toContainText('0.0%');

  const contextoPublico = await browser.newContext();
  try {
    const publico = await contextoPublico.newPage();
    await publico.goto(page.url());
    await expect(publico.getByRole('heading', { name: titulo, exact: true })).toBeVisible();
    await expect(publico.getByRole('link', { name: 'Editar campaña' })).toHaveCount(0);
  } finally {
    await contextoPublico.close();
  }

  await page.getByRole('link', { name: 'Editar campaña' }).click();
  await page.getByLabel('Título', { exact: true }).fill(`${titulo} actualizado`);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('status')).toHaveText('Campaña actualizada exitosamente');
  await expect(page.getByRole('heading', { name: `${titulo} actualizado`, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ir al inicio' }).click();
  await page.getByRole('link', { name: 'Ver mis campañas' }).click();
  await expect(page.getByRole('heading', { name: `${titulo} actualizado`, exact: true })).toBeVisible();
});

test('campos vacíos, meta y fecha inválidas bloquean el envío', async ({ page, request }) => {
  await sesion(page, request);
  await page.getByRole('link', { name: 'Crear campaña', exact: true }).click();
  let publicaciones = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/campanias/create/') publicaciones += 1;
  });
  await page.getByRole('button', { name: 'Publicar campaña' }).click();
  await expect(page.getByText('Campo obligatorio.', { exact: true })).toHaveCount(6);
  await completar(page, { ...datosCampania('Inválida'), meta_financiera: '0', fecha_limite: fechaChile(-1) });
  await page.getByRole('button', { name: 'Publicar campaña' }).click();
  await expect(page.getByText('La meta de financiamiento debe ser mayor que cero.', { exact: true })).toBeVisible();
  await expect(page.getByText('La fecha límite no puede ser anterior al día actual.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Meta de financiamiento')).toHaveAttribute('aria-invalid', 'true');
  expect(publicaciones).toBe(0);
});

test('HU04: listar todas las campañas propias y abrir su detalle', async ({ page, request }) => {
  const tokens = await sesion(page, request);
  const otro = await cuenta(request);
  const sufijo = Date.now();
  const propias = [];
  const ajena = `Ajena ${sufijo}`;
  for (const [titulo, token] of [
    [`Primera propia ${sufijo}`, tokens.access],
    [`Segunda propia ${sufijo}`, tokens.access],
    [ajena, otro.access],
  ]) {
    const datos = { ...datosCampania(titulo), descripcion: `Descripción de ${titulo}` };
    const response = await request.post(`${API}/campanias/create/`, {
      headers: { Authorization: `Bearer ${token}` }, data: datos,
    });
    expect(response.status()).toBe(201);
    const creada = await response.json();
    if (token === tokens.access) propias.push({ ...datos, id: creada.id });
  }

  // CA 1: desde Main se muestran todas las propias y ninguna ajena.
  await page.getByRole('link', { name: 'Ver mis campañas' }).click();
  await expect(page).toHaveURL(/\/campaigns\/my$/);
  await expect(page.getByRole('heading', { name: 'Mis campañas', exact: true })).toBeVisible();
  await expect(page.locator('.campaign-card')).toHaveCount(propias.length);
  await expect(page.getByRole('heading', { name: ajena, exact: true })).toHaveCount(0);
  for (const propia of propias) {
    await expect(page.getByRole('heading', { name: propia.titulo, exact: true })).toBeVisible();
  }

  // CA 2: cada tarjeta abre el detalle correspondiente, no el de otra campaña.
  for (const propia of propias) {
    await page.getByRole('link').filter({
      has: page.getByRole('heading', { name: propia.titulo, exact: true }),
    }).click();
    await expect(page).toHaveURL(new RegExp(`/campaigns/${propia.id}$`));
    await expect(page.getByRole('heading', { name: propia.titulo, exact: true, level: 1 })).toBeVisible();
    await expect(page.getByText(propia.descripcion, { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Ir al inicio' }).click();
    await page.getByRole('link', { name: 'Ver mis campañas' }).click();
    await expect(page).toHaveURL(/\/campaigns\/my$/);
  }
});
