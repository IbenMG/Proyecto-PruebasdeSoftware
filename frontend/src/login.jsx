import { useState } from 'react';
import './login.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [error, setError] = useState(null);

    const validateEmail = () => {
        const err = email && !EMAIL_REGEX.test(email) ? 'Formato de correo inválido' : '';
        setEmailError(err);
        return !err;
    };
    const validatePassword = () => {
        const err = password.trim() ? '' : 'Contraseña requerida';
        setPasswordError(err);
        return !err;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!validateEmail() | !validatePassword()) return;

        try {
            const response = await fetch('http://localhost:8000/api/token/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('access_token', data.access);
                localStorage.setItem('refresh_token', data.refresh);
                onLoginSuccess();
            } else {
                setError('Credenciales incorrectas');
            }
        } catch {
            setError('Error de conexión');
        }
    };

    const disabled = emailError || passwordError || !email || !password;

    return (
        <div className="login-container">
        <div className="login-card">
                <h2>Iniciar Sesión</h2>
                <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Correo electrónico</label>
                    <input 
                    type="email"
                    className={emailError ? 'error' : ''}
                    
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    onBlur={validateEmail}
                    placeholder="correo@ejemplo.com"
                    />
                    {emailError && <span className="error-message">{emailError}</span>}
                    </div>
                    <div className="input-group">
                        <label>Contraseña</label>
                        <input 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)}
                        onBlur={validatePassword}
                        placeholder="••••••••"
                        />
                        {passwordError && <span className="error-message">{passwordError}</span>}
                    </div>
                    <button type="submit" className="btn-submit" disabled={disabled}>Entrar</button>
                    {error && <p className="error-message" style={{textAlign:'center',marginTop:'0.5rem'}}>{error}</p>}
                </form>
            </div>
        </div>
    );
}