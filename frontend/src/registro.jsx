import { useState } from 'react';
import './login.css';

const campos = [
  ['username', 'Nombre de usuario', 'text'],
  ['email', 'Correo electrónico', 'email'],
  ['password', 'Contraseña', 'password'],
  ['fecha_nacimiento', 'Fecha de nacimiento', 'date'],
];

export default function Registro({ onRegistroSuccess, onVolver }) {
  const [datos, setDatos] = useState({
    username: '',
    email: '',
    password: '',
    fecha_nacimiento: '',
  });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrores({});

    const hoy = new Date();
    const [anio, mes, dia] = datos.fecha_nacimiento.split('-').map(Number);

    if (
      anio > hoy.getFullYear() ||
      (anio === hoy.getFullYear() && mes > hoy.getMonth() + 1) ||
      (anio === hoy.getFullYear() &&
        mes === hoy.getMonth() + 1 &&
        dia > hoy.getDate())
    ) {
      setErrores({
        fecha_nacimiento: ['La fecha de nacimiento no puede ser futura.'],
      });
      return;
    }

    const cumplePendiente =
      mes > hoy.getMonth() + 1 ||
      (mes === hoy.getMonth() + 1 && dia > hoy.getDate());

    const edad = hoy.getFullYear() - anio - Number(cumplePendiente);

    if (edad < 18) {
      setErrores({
        fecha_nacimiento: ['Debes ser mayor de 18 años para registrarte'],
      });
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch('http://localhost:8000/api/registro/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });

      const resultado = await response.json();

      if (!response.ok) {
        setErrores(
          response.status === 400
            ? resultado
            : { general: ['No se pudo completar el registro.'] }
        );
        return;
      }

      onRegistroSuccess();
    } catch {
      setErrores({
        general: ['No se pudo conectar con el servidor. Inténtalo nuevamente.'],
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-container">
      <aside className="auth-story">
        <span className="brand"><span className="brand-mark" aria-hidden="true">c.</span>CrowdStarter</span>
        <p className="eyebrow">EL COMIENZO DE ALGO GRANDE</p>
        <h1>Tu idea merece<br />dar el primer paso.</h1>
        <p>Un espacio para compartir proyectos y conectar con quienes creen en ellos.</p>
        <div className="auth-decoration" aria-hidden="true">↗</div>
      </aside>
      <div className="login-card">
        <h2>Crear cuenta</h2>

        <form onSubmit={handleSubmit}>
          {campos.map(([nombre, etiqueta, tipo]) => (
            <div className="input-group" key={nombre}>
              <label htmlFor={`registro-${nombre}`}>{etiqueta}</label>
              <input
                id={`registro-${nombre}`}
                name={nombre}
                type={tipo}
                value={datos[nombre]}
                required
                maxLength={nombre === 'username' ? 150 : undefined}
                autoComplete={
                  nombre === 'password'
                    ? 'new-password'
                    : nombre === 'fecha_nacimiento'
                      ? 'bday'
                      : nombre
                }
                disabled={enviando}
                aria-invalid={Boolean(errores[nombre])}
                aria-describedby={
                  errores[nombre] ? `error-${nombre}` : undefined
                }
                onChange={(event) =>
                  setDatos({ ...datos, [nombre]: event.target.value })
                }
              />

              {errores[nombre] && (
                <p id={`error-${nombre}`} role="alert">
                  {errores[nombre].join(' ')}
                </p>
              )}
            </div>
          ))}

          {(errores.general || errores.non_field_errors) && (
            <p role="alert">
              {(errores.general || errores.non_field_errors).join(' ')}
            </p>
          )}

          <button className="btn-submit" type="submit" disabled={enviando}>
            {enviando ? 'Registrando…' : 'Registrarse'}
          </button>
        </form>

        <button className="btn-secondary" type="button" onClick={onVolver} disabled={enviando}>
          Ya tengo una cuenta
        </button>
      </div>
    </div>
  );
}