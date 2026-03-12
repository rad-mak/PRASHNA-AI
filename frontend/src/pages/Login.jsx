import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('prashna_theme') === 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const toggleTheme = () => {
        setDarkMode(prev => {
            const next = !prev;
            localStorage.setItem('prashna_theme', next ? 'dark' : 'light');
            return next;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <button onClick={toggleTheme} className="land-theme-toggle" aria-label="Toggle theme" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 50 }}>
                <span className="land-theme-icon">{darkMode ? '☀' : '☾'}</span>
            </button>
            <div className="auth-left">
                <div className="auth-form-container animate-slide-up">
                    <div className="auth-brand">
                        <h1>Prashna-AI</h1>
                        <p>Sign in to your adaptive learning workspace</p>
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-danger-light)',
                            color: 'var(--color-danger)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            marginBottom: '20px',
                            animation: 'fadeSlideUp 300ms ease both',
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                id="login-email"
                                type="email"
                                className="form-input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                id="login-password"
                                type="password"
                                className="form-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            className="btn btn-primary btn-full btn-lg"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="auth-switch">
                        Don't have an account? <Link to="/register">Create one</Link>
                    </div>
                </div>
            </div>
            <div className="auth-right">
                <div className="auth-right-content animate-fade-in">
                    <h2>Learn Smarter with AI-Powered Quizzes</h2>
                    <p>Upload any study material and let our AI generate personalized, adaptive quizzes that evolve with your learning journey.</p>
                    <ul className="auth-features">
                        <li>Generate quizzes from PDFs, text, or URLs</li>
                        <li>Adaptive difficulty powered by Elo rating</li>
                        <li>4 question types: MCQ, True/False, Fill-blank, Short Answer</li>
                        <li>Real-time performance analytics and insights</li>
                        <li>Knowledge graph visualization of your learning</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
