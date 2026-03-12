import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PRASHNA-AI LANDING PAGE
   Cinematic · Handcrafted · Warm · Organic · No Icons · No Glow
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function Landing() {
    const [scrollY, setScrollY] = useState(0);
    const [visibleSections, setVisibleSections] = useState(new Set());
    const sectionRefs = useRef([]);
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('prashna_theme');
        return saved === 'dark';
    });

    const toggleTheme = () => {
        setDarkMode(prev => {
            const next = !prev;
            document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
            localStorage.setItem('prashna_theme', next ? 'dark' : 'light');
            return next;
        });
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Intersection Observer for scroll-triggered animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setVisibleSections(prev => new Set([...prev, entry.target.dataset.section]));
                    }
                });
            },
            { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
        );

        sectionRefs.current.forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, []);

    const addRef = (el, index) => {
        sectionRefs.current[index] = el;
    };

    const isVisible = (id) => visibleSections.has(id);

    // Animated counter hook
    const Counter = ({ end, duration = 2000, suffix = '' }) => {
        const [count, setCount] = useState(0);
        const ref = useRef(null);
        const [started, setStarted] = useState(false);

        useEffect(() => {
            const observer = new IntersectionObserver(
                ([entry]) => { if (entry.isIntersecting) setStarted(true); },
                { threshold: 0.5 }
            );
            if (ref.current) observer.observe(ref.current);
            return () => observer.disconnect();
        }, []);

        useEffect(() => {
            if (!started) return;
            let start = 0;
            const step = end / (duration / 16);
            const timer = setInterval(() => {
                start += step;
                if (start >= end) { setCount(end); clearInterval(timer); }
                else setCount(Math.floor(start));
            }, 16);
            return () => clearInterval(timer);
        }, [started, end, duration]);

        return <span ref={ref}>{count}{suffix}</span>;
    };

    return (
        <div className="landing" style={{ '--scrollY': scrollY }}>
            {/* ═══ NAVIGATION ═══ */}
            <nav className="land-nav" style={{
                background: scrollY > 60
                    ? (darkMode ? 'rgba(26, 26, 46, 0.95)' : 'rgba(250, 247, 242, 0.95)')
                    : 'transparent',
                backdropFilter: scrollY > 60 ? 'blur(12px)' : 'none',
                boxShadow: scrollY > 60
                    ? (darkMode ? '0 1px 20px rgba(0,0,0,0.3)' : '0 1px 20px rgba(44,44,44,0.06)')
                    : 'none',
            }}>
                <div className="land-nav-inner">
                    <div className="land-logo">
                        <span className="land-logo-mark">प्र</span>
                        <span className="land-logo-text">Prashna-AI</span>
                    </div>
                    <div className="land-nav-links">
                        <a href="#features" className="land-nav-link">Features</a>
                        <a href="#how" className="land-nav-link">How It Works</a>
                        <a href="#stats" className="land-nav-link">Impact</a>
                        <button onClick={toggleTheme} className="land-theme-toggle" aria-label="Toggle theme">
                            <span className="land-theme-icon">{darkMode ? '☀' : '☾'}</span>
                        </button>
                        <Link to="/login" className="land-nav-link">Sign In</Link>
                        <Link to="/register" className="btn btn-primary" style={{ padding: '8px 22px', fontSize: '0.88rem' }}>
                            Get Started →
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ═══ HERO SECTION ═══ */}
            <section className="land-hero">
                {/* Organic floating shapes */}
                <div className="land-shapes">
                    <div className="land-shape land-shape-1" style={{ transform: `translate(${scrollY * 0.08}px, ${scrollY * -0.12}px) rotate(${scrollY * 0.03}deg)` }} />
                    <div className="land-shape land-shape-2" style={{ transform: `translate(${scrollY * -0.06}px, ${scrollY * -0.09}px) rotate(${scrollY * -0.02}deg)` }} />
                    <div className="land-shape land-shape-3" style={{ transform: `translate(${scrollY * 0.04}px, ${scrollY * -0.15}px)` }} />
                    <div className="land-shape land-shape-4" style={{ transform: `translate(${scrollY * -0.1}px, ${scrollY * 0.05}px) rotate(${scrollY * 0.04}deg)` }} />
                    <div className="land-shape land-shape-5" style={{ transform: `translate(${scrollY * 0.07}px, ${scrollY * -0.08}px)` }} />
                </div>

                <div className="land-hero-content">
                    <div className="land-hero-badge">Adaptive Learning Platform</div>
                    <h1 className="land-hero-title">
                        <span className="land-hero-line land-hero-line-1">Questions that</span>
                        <span className="land-hero-line land-hero-line-2">
                            <em className="land-hero-accent">understand</em> you
                        </span>
                    </h1>
                    <p className="land-hero-subtitle">
                        Upload any study material. Our AI crafts personalized quizzes that
                        adapt to your unique learning journey — getting smarter with every answer.
                    </p>
                    <div className="land-hero-actions">
                        <Link to="/register" className="land-cta-btn land-cta-primary">
                            Start Learning Free
                            <span className="land-cta-arrow">→</span>
                        </Link>
                        <a href="#how" className="land-cta-btn land-cta-outline">
                            See How It Works
                        </a>
                    </div>

                    {/* Floating preview card */}
                    <div className="land-preview" style={{
                        transform: `translateY(${scrollY * -0.2}px)`,
                        opacity: Math.max(0, 1 - scrollY / 600),
                    }}>
                        <div className="land-preview-card">
                            <div className="land-preview-header">
                                <div className="land-preview-dot" style={{ background: '#C4654A' }} />
                                <div className="land-preview-dot" style={{ background: '#D4A054' }} />
                                <div className="land-preview-dot" style={{ background: '#2D6A4F' }} />
                            </div>
                            <div className="land-preview-body">
                                <div className="land-preview-q">Q3. What is the primary function of mitochondria?</div>
                                <div className="land-preview-options">
                                    <div className="land-preview-opt">A. Protein synthesis</div>
                                    <div className="land-preview-opt land-preview-opt-correct">B. Energy production (ATP)</div>
                                    <div className="land-preview-opt">C. Cell division</div>
                                    <div className="land-preview-opt">D. DNA replication</div>
                                </div>
                                <div className="land-preview-footer">
                                    <span className="land-preview-badge">Medium</span>
                                    <span className="land-preview-elo">+12 Elo</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="land-scroll-hint" style={{ opacity: Math.max(0, 1 - scrollY / 200) }}>
                    <div className="land-scroll-line" />
                    <span>Scroll to explore</span>
                </div>
            </section>

            {/* ═══ FEATURES SECTION ═══ */}
            <section id="features" className="land-section land-features-section"
                ref={el => addRef(el, 0)} data-section="features">
                <div className="land-section-inner">
                    <div className={`land-section-header ${isVisible('features') ? 'land-visible' : ''}`}>
                        <span className="land-tag">What Makes Us Different</span>
                        <h2>Learning that adapts to <em>you</em></h2>
                        <p>Not just another quiz tool. A complete adaptive learning engine powered by AI and cognitive science.</p>
                    </div>

                    <div className="land-features-grid">
                        {[
                            {
                                num: '01',
                                title: 'AI Question Generation',
                                desc: 'Upload any text, PDF, or URL. GPT analyzes the content and generates 4 question types — MCQ, True/False, Fill-blank, and Short Answer — each calibrated to test real understanding.',
                                color: '#C4654A',
                            },
                            {
                                num: '02',
                                title: 'Elo Rating System',
                                desc: 'Borrowed from chess. Both you and each question have a rating. Win against hard questions, climb fast. The system finds your exact skill frontier.',
                                color: '#2D6A4F',
                            },
                            {
                                num: '03',
                                title: 'Performance Prediction',
                                desc: 'Machine learning models analyze your answer patterns to predict which topics you will struggle with — before you even attempt them.',
                                color: '#D4A054',
                            },
                            {
                                num: '04',
                                title: 'Knowledge Graph',
                                desc: 'See how concepts connect. An interactive graph maps relationships between topics, revealing gaps in your understanding that linear study misses.',
                                color: '#8B5E3C',
                            },
                            {
                                num: '05',
                                title: 'NLP Content Processing',
                                desc: 'spaCy extracts key concepts, BERTopic discovers themes, and Flesch-Kincaid scoring measures complexity. Your content is deeply understood.',
                                color: '#6B4A3D',
                            },
                            {
                                num: '06',
                                title: 'Weak Area Detection',
                                desc: 'Pattern recognition identifies your weakest topics and suggests focused practice. Like having a tutor who remembers every mistake you have made.',
                                color: '#7A6652',
                            },
                        ].map((feature, i) => (
                            <div key={i}
                                className={`land-feature-card ${isVisible('features') ? 'land-visible' : ''}`}
                                style={{ transitionDelay: `${i * 120}ms` }}>
                                <div className="land-feature-num" style={{ color: feature.color }}>{feature.num}</div>
                                <h3>{feature.title}</h3>
                                <p>{feature.desc}</p>
                                <div className="land-feature-line" style={{ background: feature.color }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ HOW IT WORKS ═══ */}
            <section id="how" className="land-section land-how-section"
                ref={el => addRef(el, 1)} data-section="how">
                <div className="land-section-inner">
                    <div className={`land-section-header ${isVisible('how') ? 'land-visible' : ''}`}>
                        <span className="land-tag">Simple. Powerful.</span>
                        <h2>Three steps to smarter learning</h2>
                    </div>

                    <div className="land-steps">
                        {[
                            {
                                step: '01',
                                title: 'Upload Your Content',
                                desc: 'Paste text, drop a PDF, or enter a URL. Our NLP pipeline extracts key concepts, scores complexity, and organizes the material into knowledge chunks.',
                                visual: (
                                    <div className="land-step-visual land-step-visual-upload">
                                        <div className="land-upload-mock">
                                            <div className="land-upload-zone-mock">
                                                <div className="land-upload-arrow">↑</div>
                                                <div>Drop your study material</div>
                                            </div>
                                            <div className="land-upload-tags">
                                                <span>Machine Learning</span>
                                                <span>Neural Networks</span>
                                                <span>Backpropagation</span>
                                            </div>
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                step: '02',
                                title: 'Generate Adaptive Quiz',
                                desc: 'Choose your settings — difficulty, question types, and number. Or enable Adaptive Mode and let your Elo rating decide. AI generates questions in seconds.',
                                visual: (
                                    <div className="land-step-visual land-step-visual-generate">
                                        <div className="land-generate-mock">
                                            <div className="land-diff-btns">
                                                <span>Easy</span>
                                                <span className="land-diff-active">Medium</span>
                                                <span>Hard</span>
                                            </div>
                                            <div className="land-type-chips">
                                                <span className="land-chip-active">MCQ</span>
                                                <span className="land-chip-active">True/False</span>
                                                <span>Fill Blank</span>
                                                <span>Short Answer</span>
                                            </div>
                                            <div className="land-gen-btn">✦ Generate Quiz</div>
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                step: '03',
                                title: 'Learn & Evolve',
                                desc: 'Take your quiz with instant feedback. Watch your Elo rating shift. Review analytics that show exactly where to focus next. Every quiz makes the next one smarter.',
                                visual: (
                                    <div className="land-step-visual land-step-visual-results">
                                        <div className="land-results-mock">
                                            <div className="land-score-circle">
                                                <span className="land-score-num">87%</span>
                                            </div>
                                            <div className="land-elo-change">+24 Elo</div>
                                            <div className="land-mini-bars">
                                                <div className="land-mini-bar" style={{ width: '90%', background: '#2D6A4F' }} />
                                                <div className="land-mini-bar" style={{ width: '65%', background: '#D4A054' }} />
                                                <div className="land-mini-bar" style={{ width: '40%', background: '#C4654A' }} />
                                            </div>
                                        </div>
                                    </div>
                                ),
                            },
                        ].map((item, i) => (
                            <div key={i}
                                className={`land-step-row ${i % 2 === 1 ? 'land-step-reverse' : ''} ${isVisible('how') ? 'land-visible' : ''}`}
                                style={{ transitionDelay: `${i * 200}ms` }}>
                                <div className="land-step-content">
                                    <div className="land-step-num">{item.step}</div>
                                    <h3>{item.title}</h3>
                                    <p>{item.desc}</p>
                                </div>
                                {item.visual}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ STATS SECTION ═══ */}
            <section id="stats" className="land-section land-stats-section"
                ref={el => addRef(el, 2)} data-section="stats">
                <div className="land-section-inner">
                    <div className="land-stats-grid">
                        {[
                            { value: 4, suffix: '', label: 'Question Types', sub: 'MCQ · T/F · Fill · Short' },
                            { value: 100, suffix: '%', label: 'AI-Powered', sub: 'GPT + NLP + ML pipeline' },
                            { value: 6, suffix: '+', label: 'AI/ML Features', sub: 'Elo · Predictions · Graphs' },
                            { value: 30, suffix: 's', label: 'Quiz Generation', sub: 'From upload to first question' },
                        ].map((stat, i) => (
                            <div key={i}
                                className={`land-stat-item ${isVisible('stats') ? 'land-visible' : ''}`}
                                style={{ transitionDelay: `${i * 150}ms` }}>
                                <div className="land-stat-value">
                                    <Counter end={stat.value} suffix={stat.suffix} />
                                </div>
                                <div className="land-stat-label">{stat.label}</div>
                                <div className="land-stat-sub">{stat.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ PHILOSOPHY SECTION ═══ */}
            <section className="land-section land-philosophy"
                ref={el => addRef(el, 3)} data-section="philosophy">
                <div className="land-section-inner">
                    <div className={`land-philosophy-content ${isVisible('philosophy') ? 'land-visible' : ''}`}>
                        <span className="land-tag">Our Philosophy</span>
                        <blockquote className="land-quote">
                            "The best test is the one that meets the student exactly where they are — not too easy, not too hard, but right at the edge of what they know."
                        </blockquote>
                        <p className="land-quote-author">— The Elo Principle behind Prashna-AI</p>
                    </div>
                </div>
            </section>

            {/* ═══ FINAL CTA ═══ */}
            <section className="land-section land-cta-section"
                ref={el => addRef(el, 4)} data-section="cta">
                <div className="land-section-inner">
                    <div className={`land-cta-content ${isVisible('cta') ? 'land-visible' : ''}`}>
                        <h2>Ready to learn smarter?</h2>
                        <p>Join Prashna-AI and experience adaptive quizzes that evolve with you. Free to start, powerful from day one.</p>
                        <div className="land-hero-actions" style={{ justifyContent: 'center' }}>
                            <Link to="/register" className="land-cta-btn land-cta-primary land-cta-big">
                                Create Free Account
                                <span className="land-cta-arrow">→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer className="land-footer">
                <div className="land-footer-inner">
                    <div className="land-footer-brand">
                        <span className="land-logo-mark" style={{ fontSize: '1.1rem' }}>प्र</span>
                        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.1rem' }}>Prashna-AI</span>
                    </div>
                    <div className="land-footer-links">
                        <Link to="/login">Sign In</Link>
                        <Link to="/register">Register</Link>
                        <a href="#features">Features</a>
                        <a href="#how">How It Works</a>
                    </div>
                    <div className="land-footer-copy">
                        © 2026 Prashna-AI · Built with craft, not templates.
                    </div>
                </div>
            </footer>
        </div>
    );
}
