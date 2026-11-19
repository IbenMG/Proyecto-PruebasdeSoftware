import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { validarCheckpoint } from '../utils/checkpoints.js';
import './campaigns.css';

const campos = [
  ['titulo', 'Título', 'text'],
  ['descripcion', 'Descripción', 'textarea'],
  ['categoria', 'Categoría', 'text'],
  ['meta_financiera', 'Meta de financiamiento', 'number'],
  ['fecha_limite', 'Fecha límite', 'date'],
  ['informacion_creador', 'Información del creador', 'textarea'],
];
const valoresIniciales = Object.fromEntries(campos.map(([name]) => [name, '']));
const checkpointVacio = () => ({ titulo: '', descripcion: '', monto_objetivo: '' });
const hoyEnChile = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export default function CreateCampaign({ editar = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(valoresIniciales);
  const [savedForm, setSavedForm] = useState(valoresIniciales);
  const [imagen, setImagen] = useState(null);
  const [imagenActual, setImagenActual] = useState('');
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [checkpoints, setCheckpoints] = useState([]);
  const [savedCheckpoints, setSavedCheckpoints] = useState([]);
  const [checkpointErrors, setCheckpointErrors] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(editar);
  const [permitido, setPermitido] = useState(!editar);

  useEffect(() => {
    if (!editar) return;
    let activo = true;
    api.getCampaign(id).then(data => {
      if (!activo) return;
      if (!data.puede_editar) {
        setSubmitError('Solo el creador puede editar esta campaña.');
        return;
      }
      setPermitido(true);
      setForm(Object.fromEntries(campos.map(([name]) => [name, String(data[name] ?? '')])));
      setSavedForm(Object.fromEntries(campos.map(([name]) => [name, String(data[name] ?? '')])));
      setImagenActual(data.imagenes || '');
      const checkpointsIniciales = (data.checkpoints || []).map(({ titulo, descripcion, monto_objetivo }) => ({
        titulo: String(titulo ?? ''),
        descripcion: String(descripcion ?? ''),
        monto_objetivo: String(monto_objetivo ?? ''),
      }));
      setCheckpoints(checkpointsIniciales);
      setSavedCheckpoints(checkpointsIniciales);
    }).catch(() => {
      if (activo) setSubmitError('No se pudo cargar la campaña.');
    }).finally(() => {
      if (activo) setCargando(false);
    });
    return () => { activo = false; };
  }, [editar, id]);

  function validar(name, value) {
    if (!value.trim()) return 'Campo obligatorio.';
    if (name === 'meta_financiera' && (!Number.isFinite(Number(value)) || Number(value) <= 0)) {
      return 'La meta de financiamiento debe ser mayor que cero.';
    }
    if (name === 'fecha_limite' && value < hoyEnChile()) {
      return 'La fecha límite no puede ser anterior al día actual.';
    }
    return '';
  }

  function cambiar(event) {
    const { name, value } = event.target;
    setForm(previous => ({ ...previous, [name]: value }));
    if (errors[name]) setErrors(previous => ({ ...previous, [name]: validar(name, value) }));
  }

  function confirmarSalida(event) {
    const changed = campos.some(([name]) => form[name] !== savedForm[name])
      || JSON.stringify(checkpoints) !== JSON.stringify(savedCheckpoints)
      || imagen || quitarImagen;
    if (enviando || (changed && !window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?'))) {
      event.preventDefault();
    }
  }

  function cambiarCheckpoint(index, name, value) {
    setCheckpoints(previous => previous.map((checkpoint, checkpointIndex) => (
      checkpointIndex === index ? { ...checkpoint, [name]: value } : checkpoint
    )));
    setCheckpointErrors(previous => previous.map((errors, checkpointIndex) => (
      checkpointIndex === index ? { ...errors, [name]: '' } : errors
    )));
  }

  function agregarCheckpoint() {
    setCheckpoints(previous => [...previous, checkpointVacio()]);
    setCheckpointErrors(previous => [...previous, {}]);
  }

  function quitarCheckpoint(index) {
    setCheckpoints(previous => previous.filter((_, checkpointIndex) => checkpointIndex !== index));
    setCheckpointErrors(previous => previous.filter((_, checkpointIndex) => checkpointIndex !== index));
  }

  async function enviar(event) {
    event.preventDefault();
    const nuevosErrores = Object.fromEntries(campos.map(([name]) => [name, validar(name, form[name])]));
    const nuevosErroresCheckpoint = checkpoints.map(checkpoint => (
      validarCheckpoint(checkpoint, form.meta_financiera)
    ));
    setErrors(nuevosErrores);
    setCheckpointErrors(nuevosErroresCheckpoint);
    setSubmitError('');
    if (Object.values(nuevosErrores).some(Boolean)
      || nuevosErroresCheckpoint.some(error => Object.values(error).some(Boolean))) {
      const first = campos.find(([name]) => nuevosErrores[name]);
      if (first) document.getElementById(`campania-${first[0]}`)?.focus();
      return;
    }

    const body = new FormData();
    for (const [name, value] of Object.entries(form)) body.append(name, value.trim());
    body.append('checkpoints', JSON.stringify(checkpoints.map(({ titulo, descripcion, monto_objetivo }) => ({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      monto_objetivo: monto_objetivo.trim(),
    }))));
    if (imagen) body.append('imagenes', imagen);
    if (editar && quitarImagen) body.append('quitar_imagen', 'true');
    setEnviando(true);
    try {
      const campaign = editar ? await api.updateCampaign(id, body) : await api.createCampaign(body);
      navigate(`/campaigns/${campaign.id}`, {
        state: { mensaje: editar ? 'Campaña actualizada exitosamente' : 'Campaña creada exitosamente' },
      });
    } catch (error) {
      if (error.status === 400) {
        const formatError = value => {
          if (Array.isArray(value)) return value.map(formatError).join(' ');
          if (value && typeof value === 'object') return Object.values(value).map(formatError).join(' ');
          return String(value);
        };
        const details = Object.fromEntries(Object.entries(error.details).map(
          ([name, value]) => [name, formatError(value)]
        ));
        setErrors(details);
        setSubmitError(details.checkpoints || details.non_field_errors || 'Revisa los campos indicados.');
      } else {
        setSubmitError(error.status === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión.' : error.message);
      }
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <p role="status">Cargando campaña...</p>;

  return (
    <main className="create-campaign">
      <Link to="/main" className="back-link" onClick={confirmarSalida}>Volver al panel principal</Link>
      <h1>{editar ? 'Editar campaña' : 'Crear campaña'}</h1>
      <p className="page-intro">Dale un nombre claro a tu idea y cuenta qué quieres lograr.</p>
      {submitError && <p role="alert" className="error-msg">{submitError}</p>}
      {permitido && (
        <form onSubmit={enviar} noValidate>
          <p>Todos los campos son obligatorios, excepto la imagen.</p>
          {campos.map(([name, label, type]) => {
            const props = {
              id: `campania-${name}`, name, value: form[name], onChange: cambiar,
              onBlur: () => setErrors(previous => ({ ...previous, [name]: validar(name, form[name]) })),
              required: true, disabled: enviando, 'aria-invalid': Boolean(errors[name]),
              'aria-describedby': errors[name] ? `error-${name}` : undefined,
            };
            return (
              <div className="field" key={name}>
                <label htmlFor={props.id}>{label}</label>
                {type === 'textarea' ? <textarea {...props} rows={4} /> : (
                  <input {...props} type={type}
                    step={type === 'number' ? '0.01' : undefined}
                    min={type === 'number' ? '0.01' : type === 'date' ? hoyEnChile() : undefined}
                    maxLength={name === 'titulo' ? 100 : name === 'categoria' ? 50 : undefined}
                  />
                )}
                {name === 'meta_financiera' && <p className="field-help">Ingresa el monto que necesitas reunir; debe ser mayor que cero.</p>}
                {name === 'fecha_limite' && <p className="field-help">Puedes elegir hoy o una fecha futura.</p>}
                {name === 'informacion_creador' && <p className="field-help">Presenta a la persona o equipo responsable. Esta información será pública.</p>}
                {errors[name] && <p id={`error-${name}`} className="error-msg" role="alert">{errors[name]}</p>}
              </div>
            );
          })}
          <section className="checkpoint-editor" aria-labelledby="checkpoints-title">
            <div className="checkpoint-editor-header">
              <div>
                <h2 id="checkpoints-title">Hitos y metas graduales</h2>
                <p className="field-help">Define avances financiables dentro de la meta global. Se ordenarán por monto.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={agregarCheckpoint} disabled={enviando}>
                Agregar checkpoint
              </button>
            </div>
            {checkpoints.length === 0 && <p className="checkpoint-empty">Aún no has agregado checkpoints.</p>}
            {checkpoints.map((checkpoint, index) => (
              <div className="checkpoint-form" key={`checkpoint-${index}`}>
                <div className="checkpoint-form-header">
                  <h3>Checkpoint {index + 1}</h3>
                  <button type="button" className="checkpoint-remove" onClick={() => quitarCheckpoint(index)} disabled={enviando}>
                    Quitar
                  </button>
                </div>
                <div className="field">
                  <label htmlFor={`checkpoint-${index}-titulo`}>Título del checkpoint</label>
                  <input id={`checkpoint-${index}-titulo`} value={checkpoint.titulo} maxLength="120"
                    disabled={enviando} aria-invalid={Boolean(checkpointErrors[index]?.titulo)}
                    onChange={event => cambiarCheckpoint(index, 'titulo', event.target.value)} />
                  {checkpointErrors[index]?.titulo && <p className="error-msg" role="alert">{checkpointErrors[index].titulo}</p>}
                </div>
                <div className="field">
                  <label htmlFor={`checkpoint-${index}-descripcion`}>Descripción del checkpoint</label>
                  <textarea id={`checkpoint-${index}-descripcion`} value={checkpoint.descripcion} rows={3}
                    disabled={enviando} aria-invalid={Boolean(checkpointErrors[index]?.descripcion)}
                    onChange={event => cambiarCheckpoint(index, 'descripcion', event.target.value)} />
                  {checkpointErrors[index]?.descripcion && <p className="error-msg" role="alert">{checkpointErrors[index].descripcion}</p>}
                </div>
                <div className="field">
                  <label htmlFor={`checkpoint-${index}-monto`}>Monto objetivo</label>
                  <input id={`checkpoint-${index}-monto`} type="number" min="0.01" step="0.01"
                    max={form.meta_financiera || undefined} value={checkpoint.monto_objetivo} disabled={enviando}
                    aria-invalid={Boolean(checkpointErrors[index]?.monto_objetivo)}
                    onChange={event => cambiarCheckpoint(index, 'monto_objetivo', event.target.value)} />
                  <p className="field-help">Debe ser mayor que cero y no superar la meta global.</p>
                  {checkpointErrors[index]?.monto_objetivo && <p className="error-msg" role="alert">{checkpointErrors[index].monto_objetivo}</p>}
                </div>
              </div>
            ))}
          </section>
          <div className="field">
            <label htmlFor="campania-imagen">Imagen (opcional)</label>
            <input id="campania-imagen" type="file" accept="image/*" disabled={enviando}
              aria-invalid={Boolean(errors.imagenes)}
              onChange={event => {
                setImagen(event.target.files[0] || null);
                setQuitarImagen(false);
                setErrors(previous => ({ ...previous, imagenes: '' }));
              }} />
            {errors.imagenes && <p className="error-msg" role="alert">{errors.imagenes}</p>}
            {editar && imagenActual && !imagen && (
              <>
                <img src={imagenActual} alt="Imagen actual de la campaña" className="campaign-image" />
                <label><input type="checkbox" checked={quitarImagen} disabled={enviando}
                  onChange={event => setQuitarImagen(event.target.checked)} /> Quitar imagen actual</label>
              </>
            )}
          </div>
          <div className="form-actions"><button type="submit" className="btn-submit" disabled={enviando}>
            {enviando ? 'Guardando...' : editar ? 'Guardar cambios' : 'Publicar campaña'}
          </button>
          <Link className="btn-secondary cancel-link" to={editar ? `/campaigns/${id}` : '/main'} onClick={confirmarSalida}>Cancelar</Link></div>
        </form>
      )}
    </main>
  );
}
