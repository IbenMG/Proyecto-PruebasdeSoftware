import { useState } from 'react';
import Login from './login.jsx';
import Registro from './registro.jsx';

function App() {
  const [vista, setVista] = useState('login');
  const [mensaje, setMensaje] = useState('');

  if (vista === 'registro') {
    return (
      <Registro
        onVolver={() => setVista('login')}
        onRegistroSuccess={() => {
          setMensaje('Cuenta creada correctamente. Ya puedes iniciar sesión.');
          setVista('login');
        }}
      />
    );
  }

  if (vista === 'principal') {
    return (
      <div
        className="main-container"
        style={{ padding: '2rem', textAlign: 'center' }}
      >
        <h1>¡Bienvenido al sistema principal!</h1>
        <p>Has iniciado sesión exitosamente.</p>

        <button
          onClick={() => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setMensaje('');
            setVista('login');
          }}
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <Login
      mensaje={mensaje}
      onLoginSuccess={() => {
        setMensaje('');
        setVista('principal');
      }}
      onRegistro={() => {
        setMensaje('');
        setVista('registro');
      }}
    />
  );
}

export default App;