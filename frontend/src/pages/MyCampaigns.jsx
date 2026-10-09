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


  return (
    <div className="my-campaigns">
      <Link to="/main" className="back-link">Volver al panel principal</Link>
      <p className="eyebrow">TU ESPACIO CREADOR</p>
      <h1>Mis campañas</h1>
      <p className="page-intro">Cada proyecto empieza con una idea. Aquí puedes seguir las tuyas.</p>
      {location.state?.mensaje && <p role="status" className="success-message">{location.state.mensaje}</p>}
      {loading && <p role="status">Cargando tus campañas…</p>}
      {error && <div className="error-msg" role="alert">No se pudieron cargar tus campañas. Recarga la página para intentarlo nuevamente.</div>}
      {!loading && !error && (campaigns.length === 0 ? (
        <div className="empty">
          <p>No tienes campañas creadas.</p>
          <Link to="/campaigns/create" className="btn-create">Crear primera campaña</Link>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map(c => (
            <Link to={`/campaigns/${c.id}`} key={c.id} className="campaign-card">
              {c.imagenes ? <img className="card-cover" src={c.imagenes} alt="" /> : <div className="card-placeholder" aria-hidden="true">↗</div>}
              <span className="category-badge">{c.categoria}</span>
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
      ))}
    </div>
  );
}