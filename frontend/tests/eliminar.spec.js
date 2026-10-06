import { test, expect } from '@playwright/test';
const API = 'http://localhost:8000/api';
async function cuenta(request) {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const datos = { username: `elim_${suffix}`, email: `elim_${suffix}@example.com`, password: 'ClaveEliminar-123!', fecha_nacimiento: '2000-01-15' };
  expect((await request.post(`${API}/registro/`, { data: datos })).status()).toBe(201);
  const login = await request.post(`${API}/token/`, { data: { email: datos.email, password: datos.password } });
  expect(login.status()).toBe(200);
  return login.json();
}
async function preparar(page, request) {
  const tokens = await cuenta(request);
  const response = await request.post(`${API}/campanias/create/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
    data: { titulo: `Eliminar ${Date.now()}`, descripcion: 'Campaña de prueba', categoria: 'Comunidad', meta_financiera: '100', fecha_limite: '2099-12-31', informacion_creador: 'Equipo' },
  });
  expect(response.status()).toBe(201);
  const campaign = await response.json();
  await page.addInitScript(tokens => {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
  }, tokens);
  await page.goto(`/campaigns/${campaign.id}`);
  return campaign;
}

test('cancelar conserva la campaña; confirmar la elimina y vuelve al listado', async ({ page, request }) => {
  const campaign = await preparar(page, request);
  let deletes = 0;
  page.on('request', r => { if (r.method() === 'DELETE') deletes += 1; });
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain(campaign.titulo);
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Eliminar campaña', exact: true }).click();
  await expect(page.getByRole('heading', { name: campaign.titulo })).toBeVisible();
  expect(deletes).toBe(0);
  expect((await request.get(`${API}/campanias/${campaign.id}/`)).status()).toBe(200);

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Eliminar campaña', exact: true }).click();
  await expect(page).toHaveURL(/\/campaigns\/my$/);
  await expect(page.getByRole('status')).toHaveText('Campaña eliminada correctamente.');
  await expect(page.getByText('No tienes campañas creadas.', { exact: true })).toBeVisible();
  expect((await request.get(`${API}/campanias/${campaign.id}/`)).status()).toBe(404);
  expect(deletes).toBe(1);
});

test('otro usuario no ve eliminar y la API rechaza su solicitud', async ({ page, request }) => {
  const campaign = await preparar(page, request);
  const otro = await cuenta(request);
  await page.evaluate(tokens => {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
  }, otro);
  // Cambiar de documento sin recargar el script de inicio de la cuenta creadora.
  const response = await request.delete(`${API}/campanias/${campaign.id}/delete/`, {
    headers: { Authorization: `Bearer ${otro.access}` },
  });
  expect(response.status()).toBe(403);
  await page.getByRole('link', { name: 'Ir al inicio' }).click();
  await page.getByLabel('Buscar campañas por nombre').fill(campaign.titulo);
  await page.getByRole('list', { name: 'Resultados de búsqueda' }).getByRole('link', { name: campaign.titulo, exact: true }).click();
  await expect(page.getByRole('heading', { name: campaign.titulo })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Eliminar campaña' })).toHaveCount(0);
  expect((await request.get(`${API}/campanias/${campaign.id}/`)).status()).toBe(200);
});

test('error de eliminación conserva el detalle y permite reintentar', async ({ page, request }) => {
  const campaign = await preparar(page, request);
  await page.route(`**/api/campanias/${campaign.id}/delete/`, route => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Eliminar campaña', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('No se pudo eliminar la campaña. Inténtalo nuevamente.');
  await expect(page.getByRole('button', { name: 'Eliminar campaña', exact: true })).toBeEnabled();
  await expect(page.getByRole('heading', { name: campaign.titulo })).toBeVisible();
  expect((await request.get(`${API}/campanias/${campaign.id}/`)).status()).toBe(200);
});
