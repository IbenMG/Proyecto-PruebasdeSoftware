import { Link } from 'react-router-dom';

export default function CampaignCard({ campaign }) {
  const meta = Number(campaign.meta_financiera);
  const progreso = Number(campaign.progeso_financiero);
  const porcentaje = meta > 0 ? Math.min(100, (progreso / meta) * 100) : 0;

  return (
    <Link to={`/campaigns/${campaign.id}`} className="campaign-card">
      {campaign.imagenes ? (
        <img className="card-cover" src={campaign.imagenes} alt="" />
      ) : (
        <div className="card-placeholder" aria-hidden="true">↗</div>
      )}
      <span className="category-badge">{campaign.categoria}</span>
      <h3>{campaign.titulo}</h3>
      <p className="meta">Meta: ${meta.toLocaleString('es-CL')}</p>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${porcentaje}%` }}></div>
      </div>
      <p className="progress-text">
        ${progreso.toLocaleString('es-CL')} de ${meta.toLocaleString('es-CL')}
      </p>
      <p className="deadline">Fecha límite: {campaign.fecha_limite}</p>
    </Link>
  );
}
