import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './main.css'; 
import App from './App.jsx'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
export default function Main({ onLogout }) {
  return (
    <div className="main-container">
      <header className="main-header">
        <h1>Panel Principal</h1>
        <button onClick={onLogout} className="btn-logout">
          Cerrar Sesión
        </button>
      </header>
      
      <main className="main-content">
        <div className="card-welcome">
          <h2>¡Bienvenido al sistema!</h2>
          <p>Aquí podrás gestionar tus datos y ver la información del proyecto.</p>
        </div>
      </main>
    </div>
  );
}