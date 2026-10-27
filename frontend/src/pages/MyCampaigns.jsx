import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api.js';
import CampaignCard from '../components/CampaignCard.jsx';
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
          {campaigns.map(campaign => <CampaignCard campaign={campaign} key={campaign.id} />)}
        </div>
      ))}
    </div>
  );
}
