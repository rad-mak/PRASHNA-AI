import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Upload() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('text');
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [url, setUrl] = useState('');
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const fileRef = useRef();

    const handleTextUpload = async () => {
        if (!title.trim() || !text.trim()) { setError('Please provide a title and content'); return; }
        setError(''); setLoading(true);
        try {
            const res = await api.uploadContent(title, text, 'text');
            setResult(res);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const handleURLFetch = async () => {
        if (!url.trim()) { setError('Please enter a URL'); return; }
        setError(''); setLoading(true);
        try {
            const res = await api.fetchURL(url, title || url);
            setResult(res);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
        if (file) {
            if (file.type === 'application/pdf') {
                // Read as text for now (real PDF upload would use FormData)
                setError('PDF upload requires backend file upload. Please paste the text content instead.');
            } else {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setText(ev.target.result);
                    setTitle(file.name.replace(/\.[^.]+$/, ''));
                    setTab('text');
                };
                reader.readAsText(file);
            }
        }
    };

    const getComplexityColor = (score) => {
        if (score < 0.35) return 'low';
        if (score < 0.65) return 'mid';
        return 'high';
    };

    if (result) {
        return (
            <div className="animate-scale-in">
                <div className="page-header">
                    <h1>Content Uploaded Successfully</h1>
                    <p>Your content has been processed and is ready for quiz generation</p>
                </div>

                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>{result.title}</h3>

                    {/* Complexity Meter */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span className="form-label" style={{ margin: 0 }}>Content Complexity</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                {Math.round(result.complexity_score * 100)}%
                            </span>
                        </div>
                        <div className="complexity-bar">
                            <div className={`complexity-fill ${getComplexityColor(result.complexity_score)}`} style={{ width: `${result.complexity_score * 100}%` }} />
                        </div>
                    </div>

                    {/* Summary */}
                    {result.summary && (
                        <div style={{ padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                            {result.summary}
                        </div>
                    )}

                    {/* Topics */}
                    {result.topics?.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <span className="form-label">Discovered Topics</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                {result.topics.map((t, i) => <span key={i} className="tag tag-secondary">{t}</span>)}
                            </div>
                        </div>
                    )}

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                        {result.chunks?.length || 0} knowledge chunks created
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/generate', { state: { contentId: result.id, contentTitle: result.title } })}>
                        ✦ Generate Quiz from this Content
                    </button>
                    <button className="btn btn-outline btn-lg" onClick={() => { setResult(null); setTitle(''); setText(''); setUrl(''); }}>
                        Upload More Content
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1>Upload Content</h1>
                <p>Add learning material to generate adaptive quizzes</p>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-light)', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="tab-nav">
                <button className={`tab-btn ${tab === 'text' ? 'active' : ''}`} onClick={() => setTab('text')}>Paste Text</button>
                <button className={`tab-btn ${tab === 'url' ? 'active' : ''}`} onClick={() => setTab('url')}>From URL</button>
                <button className={`tab-btn ${tab === 'file' ? 'active' : ''}`} onClick={() => setTab('file')}>Upload File</button>
            </div>

            {tab === 'text' && (
                <div className="animate-fade-in">
                    <div className="form-group">
                        <label className="form-label">Content Title</label>
                        <input className="form-input" placeholder="e.g., Machine Learning Fundamentals" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Paste Your Content</label>
                        <textarea className="form-input" placeholder="Paste your study material, notes, textbook content, or any educational text here..." value={text} onChange={e => setText(e.target.value)} style={{ minHeight: '250px' }} />
                    </div>
                    <button className="btn btn-primary btn-lg" onClick={handleTextUpload} disabled={loading}>
                        {loading ? 'Processing content...' : '↑ Upload & Analyze'}
                    </button>
                </div>
            )}

            {tab === 'url' && (
                <div className="animate-fade-in">
                    <div className="form-group">
                        <label className="form-label">Title (optional)</label>
                        <input className="form-input" placeholder="Give this content a name" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">URL</label>
                        <input className="form-input" placeholder="https://en.wikipedia.org/wiki/Machine_learning" value={url} onChange={e => setUrl(e.target.value)} />
                    </div>
                    <button className="btn btn-primary btn-lg" onClick={handleURLFetch} disabled={loading}>
                        {loading ? 'Fetching content...' : '↓ Fetch & Analyze'}
                    </button>
                </div>
            )}

            {tab === 'file' && (
                <div className="animate-fade-in">
                    <div className={`upload-zone ${dragging ? 'dragging' : ''}`}
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleFileDrop}
                        onClick={() => fileRef.current?.click()}
                    >
                        <div className="upload-zone-title">Drop your file here or click to browse</div>
                        <div className="upload-zone-subtitle">Supports .txt and .pdf files</div>
                        <input ref={fileRef} type="file" accept=".txt,.pdf,.md" style={{ display: 'none' }} onChange={handleFileDrop} />
                    </div>
                </div>
            )}
        </div>
    );
}
