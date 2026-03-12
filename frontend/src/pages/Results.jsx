import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Results() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const results = location.state?.results;

    if (!results) {
        return (
            <div className="empty-state">
                <h3>No results available</h3>
                <p>Complete a quiz to see your results</p>
                <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Dashboard</button>
            </div>
        );
    }

    const scoreColor = results.score_percentage >= 70 ? 'var(--color-success)' : results.score_percentage >= 40 ? 'var(--color-warning)' : 'var(--color-danger)';

    const pieData = [
        { name: 'Correct', value: results.correct_count },
        { name: 'Incorrect', value: results.total_questions - results.correct_count },
    ];
    const COLORS = ['var(--color-success)', 'var(--color-danger)'];

    // Topic analysis
    const topicMap = {};
    results.question_results.forEach(r => {
        const topic = r.question_text.slice(0, 20);
        if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
        topicMap[topic].total++;
        if (r.is_correct) topicMap[topic].correct++;
    });

    return (
        <div className="animate-slide-up">
            <div className="page-header">
                <h1>Quiz Results</h1>
                <p>Here is how you performed</p>
            </div>

            {/* Score Summary */}
            <div className="result-summary-grid stagger-children">
                <div className="stat-card" style={{ borderLeft: `4px solid ${scoreColor}` }}>
                    <div className="stat-label">Score</div>
                    <div className="stat-value" style={{ color: scoreColor }}>{results.score_percentage}%</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                        {results.correct_count}/{results.total_questions} correct
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Avg. Time</div>
                    <div className="stat-value">{results.avg_time_per_question}s</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>per question</div>
                </div>

                <div className="stat-card" style={{ borderLeft: `4px solid ${results.elo_change >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
                    <div className="stat-label">Elo Change</div>
                    <div className="stat-value" style={{ color: results.elo_change >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {results.elo_change >= 0 ? '+' : ''}{results.elo_change}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                        {results.elo_before} → {results.elo_after}
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Score Breakdown</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                {pieData.map((entry, i) => <Cell key={i} fill={i === 0 ? '#2D6A4F' : '#C0392B'} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Difficulty Progression</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={results.difficulty_progression.map((d, i) => ({ q: `Q${i + 1}`, difficulty: d === 'easy' ? 1 : d === 'medium' ? 2 : 3 }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="q" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} domain={[0, 3]} ticks={[1, 2, 3]} tickFormatter={v => v === 1 ? 'Easy' : v === 2 ? 'Med' : 'Hard'} />
                            <Bar dataKey="difficulty" fill="#C4654A" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recommendations */}
            {results.recommendations?.length > 0 && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '12px' }}>Recommendations</h3>
                    {results.recommendations.map((rec, i) => (
                        <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', marginBottom: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            → {rec}
                        </div>
                    ))}
                </div>
            )}

            {/* Question Review */}
            <div className="card">
                <h3 style={{ marginBottom: '16px' }}>Question Review</h3>
                {results.question_results.map((qr, i) => (
                    <div key={i} style={{
                        padding: '14px 16px', borderRadius: 'var(--radius-md)',
                        background: qr.is_correct ? 'var(--color-secondary-light)' : 'var(--color-danger-light)',
                        marginBottom: '10px', borderLeft: `3px solid ${qr.is_correct ? 'var(--color-success)' : 'var(--color-danger)'}`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>
                                Q{i + 1}. {qr.question_text}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: qr.is_correct ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                    {qr.is_correct ? '✓ Correct' : '✗ Wrong'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{qr.time_taken_seconds}s</span>
                            </div>
                        </div>
                        {!qr.is_correct && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                Your answer: <strong>{qr.user_answer}</strong> — Correct: <strong>{qr.correct_answer}</strong>
                            </div>
                        )}
                        {qr.explanation && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px', fontStyle: 'italic' }}>
                                {qr.explanation}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/generate')}>Generate Another Quiz</button>
                <button className="btn btn-outline btn-lg" onClick={() => navigate('/')}>Back to Dashboard</button>
            </div>
        </div>
    );
}
