import React, { useState, useEffect } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Analytics() {
    const [performance, setPerformance] = useState(null);
    const [weakAreas, setWeakAreas] = useState([]);
    const [predictions, setPredictions] = useState({});
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    useEffect(() => {
        Promise.all([
            api.getPerformance().catch(() => null),
            api.getWeakAreas().catch(() => ({ weak_areas: [] })),
            api.getPredictions().catch(() => ({ predictions: {} })),
        ]).then(([perf, weak, pred]) => {
            setPerformance(perf);
            setWeakAreas(weak?.weak_areas || []);
            setPredictions(pred?.predictions || {});
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div>
                <div className="page-header"><div className="skeleton skeleton-title" /></div>
                <div className="stats-grid">{[1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '120px' }} />)}</div>
            </div>
        );
    }

    if (!performance) {
        return (
            <div className="empty-state">
                <h3>No analytics data yet</h3>
                <p>Complete some quizzes to see your performance analytics</p>
            </div>
        );
    }

    const topicChartData = performance.topic_performance?.map(tp => ({
        topic: tp.topic.length > 15 ? tp.topic.slice(0, 15) + '...' : tp.topic,
        accuracy: Math.round(tp.accuracy * 100),
        predicted: Math.round(tp.predicted_accuracy * 100),
    })) || [];

    const eloChartData = performance.elo_history?.map((e, i) => ({
        attempt: i + 1,
        elo: e.elo,
    })) || [];

    return (
        <div>
            <div className="page-header">
                <h1>Performance Analytics</h1>
                <p>Track your learning progress and identify areas for improvement</p>
            </div>

            <div className="tab-nav">
                <button className={`tab-btn ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
                <button className={`tab-btn ${tab === 'topics' ? 'active' : ''}`} onClick={() => setTab('topics')}>Topics</button>
                <button className={`tab-btn ${tab === 'predictions' ? 'active' : ''}`} onClick={() => setTab('predictions')}>Predictions</button>
                <button className={`tab-btn ${tab === 'weakareas' ? 'active' : ''}`} onClick={() => setTab('weakareas')}>Weak Areas</button>
            </div>

            {tab === 'overview' && (
                <div className="animate-fade-in">
                    <div className="stats-grid stagger-children">
                        <div className="stat-card">
                            <div className="stat-label">Total Quizzes</div>
                            <div className="stat-value">{performance.total_quizzes}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Questions Answered</div>
                            <div className="stat-value">{performance.total_questions_answered}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Overall Accuracy</div>
                            <div className="stat-value" style={{ color: performance.overall_accuracy >= 0.7 ? 'var(--color-success)' : 'var(--text-primary)' }}>
                                {Math.round(performance.overall_accuracy * 100)}%
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Current Elo</div>
                            <div className="stat-value">{Math.round(performance.current_elo)}</div>
                        </div>
                    </div>

                    {/* Elo Progress */}
                    {eloChartData.length > 1 && (
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <h3 style={{ marginBottom: '16px' }}>Elo Rating Progress</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={eloChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="attempt" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} label={{ value: 'Attempt', position: 'bottom', fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                                    <Line type="monotone" dataKey="elo" stroke="#C4654A" strokeWidth={2} dot={{ fill: '#C4654A', r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Strong & Weak */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div className="card">
                            <h3 style={{ marginBottom: '12px', color: 'var(--color-success)' }}>Strong Areas</h3>
                            {performance.strong_areas?.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {performance.strong_areas.map((a, i) => <span key={i} className="tag tag-secondary">{a}</span>)}
                                </div>
                            ) : <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Keep practicing to build strong areas!</p>}
                        </div>
                        <div className="card">
                            <h3 style={{ marginBottom: '12px', color: 'var(--color-danger)' }}>Needs Improvement</h3>
                            {performance.weak_areas?.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {performance.weak_areas.map((a, i) => <span key={i} className="tag tag-primary">{a}</span>)}
                                </div>
                            ) : <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No weak areas detected yet!</p>}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'topics' && (
                <div className="animate-fade-in">
                    <div className="card">
                        <h3 style={{ marginBottom: '16px' }}>Topic-wise Accuracy</h3>
                        {topicChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topicChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="topic" tick={{ fontSize: 11 }} width={120} />
                                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                                    <Bar dataKey="accuracy" fill="#2D6A4F" radius={[0, 4, 4, 0]} name="Accuracy %" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p style={{ color: 'var(--text-tertiary)' }}>No topic data available yet</p>}
                    </div>
                </div>
            )}

            {tab === 'predictions' && (
                <div className="animate-fade-in">
                    <div className="card">
                        <h3 style={{ marginBottom: '8px' }}>Performance Predictions</h3>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                            ML-powered predictions of your expected accuracy per topic
                        </p>
                        {Object.entries(predictions).length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {Object.entries(predictions).map(([topic, pred]) => (
                                    <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <span style={{ width: '120px', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>{topic}</span>
                                        <div className="progress-bar" style={{ flex: 1 }}>
                                            <div className="progress-bar-fill" style={{
                                                width: `${pred.predicted_accuracy * 100}%`,
                                                background: pred.predicted_accuracy > 0.7 ? 'var(--color-success)' : pred.predicted_accuracy > 0.4 ? 'var(--color-warning)' : 'var(--color-danger)',
                                            }} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, width: '45px', textAlign: 'right' }}>
                                            {Math.round(pred.predicted_accuracy * 100)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : <p style={{ color: 'var(--text-tertiary)' }}>Take more quizzes to see predictions</p>}
                    </div>
                </div>
            )}

            {tab === 'weakareas' && (
                <div className="animate-fade-in">
                    {weakAreas.length > 0 ? (
                        <div className="cards-grid stagger-children">
                            {weakAreas.map((wa, i) => (
                                <div key={i} className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
                                    <h4 style={{ marginBottom: '8px' }}>{wa.topic}</h4>
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Accuracy</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-danger)' }}>{Math.round(wa.accuracy * 100)}%</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Attempts</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{wa.total_attempts}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Avg Time</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{wa.avg_time_seconds}s</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        → {wa.suggestion}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <h3>No weak areas detected</h3>
                            <p>Keep taking quizzes — we will identify areas where you need more practice</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
