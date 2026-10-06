import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { buscarCampanias } from '../utils/buscarCampanias.js';
import './CampaignSearch.css';

export default function CampaignSearch() {
  const id = useId();
  const [query, setQuery] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getCampaigns()
      .then(data => { if (!cancelled) setCampaigns(data); })
      .catch(() => { if (!cancelled) setError('No se pudieron cargar las campañas. Inténtalo nuevamente más tarde.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const results = buscarCampanias(campaigns, query);
  const searching = Boolean(query.trim());
  return (
    <section className="campaign-search" aria-label="Búsqueda de campañas">
      <label htmlFor={id}>Buscar campañas por nombre</label>
      <input id={id} type="search" placeholder="Escribe el nombre de una campaña"
        value={query} onChange={event => setQuery(event.target.value)}
        autoComplete="off" aria-describedby={`${id}-status`} />
      <p id={`${id}-status`} role="status">
        {searching && (loading ? 'Cargando campañas…' : error ? '' : results.length
          ? `${results.length} campaña(s) encontrada(s)` : 'No se encontraron campañas')}
      </p>
      {searching && error && <p role="alert">{error}</p>}
      {searching && !loading && !error && results.length > 0 && (
        <ul className="campaign-suggestions" aria-label="Resultados de búsqueda">
          {results.map(c => (
            <li key={c.id}><Link to={`/campaigns/${c.id}`}>{c.titulo}</Link></li>
          ))}
        </ul>
      )}
    </section>
  );
}
