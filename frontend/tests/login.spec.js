import { test, expect } from '@playwright/test';

test('correo inválido impide el envío', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill('correo-invalido');
  await page.getByLabel('Contraseña', { exact: true }).fill('ClavePrueba!');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  expect(await page.getByLabel('Correo electrónico').evaluate(input => input.checkValidity())).toBe(false);
  await expect(page).toHaveURL('http://localhost:5173/');
});

test('contraseña en blanco impide el envío', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill('persona@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Contraseña requerida');
});

test('correo inexistente recibe el error genérico', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill(`inexistente_${Date.now()}@example.com`);
  await page.getByLabel('Contraseña', { exact: true }).fill('ClavePrueba!');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos');
  await expect(page).toHaveURL('http://localhost:5173/');
});
