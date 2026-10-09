import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
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
    const changed = campos.some(([name]) => form[name] !== savedForm[name]) || imagen || quitarImagen;
    if (enviando || (changed && !window.confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?'))) {
      event.preventDefault();
    }
  }

  async function enviar(event) {
    event.preventDefault();
    const nuevosErrores = Object.fromEntries(campos.map(([name]) => [name, validar(name, form[name])]));
    setErrors(nuevosErrores);
    setSubmitError('');
    if (Object.values(nuevosErrores).some(Boolean)) {
      const first = campos.find(([name]) => nuevosErrores[name]);
      document.getElementById(`campania-${first[0]}`)?.focus();
      return;
    }

    const body = new FormData();
    for (const [name, value] of Object.entries(form)) body.append(name, value.trim());
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
        const details = Object.fromEntries(Object.entries(error.details).map(
          ([name, value]) => [name, Array.isArray(value) ? value.join(' ') : String(value)]
        ));
        setErrors(details);
        setSubmitError(details.non_field_errors || 'Revisa los campos indicados.');
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
