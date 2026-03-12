import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

export default function Generate() {
    const navigate = useNavigate();
    const location = useLocation();
    const [contentList, setContentList] = useState([]);
    const [selectedContent, setSelectedContent] = useState(location.state?.contentId || '');
    const [questionTypes, setQuestionTypes] = useState(['mcq', 'true_false', 'fill_blank', 'short_answer']);
    const [difficulty, setDifficulty] = useState('medium');
    const [numQuestions, setNumQuestions] = useState(10);
    const [adaptiveMode, setAdaptiveMode] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fetchingContent, setFetchingContent] = useState(true);

    useEffect(() => {
        api.listContent()
            .then(data => { setContentList(data || []); setFetchingContent(false); })
            .catch(() => setFetchingContent(false));
    }, []);

    const toggleQType = (type) => {
        setQuestionTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleGenerate = async () => {
        if (!selectedContent) { setError('Please select content first'); return; }
        if (questionTypes.length === 0) { setError('Select at least one question type'); return; }
        setError(''); setLoading(true);

        try {
            const quiz = await api.generateQuiz({
                content_id: selectedContent,
                question_types: questionTypes,
                difficulty,
                num_questions: numQuestions,
                adaptive_mode: adaptiveMode,
            });
            navigate(`/quiz/${quiz.id}`);
        } catch (err) {
            setError(err.message || 'Failed to generate quiz');
            setLoading(false);
        }
    };

    const qTypes = [
        { value: 'mcq', label: 'Multiple Choice', desc: '4 options, pick the correct one' },
        { value: 'true_false', label: 'True / False', desc: 'Evaluate statements' },
        { value: 'fill_blank', label: 'Fill in the Blank', desc: 'Complete the sentence' },
        { value: 'short_answer', label: 'Short Answer', desc: 'Write a brief response' },
    ];

    return (
        <div>
            <div className="page-header">
                <h1>Generate Quiz</h1>
                <p>Configure and generate an adaptive quiz from your content</p>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Left: Settings */}
                <div>
                    {/* Content Selection */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Select Content</h3>
                        {fetchingContent ? (
                            <div className="skeleton" style={{ height: '44px' }} />
                        ) : contentList.length === 0 ? (
                            <div className="empty-state" style={{ padding: '24px' }}>
                                <p>No content uploaded yet</p>
                                <button className="btn btn-primary btn-sm" onClick={() => navigate('/upload')}>Upload Content</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {contentList.map(c => (
                                    <div key={c.id}
                                        className={`option-card ${selectedContent === c.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedContent(c.id)}
                                    >
                                        <span className="option-label">{selectedContent === c.id ? '✓' : '·'}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.title}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                                                {c.chunk_count} chunks • {c.topic_count} topics • {c.source_type}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Question Types */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Question Types</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {qTypes.map(qt => (
                                <div key={qt.value}
                                    className={`option-card ${questionTypes.includes(qt.value) ? 'selected' : ''}`}
                                    onClick={() => toggleQType(qt.value)}
                                >
                                    <span className="option-label">{questionTypes.includes(qt.value) ? '✓' : ''}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{qt.label}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{qt.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Config */}
                <div>
                    {/* Difficulty */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Difficulty Level</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['easy', 'medium', 'hard'].map(d => (
                                <button key={d}
                                    className={`btn ${difficulty === d ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ flex: 1, textTransform: 'capitalize' }}
                                    onClick={() => setDifficulty(d)}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '10px' }}>
                            {difficulty === 'easy' ? 'Recall & remember level questions' :
                                difficulty === 'medium' ? 'Understand & apply level questions' :
                                    'Analyze & evaluate level questions (Bloom\'s Taxonomy)'}
                        </p>
                    </div>

                    {/* Number of Questions */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Number of Questions</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[5, 10, 15, 20].map(n => (
                                <button key={n}
                                    className={`btn ${numQuestions === n ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ flex: 1 }}
                                    onClick={() => setNumQuestions(n)}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Adaptive Mode */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3>Adaptive Mode</h3>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    Difficulty adjusts based on your Elo rating
                                </p>
                            </div>
                            <button
                                className={`btn btn-sm ${adaptiveMode ? 'btn-secondary' : 'btn-outline'}`}
                                onClick={() => setAdaptiveMode(!adaptiveMode)}
                            >
                                {adaptiveMode ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        className="btn btn-primary btn-full btn-lg"
                        onClick={handleGenerate}
                        disabled={loading || !selectedContent}
                        style={{ fontSize: '1rem' }}
                    >
                        {loading ? 'Generating quiz with AI...' : '✦ Generate Quiz'}
                    </button>

                    {loading && (
                        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                            Analyzing content and crafting questions... This may take 15-30 seconds.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
