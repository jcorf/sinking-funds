import React, { useState } from 'react';
import './Login.css';
import { login } from '../../utils/api';

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const result = await login(username, password);
            if (result.success) {
                onLoginSuccess();
            } else {
                setError(result.error || 'Invalid credentials');
            }
        } catch (err) {
            setError('Unable to reach the server');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            <form className="login-form" onSubmit={handleSubmit}>
                <h1>Sinking Funds</h1>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {error && <div className="login-error">{error}</div>}
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Logging in...' : 'Log in'}
                </button>
            </form>
        </div>
    );
};

export default Login;
