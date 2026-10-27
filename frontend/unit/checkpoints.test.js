import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkpointAlcanzado,
  ordenarCheckpoints,
  validarCheckpoint,
} from '../src/utils/checkpoints.js';

const checkpoints = [
  { id: 3, titulo: 'Lanzamiento', monto_objetivo: '800' },
  { id: 1, titulo: 'Prototipo', monto_objetivo: '250' },
  { id: 2, titulo: 'Pruebas', monto_objetivo: '500' },
];

test('ordena checkpoints por monto ascendente', () => {
  assert.deepEqual(ordenarCheckpoints(checkpoints).map(item => item.id), [1, 2, 3]);
});

test('desempata checkpoints con el ID', () => {
  const datos = [
    { id: 7, monto_objetivo: '500' },
    { id: 2, monto_objetivo: '500' },
  ];
  assert.deepEqual(ordenarCheckpoints(datos).map(item => item.id), [2, 7]);
});

test('ordenarCheckpoints no modifica la lista recibida', () => {
  ordenarCheckpoints(checkpoints);
  assert.deepEqual(checkpoints.map(item => item.id), [3, 1, 2]);
});

test('marca como pendiente cuando el progreso es menor', () => {
  assert.equal(checkpointAlcanzado({ monto_objetivo: '500' }, '499.99'), false);
});

test('marca como alcanzado cuando el progreso es igual', () => {
  assert.equal(checkpointAlcanzado({ monto_objetivo: '500' }, '500'), true);
});

test('marca como alcanzado cuando el progreso supera el monto', () => {
  assert.equal(checkpointAlcanzado({ monto_objetivo: '500' }, '700'), true);
});

test('rechaza un checkpoint sin título ni descripción', () => {
  assert.deepEqual(validarCheckpoint({ monto_objetivo: '100' }, '1000'), {
    titulo: 'Campo obligatorio.',
    descripcion: 'Campo obligatorio.',
  });
});

test('acepta un checkpoint dentro del rango de la meta', () => {
  assert.deepEqual(validarCheckpoint({
    titulo: 'Prototipo', descripcion: 'Primera etapa', monto_objetivo: '0.01',
  }, '1000'), {});
});

test('rechaza un monto igual a cero', () => {
  assert.equal(validarCheckpoint({
    titulo: 'Prototipo', descripcion: 'Primera etapa', monto_objetivo: '0',
  }, '1000').monto_objetivo, 'El monto debe estar dentro del rango (0, meta global].');
});

test('rechaza un monto negativo', () => {
  assert.equal(validarCheckpoint({
    titulo: 'Prototipo', descripcion: 'Primera etapa', monto_objetivo: '-1',
  }, '1000').monto_objetivo, 'El monto debe estar dentro del rango (0, meta global].');
});

test('rechaza un monto superior a la meta global', () => {
  assert.equal(validarCheckpoint({
    titulo: 'Prototipo', descripcion: 'Primera etapa', monto_objetivo: '1001',
  }, '1000').monto_objetivo, 'El monto debe estar dentro del rango (0, meta global].');
});

test('acepta un monto exactamente igual a la meta global', () => {
  assert.deepEqual(validarCheckpoint({
    titulo: 'Meta final', descripcion: 'Última etapa', monto_objetivo: '1000',
  }, '1000'), {});
});
