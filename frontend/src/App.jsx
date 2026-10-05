import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './login.jsx';
import CreateCampaign from './pages/CreateCampaign.jsx';
import MyCampaigns from './pages/MyCampaigns.jsx';
import SearchCampaigns from './pages/SearchCampaigns.jsx';
import CampaignDetail from './pages/CampaignDetail.jsx';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('access_token'));

  const login = () => setIsLoggedIn(true);
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsLoggedIn(false);
  };

  return (
    <Routes>
      <Route path="/" element={!isLoggedIn ? <Login onLoginSuccess={login} /> : <Navigate to="/main" replace />} />
      {isLoggedIn ? (
        <>
          <Route path="main" element={<Dashboard onLogout={logout} />} />
          <Route path="campaigns/create" element={<CreateCampaign />} />
          <Route path="campaigns/my" element={<MyCampaigns />} />
          <Route path="campaigns/search" element={<SearchCampaigns />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/" replace />} />
      )}
    </Routes>
  );
}

function Dashboard({ onLogout }) {
  return (
    <div className="main-container" style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>¡Bienvenido al sistema principal!</h1>
      <p>Has iniciado sesión exitosamente.</p>
      <button onClick={onLogout} style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}>
        Cerrar Sesión
      </button>
    </div>
  );
}

export default App;