import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordenarActualizaciones, validarActualizacion } from '../src/utils/actualizaciones.js';

test('ordena actualizaciones desde la más reciente', () => {
  const datos = [
    { id: 1, fecha_publicacion: '2026-10-01T10:00:00Z' },
    { id: 2, fecha_publicacion: '2026-10-02T10:00:00Z' },
  ];
  assert.deepEqual(ordenarActualizaciones(datos).map(item => item.id), [2, 1]);
});

test('desempata fechas iguales con el ID más alto', () => {
  const fecha = '2026-10-01T10:00:00Z';
  const datos = [{ id: 1, fecha_publicacion: fecha }, { id: 3, fecha_publicacion: fecha }];
  assert.deepEqual(ordenarActualizaciones(datos).map(item => item.id), [3, 1]);
});

test('ordenarActualizaciones no modifica la lista original', () => {
  const datos = [{ id: 1, fecha_publicacion: '2026-10-01T10:00:00Z' }];
  const original = [...datos];
  ordenarActualizaciones(datos);
  assert.deepEqual(datos, original);
});

test('acepta una actualización válida', () => {
  assert.deepEqual(validarActualizacion({ titulo: 'Avance', contenido: 'Todo va bien.' }), {});
});

test('rechaza títulos de menos de tres caracteres', () => {
  assert.equal(validarActualizacion({ titulo: 'No', contenido: 'Contenido' }).titulo,
    'El título debe tener al menos 3 caracteres.');
});

test('cuenta caracteres después de quitar espacios externos', () => {
  assert.equal(validarActualizacion({ titulo: '  No  ', contenido: 'Contenido' }).titulo,
    'El título debe tener al menos 3 caracteres.');
});

test('rechaza contenido vacío', () => {
  assert.equal(validarActualizacion({ titulo: 'Avance', contenido: '   ' }).contenido,
    'El contenido de la actualización es obligatorio.');
});

test('reporta ambos errores cuando faltan título y contenido', () => {
  assert.deepEqual(validarActualizacion({}), {
    titulo: 'El título debe tener al menos 3 caracteres.',
    contenido: 'El contenido de la actualización es obligatorio.',
  });
});
