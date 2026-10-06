import { useState } from 'react';
import { Routes, Route, Navigate, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Login from './login.jsx';
import Registro from './registro.jsx';
import CreateCampaign from './pages/CreateCampaign.jsx';
import MyCampaigns from './pages/MyCampaigns.jsx';
import SearchCampaigns from './pages/SearchCampaigns.jsx';
import CampaignDetail from './pages/CampaignDetail.jsx';
import CampaignSearch from './components/CampaignSearch.jsx';

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
        <Link to="/" className="brand" aria-label="CrowdStarter, inicio"><span className="brand-mark" aria-hidden="true">c.</span>CrowdStarter</Link>
        {isLoggedIn ? <>
          <nav aria-label="Navegación principal"><NavLink to="/main">Inicio</NavLink><NavLink to="/campaigns/my">Mis campañas</NavLink></nav>
          <button className="btn-secondary logout" onClick={logout}>Cerrar sesión</button>
        </> : <Link to="/" className="hero-cta">Iniciar sesión</Link>}
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
      <section className="discover-section">
        <p className="eyebrow">EXPLORA LA COMUNIDAD</p>
        <h2>Encuentra una idea que te inspire.</h2>
        <CampaignSearch />
      </section>
      <nav className="dashboard-actions" aria-label="Campañas">
        <Link to="/campaigns/my" className="action-card"><span className="action-number" aria-hidden="true">01 /</span><strong>Ver mis campañas</strong><span>Revisa tus proyectos y su progreso.</span><span className="action-arrow" aria-hidden="true">↗</span></Link>
        <Link to="/campaigns/search" className="action-card"><span className="action-number" aria-hidden="true">02 /</span><strong>Buscar campañas</strong><span>Explora proyectos por su nombre.</span><span className="action-arrow" aria-hidden="true">↗</span></Link>
      </nav>
      <details className="quick-help"><summary>¿Cómo empezar?</summary><ol><li>Usa la búsqueda para encontrar una campaña y abre su detalle.</li><li>Selecciona Crear campaña para presentar tu proyecto; los campos tienen indicaciones.</li><li>En Mis campañas puedes abrir tus proyectos para editarlos o eliminarlos.</li></ol></details>
      <footer className="dashboard-footer">CrowdStarter <span>Las buenas ideas se construyen en comunidad.</span></footer>
    </main>
  );
}

export default App;
