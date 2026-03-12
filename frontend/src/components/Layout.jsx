import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(localStorage.getItem('prashna_theme') || 'light');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('prashna_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/', label: 'Dashboard', marker: '◈' },
        { path: '/upload', label: 'Upload Content', marker: '↑' },
        { path: '/generate', label: 'Generate Quiz', marker: '✦' },
        { path: '/analytics', label: 'Analytics', marker: '◎' },
        { path: '/profile', label: 'Profile', marker: '○' },
    ];

    if (user?.email === 'radhamakwana28@gmail.com') {
        navItems.push({ path: '/admin', label: 'Admin Panel', marker: '⊞' });
    }

    return (
        <div className="app-layout">
            <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <h2>Prashna-AI</h2>
                    <span>Adaptive Quiz Engine</span>
                </div>
                <ul className="sidebar-nav">
                    {navItems.map(item => (
                        <li key={item.path} className="sidebar-nav-item">
                            <NavLink
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) => isActive ? 'active' : ''}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <span className="nav-marker">{item.marker}</span>
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </aside>

            <div className="app-main">
                <header className="app-topbar">
                    <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none' }}>
                        ≡
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Welcome, <strong style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</strong>
                        </span>
                        {user?.elo_rating && (
                            <span className="elo-badge">{Math.round(user.elo_rating)} ELO</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} />
                        <button className="btn btn-outline btn-sm" onClick={handleLogout}>
                            Sign Out
                        </button>
                    </div>
                </header>
                <main className="app-content animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
