import { useState } from 'react';
import Login from './login.jsx';

function App() {
  // Estado para saber si el usuario está autenticado
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div>
      {!isLoggedIn ? (
        // Si no ha iniciado sesión, muestra el Login y le pasa una función para cambiar el estado
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
      ) : (
        // Si ya inició sesión, muestra la vista principal (Main)
        <div className="main-container" style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>¡Bienvenido al sistema principal!</h1>
          <p>Has iniciado sesión exitosamente.</p>
          <button 
            onClick={() => setIsLoggedIn(false)}
            style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}
          >
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default App;