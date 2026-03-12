import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('prashna_theme') === 'dark');
    const [form, setForm] = useState({
        name: '', email: '', password: '', confirmPassword: '',
        preferred_difficulty: 'medium',
        preferred_subjects: [],
        preferred_question_types: ['mcq', 'true_false'],
    });

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

    const subjects = ['Computer Science', 'Mathematics', 'Physics', 'Biology', 'Chemistry', 'History', 'Literature', 'Economics', 'Psychology', 'General Knowledge'];
    const questionTypes = [
        { value: 'mcq', label: 'Multiple Choice' },
        { value: 'true_false', label: 'True / False' },
        { value: 'fill_blank', label: 'Fill in the Blank' },
        { value: 'short_answer', label: 'Short Answer' },
    ];

    const update = (key, val) => setForm(p => ({ ...p, [key]: val }));

    const toggleSubject = (subject) => {
        setForm(p => ({
            ...p,
            preferred_subjects: p.preferred_subjects.includes(subject)
                ? p.preferred_subjects.filter(s => s !== subject)
                : [...p.preferred_subjects, subject],
        }));
    };

    const toggleQType = (type) => {
        setForm(p => ({
            ...p,
            preferred_question_types: p.preferred_question_types.includes(type)
                ? p.preferred_question_types.filter(t => t !== type)
                : [...p.preferred_question_types, type],
        }));
    };

    const handleSubmit = async () => {
        setError('');
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await register({
                name: form.name,
                email: form.email,
                password: form.password,
                preferred_difficulty: form.preferred_difficulty,
                preferred_subjects: form.preferred_subjects,
                preferred_question_types: form.preferred_question_types,
            });
            navigate('/');
        } catch (err) {
            setError(err.message || 'Registration failed');
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
                        <p>Create your learning profile</p>
                    </div>

                    {/* Step indicator */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                        {[1, 2, 3].map(s => (
                            <div key={s} style={{
                                flex: 1, height: '4px', borderRadius: '2px',
                                background: s <= step ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                transition: 'background 300ms ease',
                            }} />
                        ))}
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px 16px', borderRadius: 'var(--radius-md)',
                            background: 'var(--color-danger-light)', color: 'var(--color-danger)',
                            fontSize: '0.85rem', fontWeight: 600, marginBottom: '20px',
                        }}>{error}</div>
                    )}

                    {step === 1 && (
                        <div className="animate-slide-right" key="step1">
                            <h3 style={{ marginBottom: '20px' }}>Account Details</h3>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input id="reg-name" className="form-input" placeholder="Your full name" value={form.name} onChange={e => update('name', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input id="reg-email" type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input id="reg-password" type="password" className="form-input" placeholder="Min. 6 characters" value={form.password} onChange={e => update('password', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <input id="reg-confirm" type="password" className="form-input" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} required />
                            </div>
                            <button className="btn btn-primary btn-full btn-lg" onClick={() => {
                                if (!form.name || !form.email || !form.password) { setError('Please fill all fields'); return; }
                                setError(''); setStep(2);
                            }}>Continue</button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-slide-right" key="step2">
                            <h3 style={{ marginBottom: '8px' }}>Your Interests</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>Select subjects you want to practice</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                                {subjects.map(s => (
                                    <button key={s} className={`tag ${form.preferred_subjects.includes(s) ? 'tag-primary' : ''}`}
                                        onClick={() => toggleSubject(s)}
                                        style={{ cursor: 'pointer', border: 'none' }}
                                    >{s}</button>
                                ))}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Starting Difficulty</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['easy', 'medium', 'hard'].map(d => (
                                        <button key={d} className={`btn ${form.preferred_difficulty === d ? 'btn-primary' : 'btn-outline'} btn-sm`}
                                            onClick={() => update('preferred_difficulty', d)}
                                            style={{ flex: 1, textTransform: 'capitalize' }}>
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-outline btn-full" onClick={() => setStep(1)}>Back</button>
                                <button className="btn btn-primary btn-full" onClick={() => setStep(3)}>Continue</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-slide-right" key="step3">
                            <h3 style={{ marginBottom: '8px' }}>Question Preferences</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>Select question types you prefer</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                {questionTypes.map(qt => (
                                    <div key={qt.value}
                                        className={`option-card ${form.preferred_question_types.includes(qt.value) ? 'selected' : ''}`}
                                        onClick={() => toggleQType(qt.value)}>
                                        <span className="option-label">{form.preferred_question_types.includes(qt.value) ? '✓' : ''}</span>
                                        <span style={{ fontWeight: 500 }}>{qt.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-outline btn-full" onClick={() => setStep(2)}>Back</button>
                                <button className="btn btn-primary btn-full btn-lg" onClick={handleSubmit} disabled={loading}>
                                    {loading ? 'Creating account...' : 'Create Account'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="auth-switch">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </div>
                </div>
            </div>
            <div className="auth-right">
                <div className="auth-right-content animate-fade-in">
                    <h2>Personalized from Day One</h2>
                    <p>Tell us your interests and preferences, and we will craft the perfect learning experience tailored just for you.</p>
                    <ul className="auth-features">
                        <li>AI adapts to your skill level automatically</li>
                        <li>Track progress with detailed analytics</li>
                        <li>Choose your preferred question formats</li>
                        <li>Earn Elo ratings as you improve</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
