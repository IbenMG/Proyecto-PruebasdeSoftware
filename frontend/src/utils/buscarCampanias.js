export function normalizar(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function buscarCampanias(campanias, consulta) {
  const busqueda = normalizar(consulta);
  if (!busqueda) return [];
  return campanias
    .filter(c => normalizar(c.titulo).includes(busqueda))
    .sort((a, b) => {
      const exactaA = normalizar(a.titulo) === busqueda;
      const exactaB = normalizar(b.titulo) === busqueda;
      return Number(exactaB) - Number(exactaA)
        || a.titulo.localeCompare(b.titulo, 'es') || a.id - b.id;
    });
}
