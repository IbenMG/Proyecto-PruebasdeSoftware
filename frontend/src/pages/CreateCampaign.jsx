import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import './CreateCampaign.css';

const today = new Date().toISOString().split('T')[0];

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    categoria: '',
    meta_financiera: '',
    fecha_limite: today,
    informacion_creador: ''
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const validate = (name, value) => {
    let err = '';
    if (!value.trim()) err = 'Campo requerido';
    else if (name === 'meta_financiera' && parseFloat(value) <= 0) err = 'Meta debe ser > 0';
    else if (name === 'fecha_limite' && value < today) err = 'Fecha no puede ser anterior a hoy';
    setErrors(prev => ({ ...prev, [name]: err }));
    return !err;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) validate(name, value);
  };

  const handleBlur = (e) => validate(e.target.name, e.target.value);

  const isValid = () => {
    let valid = true;
    Object.keys(form).forEach(key => {
      if (!validate(key, form[key])) valid = false;
    });
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!isValid()) return;

    try {
      const data = {
        ...form,
        meta_financiera: parseFloat(form.meta_financiera),
        imagenes: ''
      };
      const campaign = await api.createCampaign(data);
      navigate(`/campaigns/${campaign.id}`);
    } catch {
      setSubmitError('Error al crear campaña');
    }
  };

  const disabled = Object.values(errors).some(e => e) || Object.values(form).some(v => !v.trim());

  return (
    <div className="create-campaign">
      <h2>Crear Nueva Campaña</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label>Título *</label>
          <input name="titulo" value={form.titulo} onChange={handleChange} onBlur={handleBlur} className={errors.titulo ? 'error' : ''} />
          {errors.titulo && <span className="error">{errors.titulo}</span>}
        </div>
        <div className="field">
          <label>Descripción *</label>
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} onBlur={handleBlur} className={errors.descripcion ? 'error' : ''} rows="4" />
          {errors.descripcion && <span className="error">{errors.descripcion}</span>}
        </div>
        <div className="field">
          <label>Categoría *</label>
          <input name="categoria" value={form.categoria} onChange={handleChange} onBlur={handleBlur} className={errors.categoria ? 'error' : ''} placeholder="Ej: Arte" />
          {errors.categoria && <span className="error">{errors.categoria}</span>}
        </div>
        <div className="field">
          <label>Meta de financiamiento *</label>
          <input type="number" step="0.01" name="meta_financiera" value={form.meta_financiera} onChange={handleChange} onBlur={handleBlur} className={errors.meta_financiera ? 'error' : ''} min="0.01" />
          {errors.meta_financiera && <span className="error">{errors.meta_financiera}</span>}
        </div>
        <div className="field">
          <label>Fecha límite *</label>
          <input type="date" name="fecha_limite" value={form.fecha_limite} onChange={handleChange} onBlur={handleBlur} className={errors.fecha_limite ? 'error' : ''} min={today} />
          {errors.fecha_limite && <span className="error">{errors.fecha_limite}</span>}
        </div>
        <div className="field">
          <label>Información del creador *</label>
          <textarea name="informacion_creador" value={form.informacion_creador} onChange={handleChange} onBlur={handleBlur} className={errors.informacion_creador ? 'error' : ''} rows="3" placeholder="Tu información" />
          {errors.informacion_creador && <span className="error">{errors.informacion_creador}</span>}
        </div>
        {submitError && <div className="submit-error">{submitError}</div>}
        <button type="submit" className="btn-submit" disabled={disabled}>Publicar Campaña</button>
      </form>
    </div>
  );
}