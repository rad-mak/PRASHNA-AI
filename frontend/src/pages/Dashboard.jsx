import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

export default function Dashboard() {
    const { user } = useAuth();
    const [performance, setPerformance] = useState(null);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.getPerformance().catch(() => null),
            api.listQuizzes().catch(() => []),
        ]).then(([perf, quiz]) => {
            setPerformance(perf);
            setQuizzes(quiz || []);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div>
                <div className="page-header"><div className="skeleton skeleton-title" /></div>
                <div className="stats-grid">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '120px' }} />)}</div>
            </div>
        );
    }

    const stats = [
        { label: 'Quizzes Taken', value: performance?.total_quizzes || 0, change: null },
        { label: 'Questions Answered', value: performance?.total_questions_answered || 0, change: null },
        { label: 'Overall Accuracy', value: `${Math.round((performance?.overall_accuracy || 0) * 100)}%`, change: performance?.overall_accuracy > 0.7 ? 'positive' : performance?.overall_accuracy < 0.4 ? 'negative' : null },
        { label: 'Elo Rating', value: Math.round(performance?.current_elo || user?.elo_rating || 1000), change: null },
    ];

    return (
        <div>
            <div className="page-header">
                <h1>Welcome back, {user?.name?.split(' ')[0] || 'Learner'}</h1>
                <p>Continue your adaptive learning journey</p>
            </div>

            <div className="stats-grid stagger-children">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-card">
                        <div className="stat-label">{stat.label}</div>
                        <div className="stat-value">{stat.value}</div>
                        {stat.change && <div className={`stat-change ${stat.change}`}>{stat.change === 'positive' ? '↑ Strong' : '↓ Needs work'}</div>}
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
                <Link to="/upload" className="btn btn-primary btn-lg">↑ Upload Content</Link>
                <Link to="/generate" className="btn btn-secondary btn-lg">✦ Generate Quiz</Link>
                <Link to="/analytics" className="btn btn-outline btn-lg">◎ View Analytics</Link>
            </div>

            {/* Weak Areas */}
            {performance?.weak_areas?.length > 0 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h3>Areas to Improve</h3>
                        <span className="badge badge-hard">Focus Needed</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {performance.weak_areas.map((area, i) => (
                            <span key={i} className="tag tag-primary">{area}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {performance?.recommendations?.length > 0 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '12px' }}>Recommendations</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {performance.recommendations.map((rec, i) => (
                            <div key={i} style={{
                                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-secondary)', fontSize: '0.88rem',
                                color: 'var(--text-secondary)', lineHeight: '1.5',
                            }}>
                                → {rec}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Quizzes */}
            <div>
                <h3 style={{ marginBottom: '16px' }}>Recent Quizzes</h3>
                {quizzes.length === 0 ? (
                    <div className="empty-state">
                        <h3>No quizzes yet</h3>
                        <p>Upload some content and generate your first quiz!</p>
                        <Link to="/upload" className="btn btn-primary">Get Started</Link>
                    </div>
                ) : (
                    <div className="cards-grid stagger-children">
                        {quizzes.slice(0, 6).map(q => (
                            <div key={q.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                    <h4 style={{ fontSize: '0.95rem' }}>{q.title}</h4>
                                    <span className={`badge badge-${q.difficulty}`}>{q.difficulty}</span>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                                    {q.question_count} questions • {new Date(q.created_at).toLocaleDateString()}
                                </div>
                                {q.score !== null && q.score !== undefined ? (
                                    <div>
                                        <div className="progress-bar" style={{ marginBottom: '6px' }}>
                                            <div className="progress-bar-fill" style={{ width: `${q.score}%`, background: q.score >= 70 ? 'var(--color-success)' : q.score >= 40 ? 'var(--color-warning)' : 'var(--color-danger)' }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: q.score >= 70 ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                                            {q.score}% Score
                                        </span>
                                    </div>
                                ) : (
                                    <Link to={`/quiz/${q.id}`} className="btn btn-outline btn-sm">Take Quiz →</Link>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
