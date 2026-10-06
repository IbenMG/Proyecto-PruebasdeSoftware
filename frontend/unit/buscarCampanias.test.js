import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarCampanias } from '../src/utils/buscarCampanias.js';
const campaigns = [
  { id: 1, titulo: 'Plantemos árboles' },
  { id: 2, titulo: 'Árbol' },
  { id: 3, titulo: 'Biblioteca', descripcion: 'árbol' },
];
test('coincidencia exacta primero, parcial después, sin tildes ni mayúsculas', () => {
  assert.deepEqual(buscarCampanias(campaigns, '  ARBOL  ').map(c => c.id), [2, 1]);
});
test('consulta vacía no muestra sugerencias', () => {
  assert.deepEqual(buscarCampanias(campaigns, '   '), []);
});
test('sin coincidencia devuelve lista vacía', () => {
  assert.deepEqual(buscarCampanias(campaigns, 'oceano'), []);
});
test('busca solo en el nombre', () => {
  assert.deepEqual(buscarCampanias([campaigns[2]], 'arbol'), []);
});
