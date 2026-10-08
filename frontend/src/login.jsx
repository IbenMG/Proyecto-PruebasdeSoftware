import { useState } from 'react';
import './login.css';

export default function Login({ onLoginSuccess, onRegistro, mensaje }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('Contraseña requerida');
      return;
    }
    setEnviando(true);

    try {
      const response = await fetch('http://localhost:8000/api/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          response.status === 401
            ? 'Correo o contraseña incorrectos'
            : 'No se pudo iniciar sesión.'
        );
        return;
      }

      if (!data.access || !data.refresh) {
        setError('El servidor no devolvió una sesión válida.');
        return;
      }

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      onLoginSuccess();
    } catch {
      setError('No se pudo conectar con el servidor. Inténtalo nuevamente.');
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
        <h2>Iniciar sesión</h2>

        {mensaje && <p role="status">{mensaje}</p>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={enviando}
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={enviando}
            />
          </div>

          {error && <p role="alert">{error}</p>}

          <button className="btn-submit" type="submit" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar Sesión'}
          </button>
        </form>

        <button className="btn-secondary" type="button" onClick={onRegistro} disabled={enviando}>
          Crear una cuenta
        </button>
      </div>
    </div>
  );
}