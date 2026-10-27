const mensajeMonto = 'El monto debe estar dentro del rango (0, meta global].';

export function ordenarCheckpoints(checkpoints = []) {
  return [...checkpoints].sort((a, b) => (
    Number(a.monto_objetivo) - Number(b.monto_objetivo)
    || Number(a.id ?? 0) - Number(b.id ?? 0)
  ));
}

export function checkpointAlcanzado(checkpoint, progresoActual) {
  const monto = Number(checkpoint?.monto_objetivo);
  const progreso = Number(progresoActual);
  return Number.isFinite(monto) && Number.isFinite(progreso) && progreso >= monto;
}

export function validarCheckpoint(checkpoint = {}, metaGlobal) {
  const errors = {};
  const titulo = String(checkpoint.titulo ?? '');
  const descripcion = String(checkpoint.descripcion ?? '');
  const montoTexto = String(checkpoint.monto_objetivo ?? '');
  const monto = Number(montoTexto);
  const meta = Number(metaGlobal);

  if (!titulo.trim()) errors.titulo = 'Campo obligatorio.';
  if (!descripcion.trim()) errors.descripcion = 'Campo obligatorio.';
  if (!montoTexto.trim() || !Number.isFinite(monto) || monto <= 0) {
    errors.monto_objetivo = mensajeMonto;
  } else if (Number.isFinite(meta) && meta > 0 && monto > meta) {
    errors.monto_objetivo = mensajeMonto;
  }
  return errors;
}
