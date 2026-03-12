import React, { useState, useEffect } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Admin() {
    const [tab, setTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [flaggedOnly, setFlaggedOnly] = useState(false);

    useEffect(() => {
        Promise.all([
            api.getAdminUsers().catch(() => []),
            api.getAdminAnalytics().catch(() => null),
            api.getAdminQuestions(flaggedOnly).catch(() => ({ questions: [] })),
        ]).then(([u, a, q]) => {
            setUsers(u || []);
            setAnalytics(a);
            setQuestions(q?.questions || []);
            setLoading(false);
        });
    }, [flaggedOnly]);

    const handleFlag = async (qId) => {
        await api.flagQuestion(qId, 'Flagged by admin for review');
        setQuestions(prev => prev.map(q => q.id === qId ? { ...q, flagged: true } : q));
    };

    const handleDelete = async (qId) => {
        await api.deleteQuestion(qId);
        setQuestions(prev => prev.filter(q => q.id !== qId));
    };

    if (loading) {
        return (
            <div>
                <div className="page-header"><div className="skeleton skeleton-title" /></div>
                <div className="stats-grid">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '120px' }} />)}</div>
            </div>
        );
    }

    const diffData = analytics ? Object.entries(analytics.difficulty_distribution).map(([k, v]) => ({ name: k, value: v })) : [];
    const COLORS = ['#2D6A4F', '#D4A054', '#C0392B'];

    return (
        <div>
            <div className="page-header">
                <h1>Admin Dashboard</h1>
                <p>Platform management and content moderation</p>
            </div>

            <div className="tab-nav">
                <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users</button>
                <button className={`tab-btn ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')}>Platform Analytics</button>
                <button className={`tab-btn ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>Question Moderation</button>
            </div>

            {tab === 'users' && (
                <div className="animate-fade-in">
                    <div className="card">
                        <h3 style={{ marginBottom: '16px' }}>All Users ({users.length})</h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                        <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                                        <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
                                        <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Elo</th>
                                        <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quizzes</th>
                                        <th style={{ textAlign: 'center', padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Accuracy</th>
                                        <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 150ms' }}>
                                            <td style={{ padding: '12px', fontWeight: 600 }}>{u.name}</td>
                                            <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{u.email}</td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}><span className="elo-badge" style={{ fontSize: '0.78rem', padding: '2px 8px' }}>{Math.round(u.elo_rating)}</span></td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>{u.total_quizzes}</td>
                                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: u.overall_accuracy >= 0.7 ? 'var(--color-success)' : 'var(--text-primary)' }}>{Math.round(u.overall_accuracy * 100)}%</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'analytics' && analytics && (
                <div className="animate-fade-in">
                    <div className="stats-grid stagger-children">
                        <div className="stat-card"><div className="stat-label">Total Users</div><div className="stat-value">{analytics.total_users}</div></div>
                        <div className="stat-card"><div className="stat-label">Total Quizzes</div><div className="stat-value">{analytics.total_quizzes}</div></div>
                        <div className="stat-card"><div className="stat-label">Total Questions</div><div className="stat-value">{analytics.total_questions}</div></div>
                        <div className="stat-card"><div className="stat-label">Avg Accuracy</div><div className="stat-value">{Math.round(analytics.avg_accuracy * 100)}%</div></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className="card">
                            <h3 style={{ marginBottom: '16px' }}>Difficulty Distribution</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={diffData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                        {diffData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: '16px' }}>Popular Topics</h3>
                            {analytics.popular_topics?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={analytics.popular_topics.slice(0, 5)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="topic" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Bar dataKey="count" fill="#C4654A" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p style={{ color: 'var(--text-tertiary)' }}>No topic data yet</p>}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'questions' && (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3>Questions ({questions.length})</h3>
                        <button className={`btn btn-sm ${flaggedOnly ? 'btn-danger' : 'btn-outline'}`} onClick={() => setFlaggedOnly(!flaggedOnly)}>
                            {flaggedOnly ? 'Showing Flagged Only' : 'Show Flagged Only'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {questions.map(q => (
                            <div key={q.id} className="card" style={{
                                borderLeft: q.flagged ? '4px solid var(--color-danger)' : '4px solid var(--border-color)',
                                padding: '16px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span>
                                            <span className="tag">{q.type.replace('_', ' ')}</span>
                                            <span className="tag">{q.topic}</span>
                                            {q.flagged && <span className="badge" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>FLAGGED</span>}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '4px' }}>{q.question_text}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Correct: {q.correct_answer} • Elo: {Math.round(q.elo_rating)}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                                        {!q.flagged && <button className="btn btn-outline btn-sm" onClick={() => handleFlag(q.id)}>Flag</button>}
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q.id)}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {questions.length === 0 && (
                            <div className="empty-state"><h3>No questions found</h3></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
