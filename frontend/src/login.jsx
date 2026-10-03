import { useState } from 'react';
import './login.css';

export default function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);

        try {
            const response = fetch('http://localhost:8000/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = response.json();

            if (response.ok) {
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);
                onLoginSuccess();
            } else {
                setError('Contraseña o usuario incorrecto. Por favor, inténtalo de nuevo.');
            }
        
        } catch (error) {
            setError('Error al iniciar sesión. Por favor, inténtalo de nuevo más tarde.');
        }

        
        

        console.log("Iniciando sesión con:", { username, password });

        
        
        if (onLoginSuccess) {
        onLoginSuccess();
        }
    };

    return (
        <div className="login-container">
        <div className="login-card">
            <h2>Iniciar Sesión</h2>
            <form onSubmit={handleSubmit}>
            <div className="input-group">
                <label>Usuario</label>
                <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Ingresa tu usuario"
                required
                />
            </div>
            <div className="input-group">
                <label>Contraseña</label>
                <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required
                />
            </div>
            <button type="submit" className="btn-submit">Entrar</button>
            </form>
        </div>
        </div>
    );
}