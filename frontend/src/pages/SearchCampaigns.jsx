import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import './SearchCampaigns.css';

export default function SearchCampaigns() {
  const [query, setQuery] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.getCampaigns()
      .then(data => {
        if (!cancelled) {
          setCampaigns(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Error al buscar campañas');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = campaigns.filter(c =>
    c.titulo.toLowerCase().includes(query.toLowerCase()) ||
    c.descripcion.toLowerCase().includes(query.toLowerCase()) ||
    c.categoria.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="search-campaigns">
      <h2>Buscar Campañas</h2>
      <div className="search-box">
        <input
          type="text"
          placeholder="Buscar por título, descripción o categoría..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      {error && <div className="error-msg">{error}</div>}
      {loading ? (
        <div className="loading">Buscando...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">No se encontraron campañas</div>
      ) : (
        <div className="campaigns-grid">
          {filtered.map(c => (
            <Link to={`/campaigns/${c.id}`} key={c.id} className="campaign-card">
              <h3>{c.titulo}</h3>
              <p className="category">{c.categoria}</p>
              <p className="meta">Meta: ${Number(c.meta_financiera).toLocaleString()}</p>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${Math.min(100, (c.progeso_financiero / c.meta_financiera) * 100)}%` }}></div>
              </div>
              <p className="progress-text">${Number(c.progeso_financiero).toLocaleString()} recolectados</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}