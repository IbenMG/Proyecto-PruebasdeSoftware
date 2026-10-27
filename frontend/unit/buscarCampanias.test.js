import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarCampanias, normalizar } from '../src/utils/buscarCampanias.js';
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

test('normalizar elimina tildes, mayúsculas y espacios externos', () => {
  assert.equal(normalizar('  ÁRBOL  '), 'arbol');
});

test('la coincidencia parcial se ordena alfabéticamente', () => {
  const datos = [
    { id: 3, titulo: 'Árbol urbano' },
    { id: 1, titulo: 'Árbol nativo' },
    { id: 2, titulo: 'Árbol comunitario' },
  ];
  assert.deepEqual(buscarCampanias(datos, 'arbol').map(c => c.id), [2, 1, 3]);
});

test('los títulos iguales se desempatan por ID', () => {
  const datos = [{ id: 9, titulo: 'Huerto' }, { id: 4, titulo: 'Huerto' }];
  assert.deepEqual(buscarCampanias(datos, 'huerto').map(c => c.id), [4, 9]);
});

test('no modifica la lista original', () => {
  const datos = [{ id: 2, titulo: 'Árbol' }, { id: 1, titulo: 'Árbol' }];
  buscarCampanias(datos, 'arbol');
  assert.deepEqual(datos.map(c => c.id), [2, 1]);
});

test('una consulta contenida en el título encuentra coincidencias', () => {
  assert.deepEqual(buscarCampanias([{ id: 1, titulo: 'Huerto comunitario' }], 'muni'), [
    { id: 1, titulo: 'Huerto comunitario' },
  ]);
});
