import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { ordenarActualizaciones, validarActualizacion } from '../utils/actualizaciones.js';
import { checkpointAlcanzado, ordenarCheckpoints } from '../utils/checkpoints.js';
import './campaigns.css';

export default function CampaignDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [campaign, setCampaign] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [updateForm, setUpdateForm] = useState({ titulo: '', contenido: '' });
  const [updateError, setUpdateError] = useState('');
  const [updatesError, setUpdatesError] = useState('');
  const [publishing, setPublishing] = useState(false);
  const updatesRequestVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    const requestVersion = updatesRequestVersion.current;
    api.getCampaign(id)
      .then(data => {
        if (!activo) return;
        setCampaign(data);
        setLoading(false);
        return api.getCampaignUpdates(id)
          .then(publicaciones => {
            if (activo && requestVersion === updatesRequestVersion.current) {
              setUpdates(ordenarActualizaciones(publicaciones));
            }
          })
          .catch(() => {
            if (activo) setUpdatesError('No se pudieron cargar las actualizaciones.');
          });
      })
      .catch(() => {
        if (!activo) return;
        setError('Campaña no encontrada');
        setLoading(false);
      });
    return () => { activo = false; };
  }, [id]);

  function cambiarActualizacion(event) {
    const { name, value } = event.target;
    setUpdateForm(previous => ({ ...previous, [name]: value }));
    setUpdateError('');
  }

  async function publicarActualizacion(event) {
    event.preventDefault();
    const titulo = updateForm.titulo.trim();
    const contenido = updateForm.contenido.trim();
    const validationErrors = validarActualizacion({ titulo, contenido });
    if (Object.values(validationErrors).length) {
      setUpdateError(Object.values(validationErrors)[0]);
      return;
    }

    setPublishing(true);
    setUpdateError('');
    try {
      const nueva = await api.createCampaignUpdate(id, { titulo, contenido });
      updatesRequestVersion.current += 1;
      setUpdates(previous => ordenarActualizaciones([nueva, ...previous]));
      setUpdateForm({ titulo: '', contenido: '' });
    } catch (requestError) {
      setUpdateError(requestError.status === 403
        ? 'Solo el propietario puede publicar actualizaciones.'
        : requestError.status === 401
          ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
          : requestError.message);
    } finally {
      setPublishing(false);
    }
  }

  function fechaPublicacion(value) {
    return new Date(value).toLocaleString('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

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
  const checkpoints = ordenarCheckpoints(campaign.checkpoints || []);

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

        <section className="section checkpoints-section" aria-labelledby="detail-checkpoints-title">
          <h2 id="detail-checkpoints-title">Hitos y metas graduales</h2>
          {checkpoints.length ? (
            <ol className="checkpoints-list">
              {checkpoints.map(checkpoint => {
                const alcanzado = checkpointAlcanzado(checkpoint, campaign.progeso_financiero);
                return (
                <li className={`checkpoint-item ${alcanzado ? 'checkpoint-reached' : ''}`} key={checkpoint.id}>
                  <div>
                    <h3>{checkpoint.titulo}</h3>
                    <p>{checkpoint.descripcion}</p>
                    <span className="checkpoint-amount">Meta: ${Number(checkpoint.monto_objetivo).toLocaleString('es-CL')}</span>
                  </div>
                  <strong className="checkpoint-status">{alcanzado ? 'Alcanzado' : 'Pendiente'}</strong>
                </li>
                );
              })}
            </ol>
          ) : <p className="empty-section">Esta campaña aún no tiene checkpoints.</p>}
        </section>

        <section className="section updates-section" aria-labelledby="updates-title">
          <h2 id="updates-title">Novedades y actualizaciones</h2>
          {campaign.puede_editar && (
            <form className="update-form" onSubmit={publicarActualizacion} noValidate>
              <div className="field">
                <label htmlFor="actualizacion-titulo">Título de la actualización</label>
                <input id="actualizacion-titulo" name="titulo" value={updateForm.titulo}
                  minLength="3" maxLength="150" disabled={publishing} onChange={cambiarActualizacion} />
              </div>
              <div className="field">
                <label htmlFor="actualizacion-contenido">Contenido</label>
                <textarea id="actualizacion-contenido" name="contenido" value={updateForm.contenido}
                  rows={4} disabled={publishing} onChange={cambiarActualizacion} />
              </div>
              {updateError && <p className="error-msg" role="alert">{updateError}</p>}
              <button type="submit" className="btn-submit" disabled={publishing}>
                {publishing ? 'Publicando...' : 'Publicar actualización'}
              </button>
            </form>
          )}
          {updatesError && <p className="error-msg" role="alert">{updatesError}</p>}
          {updates.length ? (
            <div className="updates-list">
              {updates.map(update => (
                <article className="update-card" key={update.id}>
                  <div className="update-card-header">
                    <h3>{update.titulo}</h3>
                    <time dateTime={update.fecha_publicacion}>{fechaPublicacion(update.fecha_publicacion)}</time>
                  </div>
                  <p>{update.contenido}</p>
                </article>
              ))}
            </div>
          ) : <p className="empty-section">Aún no hay actualizaciones publicadas.</p>}
        </section>
      </article>
    </div>
  );
}
