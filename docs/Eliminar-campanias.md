# Eliminar campañas

Completa la operación Delete del CRUD solicitado en Entrega 1.

- Solo el creador ve Eliminar campaña en el detalle.
- La confirmación identifica la campaña y permite cancelar sin enviar DELETE.
- Al confirmar, se usa el endpoint existente; el botón queda inactivo durante la solicitud.
- El éxito lleva a Mis campañas con un mensaje de confirmación.
- Ante un error se conserva la vista y se muestra un mensaje.
- El backend exige autenticación y propiedad de la campaña.

No hay nuevas dependencias ni migraciones. La eliminación es definitiva del registro; el tratamiento de aportes queda fuera del alcance actual. El endpoint existente no elimina automáticamente el archivo de imagen del almacenamiento.

Pruebas: api/test_campanias.py y frontend/tests/eliminar.spec.js.
