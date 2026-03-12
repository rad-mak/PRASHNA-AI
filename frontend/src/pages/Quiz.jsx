import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Quiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { updateUser } = useAuth();
    const [quiz, setQuiz] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});        // { questionId: { question_id, user_answer, time_taken_seconds, is_correct, selected_label } }
    const [selectedOption, setSelectedOption] = useState(null);
    const [textAnswer, setTextAnswer] = useState('');   // For short_answer / fill_blank typed text
    const [showFeedback, setShowFeedback] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [loading, setLoading] = useState(true);
    const [timePerQuestion, setTimePerQuestion] = useState({});
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        api.getQuiz(id)
            .then(data => { setQuiz(data); setLoading(false); startTimeRef.current = Date.now(); })
            .catch(() => navigate('/'));
    }, [id]);

    // When question changes, restore previous answer if exists
    useEffect(() => {
        startTimeRef.current = Date.now();
        const q = quiz?.questions?.[currentIndex];
        if (q && answers[q.id]) {
            // Restore previously answered state
            const prev = answers[q.id];
            setShowFeedback(true);
            // Restore the selected option for MCQ/true_false
            if (q.options?.length > 0) {
                const prevOpt = q.options.find(o => o.label === prev.selected_label);
                setSelectedOption(prevOpt || null);
            } else {
                setSelectedOption(null);
            }
            setTextAnswer(prev.user_answer || '');
        } else {
            setSelectedOption(null);
            setShowFeedback(false);
            setTextAnswer('');
        }
    }, [currentIndex, quiz]);

    const currentQuestion = quiz?.questions?.[currentIndex];
    const totalQuestions = quiz?.questions?.length || 0;
    const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

    const handleSelect = (option) => {
        if (showFeedback) return;
        setSelectedOption(option);
    };

    const handleConfirm = () => {
        if (showFeedback) return;

        const timeTaken = (Date.now() - startTimeRef.current) / 1000;
        const isTextType = currentQuestion.type === 'short_answer' || currentQuestion.type === 'fill_blank';

        let userAnswer = '';
        let userLabel = '';
        let isCorrect = false;

        if (isTextType && (!currentQuestion.options || currentQuestion.options.length === 0)) {
            // Text-based answer
            if (!textAnswer.trim()) return;
            userAnswer = textAnswer.trim();
            userLabel = 'text';

            // Lenient evaluation for written answers (matches backend)
            const userStr = userAnswer.toLowerCase();
            const corrStr = (currentQuestion.correct_answer || '').toLowerCase();

            if (userStr === corrStr) {
                isCorrect = true;
            } else if (userStr.length > 2 && (userStr.includes(corrStr) || corrStr.includes(userStr))) {
                isCorrect = true;
            } else {
                // Keyword matching (words > 3 chars)
                const getKeywords = (str) => {
                    const cleaned = str.replace(/[,.]/g, ' ');
                    const words = cleaned.split(/\s+/).filter(w => w.length > 3);
                    return new Set(words);
                };

                const corrWords = getKeywords(corrStr);
                const userWords = getKeywords(userStr);

                // Check if there is any intersection
                isCorrect = false;
                for (const word of userWords) {
                    if (corrWords.has(word)) {
                        isCorrect = true;
                        break;
                    }
                }
            }
        } else if (selectedOption) {
            // Option-based answer (MCQ, true/false, fill_blank with options)
            userAnswer = selectedOption.text;
            userLabel = selectedOption.label;
            isCorrect = selectedOption.is_correct;
        } else {
            return; // Nothing selected
        }

        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: {
                question_id: currentQuestion.id,
                user_answer: userAnswer,
                time_taken_seconds: Math.round(timeTaken * 10) / 10,
                is_correct: isCorrect,
                selected_label: userLabel,
            }
        }));

        setTimePerQuestion(prev => ({ ...prev, [currentIndex]: timeTaken }));
        setShowFeedback(true);
    };

    const handleNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleSubmitQuiz = async () => {
        setSubmitting(true);
        setSubmitError('');
        try {
            const answersList = Object.values(answers).map(a => ({
                question_id: a.question_id,
                user_answer: a.user_answer,
                time_taken_seconds: a.time_taken_seconds,
            }));
            const result = await api.submitQuiz(id, answersList);
            if (result && result.elo_after) {
                updateUser({ elo_rating: result.elo_after });
            }
            navigate(`/results/${id}`, { state: { results: result } });
        } catch (err) {
            setSubmitError(err.message || 'Failed to submit quiz. Please try again.');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="quiz-container">
                <div className="skeleton" style={{ height: '80px', marginBottom: '24px' }} />
                <div className="skeleton" style={{ height: '300px' }} />
            </div>
        );
    }

    if (!currentQuestion) {
        return <div className="empty-state"><h3>No questions found</h3></div>;
    }

    const answeredCount = Object.keys(answers).length;
    const isAnswered = !!answers[currentQuestion.id];
    const savedAnswer = answers[currentQuestion.id];
    const isTextType = currentQuestion.type === 'short_answer' || currentQuestion.type === 'fill_blank';
    const hasOptions = currentQuestion.options?.length > 0;
    const canConfirm = (isTextType && !hasOptions) ? textAnswer.trim().length > 0 : !!selectedOption;

    return (
        <div className="quiz-container">
            {/* Header */}
            <div className="quiz-header">
                <div className="quiz-progress-info">
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Question</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>
                            {currentIndex + 1} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: '0.9rem' }}>/ {totalQuestions}</span>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Score</div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                            {Object.values(answers).filter(a => a.is_correct).length}/{answeredCount}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge badge-${currentQuestion.difficulty}`}>{currentQuestion.difficulty}</span>
                    <span className="tag">{currentQuestion.type.replace('_', ' ')}</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar" style={{ marginBottom: '24px' }}>
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>

            {/* Question Card */}
            <div className="quiz-question-card" key={currentIndex}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    {currentQuestion.topic}
                </div>
                <div className="quiz-question-text">{currentQuestion.question_text}</div>

                {/* Options (MCQ / True-False / Fill Blank with options) */}
                {hasOptions && (
                    <div className="quiz-options">
                        {currentQuestion.options.map((opt, i) => {
                            let className = 'option-card';

                            if (showFeedback || isAnswered) {
                                // Show correct in green
                                if (opt.is_correct) {
                                    className += ' correct';
                                }
                                // Show user's wrong pick in red
                                if (savedAnswer?.selected_label === opt.label && !opt.is_correct) {
                                    className += ' incorrect';
                                }
                            } else if (selectedOption?.label === opt.label) {
                                className += ' selected';
                            }

                            return (
                                <div key={i} className={className} onClick={() => handleSelect(opt)}>
                                    <span className="option-label">{opt.label}</span>
                                    <span style={{ flex: 1, fontSize: '0.92rem' }}>{opt.text}</span>
                                    {(showFeedback || isAnswered) && opt.is_correct && (
                                        <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '0.85rem' }}>✓ Correct</span>
                                    )}
                                    {(showFeedback || isAnswered) && savedAnswer?.selected_label === opt.label && !opt.is_correct && (
                                        <span style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: '0.85rem' }}>✗ Wrong</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Short answer / Fill blank input — show textarea when unanswered, show user answer when answered */}
                {isTextType && !hasOptions && (
                    <div className="form-group" style={{ marginTop: '16px' }}>
                        {!isAnswered ? (
                            <textarea
                                className="form-input"
                                placeholder="Type your answer..."
                                value={textAnswer}
                                onChange={e => setTextAnswer(e.target.value)}
                                style={{ minHeight: '100px' }}
                            />
                        ) : (
                            <div>
                                <div style={{
                                    padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '10px',
                                    background: savedAnswer?.is_correct ? 'var(--color-secondary-light)' : 'var(--color-danger-light)',
                                    border: `1.5px solid ${savedAnswer?.is_correct ? 'var(--color-success)' : 'var(--color-danger)'}`,
                                }}>
                                    <div style={{
                                        fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px',
                                        color: savedAnswer?.is_correct ? 'var(--color-success)' : 'var(--color-danger)'
                                    }}>
                                        Your Answer {savedAnswer?.is_correct ? '✓' : '✗'}
                                    </div>
                                    <div style={{ fontSize: '0.92rem' }}>{savedAnswer.user_answer}</div>
                                </div>
                                <div style={{
                                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-secondary-light)', border: '1.5px solid var(--color-success)',
                                }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', color: 'var(--color-success)' }}>
                                        Correct Answer
                                    </div>
                                    <div style={{ fontSize: '0.92rem' }}>{currentQuestion.correct_answer}</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Feedback / Explanation */}
                {(showFeedback || isAnswered) && currentQuestion.explanation && (
                    <div className="animate-slide-down" style={{
                        marginTop: '20px', padding: '14px 16px', borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)', borderLeft: '3px solid var(--color-secondary)',
                    }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-secondary)', marginBottom: '4px' }}>Explanation</div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            {currentQuestion.explanation}
                        </div>
                    </div>
                )}
            </div>

            {/* Submit Error */}
            {submitError && (
                <div style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-md)', marginTop: '16px',
                    background: 'var(--color-danger-light)', color: 'var(--color-danger)',
                    fontSize: '0.85rem', fontWeight: 600,
                }}>
                    {submitError}
                </div>
            )}

            {/* Actions */}
            <div className="quiz-actions">
                <button className="btn btn-outline" onClick={handlePrevious} disabled={currentIndex === 0}>
                    ← Previous
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {!showFeedback && !isAnswered && (
                        <button className="btn btn-primary" onClick={handleConfirm} disabled={!canConfirm}>
                            Confirm Answer
                        </button>
                    )}

                    {(showFeedback || isAnswered) && currentIndex < totalQuestions - 1 && (
                        <button className="btn btn-primary" onClick={handleNext}>
                            Next Question →
                        </button>
                    )}

                    {answeredCount === totalQuestions && (
                        <button className="btn btn-secondary btn-lg" onClick={handleSubmitQuiz} disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Quiz →'}
                        </button>
                    )}
                </div>
            </div>

            {/* Question Navigation Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '24px' }}>
                {quiz.questions.map((q, i) => (
                    <button key={i}
                        onClick={() => setCurrentIndex(i)}
                        style={{
                            width: '10px', height: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                            background: i === currentIndex ? 'var(--color-primary)' : answers[q.id]
                                ? (answers[q.id].is_correct ? 'var(--color-success)' : 'var(--color-danger)')
                                : 'var(--bg-secondary)',
                            transition: 'all 200ms ease',
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
