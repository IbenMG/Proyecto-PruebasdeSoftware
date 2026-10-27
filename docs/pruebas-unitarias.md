# Pruebas unitarias

La Entrega 2 amplía las pruebas unitarias sin reemplazar las pruebas de integración ni las E2E.

## Frontend

`frontend/unit/` usa el Node.js Test Runner y contiene 29 casos:

- `buscarCampanias.test.js`: normalización, coincidencias exactas y parciales, orden y no mutación.
- `checkpoints.test.js`: orden ascendente, límites `(0, meta global]`, estados alcanzado/pendiente y validación de campos.
- `actualizaciones.test.js`: título mínimo, contenido obligatorio, orden por fecha y desempate por ID.

Ejecutar desde `frontend`:

```bash
npm run test:unit
```

## Backend

`api/test_unit_serializers.py` contiene 26 pruebas sin acceso a base de datos. Se verifican serializers y reglas de negocio aisladas para:

- Checkpoints y actualización de estados.
- Validación de campañas, metas y fechas.
- Actualizaciones del proyecto.
- Registro y mayoría de edad.
- Login y emisión/rechazo de tokens mediante mocks.

Ejecutar desde la raíz:

```bash
python -m pytest api/test_unit_serializers.py --ds=config.settings -q
```

Las pruebas de `api/test_*.py` que usan `APIClient` y `pytest-django` siguen clasificadas como pruebas de integración porque involucran endpoints, permisos y persistencia.
