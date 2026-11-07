import React, { useRef, useState } from 'react';
import './Login.css';
import { login } from '../../utils/api';

// The app's mark: an open jar with three coins stacked inside and one
// about to drop in through the mouth.
// Single color (currentColor) so it can also serve as a favicon later.
export function JarMark({ size = 40 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M10 9h12" />
            <path d="M11.5 9v1.6C8 12 6 14.6 6 18v6.5a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4V18c0-3.4-2-6-5.5-7.4V9" />
            <g fill="currentColor" stroke="none">
                <ellipse cx="16" cy="25.2" rx="5.6" ry="1.7" />
                <ellipse cx="16" cy="21.7" rx="5.6" ry="1.7" />
                <ellipse cx="16" cy="18.2" rx="5.6" ry="1.7" />
                <circle cx="16" cy="4.2" r="2.4" />
            </g>
        </svg>
    );
}

function EyeIcon({ open }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {!open && <path d="M4 4l16 16" />}
        </svg>
    );
}

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [badCredentials, setBadCredentials] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const passwordRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setBadCredentials(false);
        setIsSubmitting(true);
        try {
            const result = await login(username, password);
            if (result.success) {
                onLoginSuccess();
                return;
            }
            setError("That username and password don't match. Try again.");
            setBadCredentials(true);
            setPassword('');
            passwordRef.current && passwordRef.current.focus();
        } catch (err) {
            setError("Can't reach the server. Make sure the app's backend is running.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="lg-page">
            <div className="lg-frame">
                <section className="lg-welcome">
                    <div className="lg-brand">
                        <JarMark />
                        <span className="lg-wordmark">Sinking Funds</span>
                    </div>
                    <h1 className="lg-headline">Welcome back.</h1>
                    <p className="lg-lede">Let’s sort out this paycheck.</p>
                </section>

                <form className="lg-card" onSubmit={handleSubmit}>
                    <h2 className="lg-card-title">Log in</h2>

                    <div className="lg-field">
                        <label htmlFor="lg-username">Username</label>
                        <input
                            id="lg-username"
                            type="text"
                            autoComplete="username"
                            autoCapitalize="none"
                            spellCheck="false"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                if (error) {
                                    setError('');
                                    setBadCredentials(false);
                                }
                            }}
                            aria-invalid={badCredentials}
                            aria-describedby={error ? 'lg-error' : undefined}
                            autoFocus
                        />
                    </div>

                    <div className="lg-field">
                        <label htmlFor="lg-password">Password</label>
                        <div className="lg-password">
                            <input
                                id="lg-password"
                                ref={passwordRef}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => {
                                setPassword(e.target.value);
                                if (error) {
                                    setError('');
                                    setBadCredentials(false);
                                }
                            }}
                                aria-invalid={badCredentials}
                                aria-describedby={error ? 'lg-error' : undefined}
                            />
                            <button
                                type="button"
                                className="lg-eye"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                aria-pressed={showPassword}
                            >
                                <EyeIcon open={!showPassword} />
                            </button>
                        </div>
                    </div>

                    <p id="lg-error" className="lg-error" role="alert">
                        {error}
                    </p>

                    <button type="submit" className="lg-submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Logging in…' : 'Log in'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
