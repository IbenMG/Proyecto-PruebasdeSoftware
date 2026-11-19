function timestamp(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function ordenarActualizaciones(actualizaciones = []) {
  return [...actualizaciones].sort((a, b) => (
    timestamp(b.fecha_publicacion) - timestamp(a.fecha_publicacion)
    || Number(b.id ?? 0) - Number(a.id ?? 0)
  ));
}

export function validarActualizacion(actualizacion = {}) {
  const errors = {};
  const titulo = String(actualizacion.titulo ?? '').trim();
  const contenido = String(actualizacion.contenido ?? '').trim();

  if (titulo.length < 3) errors.titulo = 'El título debe tener al menos 3 caracteres.';
  if (!contenido) errors.contenido = 'El contenido de la actualización es obligatorio.';
  return errors;
}
