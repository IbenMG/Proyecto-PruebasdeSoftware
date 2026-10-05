import { useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './login.jsx';
import Registro from './registro.jsx';
import CreateCampaign from './pages/CreateCampaign.jsx';
import MyCampaigns from './pages/MyCampaigns.jsx';
import SearchCampaigns from './pages/SearchCampaigns.jsx';
import CampaignDetail from './pages/CampaignDetail.jsx';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('access_token')));
  const [mensaje, setMensaje] = useState('');
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsLoggedIn(false);
    setMensaje('');
    navigate('/', { replace: true });
  }

  const login = (
    <Login
      mensaje={mensaje}
      onLoginSuccess={() => {
        setIsLoggedIn(true);
        setMensaje('');
        navigate('/main', { replace: true });
      }}
      onRegistro={() => {
        setMensaje('');
        navigate('/registro');
      }}
    />
  );

  return (
    <Routes>
      <Route path="/" element={isLoggedIn ? <Navigate to="/main" replace /> : login} />
      <Route path="/registro" element={isLoggedIn ? <Navigate to="/main" replace /> : (
        <Registro
          onVolver={() => navigate('/')}
          onRegistroSuccess={() => {
            setMensaje('Cuenta creada correctamente. Ya puedes iniciar sesión.');
            navigate('/', { replace: true });
          }}
        />
      )} />
      <Route path="/main" element={isLoggedIn ? <Dashboard onLogout={logout} /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/create" element={isLoggedIn ? <CreateCampaign key="crear" /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/my" element={isLoggedIn ? <MyCampaigns /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/search" element={isLoggedIn ? <SearchCampaigns /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/:id/edit" element={isLoggedIn ? <CreateCampaign key="editar" editar /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/:id" element={<CampaignDetail />} />
      <Route path="*" element={<Navigate to={isLoggedIn ? '/main' : '/'} replace />} />
    </Routes>
  );
}

function Dashboard({ onLogout }) {
  return (
    <div className="main-container" style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>¡Bienvenido al sistema principal!</h1>
      <p>Has iniciado sesión exitosamente.</p>
      <nav aria-label="Campañas" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', margin: '1rem' }}>
        <Link to="/campaigns/create">Crear campaña</Link>
        <Link to="/campaigns/my">Ver mis campañas</Link>
        <Link to="/campaigns/search">Buscar campañas</Link>
      </nav>
      <button className="btn-secondary" onClick={onLogout} style={{ maxWidth: '240px' }}>Cerrar sesión</button>
    </div>
  );
}

export default App;
