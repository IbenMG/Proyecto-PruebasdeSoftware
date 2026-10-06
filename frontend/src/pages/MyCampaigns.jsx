import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api.js';
import './campaigns.css';

export default function MyCampaigns() {
  const location = useLocation();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMyCampaigns()
      .then(data => {
        setCampaigns(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Error al cargar campañas');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="my-campaigns">
      <Link to="/main" className="back-link">Volver al panel principal</Link>
      <h1>Mis campañas</h1>
      {location.state?.mensaje && <p role="status" className="success-message">{location.state.mensaje}</p>}
      {error && <div className="error-msg">{error}</div>}
      {campaigns.length === 0 ? (
        <div className="empty">
          <p>No tienes campañas creadas.</p>
          <Link to="/campaigns/create" className="btn-create">Crear primera campaña</Link>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map(c => (
            <Link to={`/campaigns/${c.id}`} key={c.id} className="campaign-card">
              <h3>{c.titulo}</h3>
              <p className="meta">Meta: ${Number(c.meta_financiera).toLocaleString()}</p>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${Math.min(100, (c.progeso_financiero / c.meta_financiera) * 100)}%` }}></div>
              </div>
              <p className="progress-text">${Number(c.progeso_financiero).toLocaleString()} de ${Number(c.meta_financiera).toLocaleString()}</p>
              <p className="deadline">Fecha límite: {c.fecha_limite}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}