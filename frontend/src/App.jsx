import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Login from './login.jsx';
import Registro from './registro.jsx';
import CreateCampaign from './pages/CreateCampaign.jsx';
import MyCampaigns from './pages/MyCampaigns.jsx';
import SearchCampaigns from './pages/SearchCampaigns.jsx';
import CampaignDetail from './pages/CampaignDetail.jsx';
import CampaignSearch from './components/CampaignSearch.jsx';
import CampaignCard from './components/CampaignCard.jsx';
import Brand from './components/Brand.jsx';
import { api } from './services/api.js';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('access_token')));
  const [mensaje, setMensaje] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

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
    <>
    {(isLoggedIn || location.pathname.startsWith('/campaigns/')) && (
      <header className="site-header">
        <Link to="/" className="brand-link" aria-label="CrowdStarter, inicio">
          <Brand variant="mark" />
        </Link>
        <CampaignSearch compact />
        <div className="header-actions">
          {isLoggedIn ? <>
            <nav aria-label="Navegación principal"><NavLink to="/main">Inicio</NavLink><NavLink to="/campaigns/my">Mis campañas</NavLink></nav>
            <button className="btn-secondary logout" onClick={logout}>Cerrar sesión</button>
          </> : <Link to="/" className="hero-cta">Iniciar sesión</Link>}
        </div>
      </header>
    )}
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
      <Route path="/main" element={isLoggedIn ? <Dashboard /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/create" element={isLoggedIn ? <CreateCampaign key="crear" /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/my" element={isLoggedIn ? <MyCampaigns /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/search" element={isLoggedIn ? <SearchCampaigns /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/:id/edit" element={isLoggedIn ? <CreateCampaign key="editar" editar /> : <Navigate to="/" replace />} />
      <Route path="/campaigns/:id" element={<CampaignDetail />} />
      <Route path="*" element={<Navigate to={isLoggedIn ? '/main' : '/'} replace />} />
    </Routes>
    </>
  );
}

function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignsError, setCampaignsError] = useState('');

  useEffect(() => {
    let activo = true;
    api.getCampaigns()
      .then(data => {
        if (activo) setCampaigns(data);
      })
      .catch(() => {
        if (activo) setCampaignsError('No se pudieron cargar las campañas. Inténtalo nuevamente más tarde.');
      })
      .finally(() => {
        if (activo) setLoadingCampaigns(false);
      });
    return () => { activo = false; };
  }, []);

  return (
    <main className="dashboard">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <p className="eyebrow">IDEAS LOCALES. POSIBILIDADES EN GRANDE.</p>
          <h1>El próximo gran proyecto<br />puede empezar contigo.</h1>
          <p>Descubre campañas, comparte tu idea y construye algo que importe.</p>
          <Link to="/campaigns/create" className="hero-cta">Crear campaña</Link>
        </div>
        <div className="hero-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="seed">↗</span><span className="art-note">Una idea.<br />Un nuevo comienzo.</span></div>
      </section>
      <section className="community-campaigns" aria-labelledby="community-campaigns-title">
        <div className="community-campaigns-heading">
          <div>
            <p className="eyebrow">DESCUBRE Y PARTICIPA</p>
            <h2 id="community-campaigns-title">Campañas de la comunidad</h2>
          </div>
          <div className="community-campaigns-actions">
            <Link to="/campaigns/my" className="community-link">Ver mis campañas</Link>
            <span className="community-count">{campaigns.length} proyectos</span>
          </div>
        </div>
        {loadingCampaigns && <p className="campaigns-state" aria-live="polite">Cargando campañas…</p>}
        {campaignsError && <p className="campaigns-state campaigns-state-error" aria-live="polite">{campaignsError}</p>}
        {!loadingCampaigns && !campaignsError && campaigns.length === 0 && (
          <div className="campaigns-state campaigns-state-empty">
            <p>Aún no hay campañas publicadas.</p>
            <Link to="/campaigns/create" className="btn-create">Crear primera campaña</Link>
          </div>
        )}
        {!loadingCampaigns && !campaignsError && campaigns.length > 0 && (
          <div className="campaigns-grid">
            {campaigns.map(campaign => <CampaignCard campaign={campaign} key={campaign.id} />)}
          </div>
        )}
      </section>
      <details className="quick-help"><summary>¿Cómo empezar?</summary><ol><li>Usa la búsqueda para encontrar una campaña y abre su detalle.</li><li>Selecciona Crear campaña para presentar tu proyecto; los campos tienen indicaciones.</li><li>En Mis campañas puedes abrir tus proyectos para editarlos o eliminarlos.</li></ol></details>
      <footer className="dashboard-footer">CrowdStarter <span>Las buenas ideas se construyen en comunidad.</span></footer>
    </main>
  );
}

export default App;
