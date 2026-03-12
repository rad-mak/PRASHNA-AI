import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import api from '../api';

export default function Profile() {
    const { user, updateUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || '',
        preferred_difficulty: user?.preferred_difficulty || 'medium',
        preferred_subjects: user?.preferred_subjects || [],
        preferred_question_types: user?.preferred_question_types || [],
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const subjects = ['Computer Science', 'Mathematics', 'Physics', 'Biology', 'Chemistry', 'History', 'Literature', 'Economics', 'Psychology', 'General Knowledge'];
    const qTypes = [
        { value: 'mcq', label: 'Multiple Choice' },
        { value: 'true_false', label: 'True / False' },
        { value: 'fill_blank', label: 'Fill in the Blank' },
        { value: 'short_answer', label: 'Short Answer' },
    ];

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const updated = await api.updateProfile(form);
            updateUser(updated);
            setMessage('Profile updated successfully!');
            setEditing(false);
        } catch (err) {
            setMessage('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Your Profile</h1>
                <p>Manage your learning preferences and account</p>
            </div>

            {message && (
                <div className={`toast ${message.includes('success') ? 'toast-success' : 'toast-error'}`} style={{ position: 'relative', bottom: 'auto', right: 'auto', marginBottom: '20px' }}>
                    {message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Account Info */}
                <div className="card">
                    <div className="card-header">
                        <h3>Account Information</h3>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditing(!editing)}>
                            {editing ? 'Cancel' : 'Edit'}
                        </button>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Name</label>
                        {editing ? (
                            <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                        ) : (
                            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>{user?.name}</div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{user?.email}</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Elo Rating</label>
                        <div className="elo-badge" style={{ fontSize: '1.2rem' }}>{Math.round(user?.elo_rating || 1000)} ELO</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Member Since</label>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                        </div>
                    </div>
                </div>

                {/* Preferences */}
                <div className="card">
                    <h3 style={{ marginBottom: '20px' }}>Learning Preferences</h3>

                    <div className="form-group">
                        <label className="form-label">Difficulty Level</label>
                        {editing ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['easy', 'medium', 'hard'].map(d => (
                                    <button key={d}
                                        className={`btn ${form.preferred_difficulty === d ? 'btn-primary' : 'btn-outline'} btn-sm`}
                                        style={{ flex: 1, textTransform: 'capitalize' }}
                                        onClick={() => setForm(p => ({ ...p, preferred_difficulty: d }))}>
                                        {d}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <span className={`badge badge-${user?.preferred_difficulty}`}>{user?.preferred_difficulty}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Preferred Subjects</label>
                        {editing ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {subjects.map(s => (
                                    <button key={s}
                                        className={`tag ${form.preferred_subjects.includes(s) ? 'tag-primary' : ''}`}
                                        style={{ cursor: 'pointer', border: 'none' }}
                                        onClick={() =>
                                            setForm(p => ({
                                                ...p,
                                                preferred_subjects: p.preferred_subjects.includes(s)
                                                    ? p.preferred_subjects.filter(x => x !== s)
                                                    : [...p.preferred_subjects, s],
                                            }))
                                        }>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(user?.preferred_subjects || []).map((s, i) => <span key={i} className="tag tag-secondary">{s}</span>)}
                                {(!user?.preferred_subjects || user.preferred_subjects.length === 0) && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No subjects selected</span>}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Question Types</label>
                        {editing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {qTypes.map(qt => (
                                    <div key={qt.value}
                                        className={`option-card ${form.preferred_question_types.includes(qt.value) ? 'selected' : ''}`}
                                        onClick={() =>
                                            setForm(p => ({
                                                ...p,
                                                preferred_question_types: p.preferred_question_types.includes(qt.value)
                                                    ? p.preferred_question_types.filter(t => t !== qt.value)
                                                    : [...p.preferred_question_types, qt.value],
                                            }))
                                        }>
                                        <span className="option-label">{form.preferred_question_types.includes(qt.value) ? '✓' : ''}</span>
                                        <span>{qt.label}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(user?.preferred_question_types || []).map((t, i) => <span key={i} className="tag">{t.replace('_', ' ')}</span>)}
                            </div>
                        )}
                    </div>

                    {editing && (
                        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
