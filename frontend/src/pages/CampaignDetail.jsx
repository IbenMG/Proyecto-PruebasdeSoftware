import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import './campaigns.css';

export default function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCampaign(id)
      .then(data => {
        setCampaign(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Campaña no encontrada');
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="detail-loading">Cargando campaña...</div>;
  if (error) return <div className="detail-error">{error}</div>;
  if (!campaign) return null;

  const progress = campaign.meta_financiera > 0
    ? Math.min(100, (campaign.progeso_financiero / campaign.meta_financiera) * 100)
    : 0;

  return (
    <div className="campaign-detail">
      <Link to="/campaigns/search" className="back-link">← Volver a buscar</Link>

      <article className="detail-card">
        <h1>{campaign.titulo}</h1>
        <span className="category-badge">{campaign.categoria}</span>

        <div className="progress-section">
          <div className="progress-header">
            <span>Progreso: ${Number(campaign.progeso_financiero).toLocaleString()} / ${Number(campaign.meta_financiera).toLocaleString()}</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="deadline">Fecha límite: {campaign.fecha_limite}</p>
        </div>

        <section className="section">
          <h2>Descripción</h2>
          <p>{campaign.descripcion}</p>
        </section>

        <section className="section">
          <h2>Información del creador</h2>
          <p>{campaign.informacion_creador}</p>
        </section>
      </article>
    </div>
  );
}
