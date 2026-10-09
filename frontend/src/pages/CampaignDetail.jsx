import { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import './campaigns.css';

export default function CampaignDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
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

  async function eliminar() {
    if (deleting || !window.confirm(`¿Eliminar la campaña "${campaign.titulo}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteCampaign(id);
      navigate('/campaigns/my', { replace: true, state: { mensaje: 'Campaña eliminada correctamente.' } });
    } catch (error) {
      setDeleteError(error.status === 401 ? 'Tu sesión expiró. Inicia sesión nuevamente.'
        : error.status === 403 ? 'No tienes permiso para eliminar esta campaña.'
        : 'No se pudo eliminar la campaña. Inténtalo nuevamente.');
      setDeleting(false);
    }
  }

  if (loading) return <div className="detail-loading">Cargando campaña...</div>;
  if (error) return <div className="detail-error" role="alert">{error}</div>;
  if (!campaign) return null;

  const progress = campaign.meta_financiera > 0
    ? Math.min(100, (campaign.progeso_financiero / campaign.meta_financiera) * 100)
    : 0;

  return (
    <div className="campaign-detail">
      <Link to="/" className="back-link">Ir al inicio</Link>
      {location.state?.mensaje && <p role="status" className="success-message">{location.state.mensaje}</p>}

      <article className="detail-card">
        <h1>{campaign.titulo}</h1>
        {campaign.puede_editar && <Link className="back-link" to={`/campaigns/${id}/edit`}>Editar campaña</Link>}
        {campaign.puede_editar && (
          <button className="btn-delete-campaign" type="button" onClick={eliminar} disabled={deleting}>
            {deleting ? 'Eliminando…' : 'Eliminar campaña'}
          </button>
        )}
        {deleteError && <p role="alert">{deleteError}</p>}
        {campaign.imagenes && <img className="campaign-image" src={campaign.imagenes} alt={`Imagen de ${campaign.titulo}`} />}
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
