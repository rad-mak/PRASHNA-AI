# 🎓 Prashna-AI — Adaptive AI-Powered Quiz Generator

**Prashna-AI** (प्रश्न = "question" in Sanskrit) is an intelligent, adaptive quiz platform that generates personalized assessments from any educational content. Powered by OpenAI GPT, NLP, and machine learning, it adapts to each learner's ability using an Elo rating system.

---

## Features

### AI/ML Capabilities
- **GPT-Powered Question Generation** — MCQ, True/False, Fill-in-the-Blank, Short Answer
- **NLP Content Processing** — Text extraction from PDFs/URLs, concept extraction (spaCy), smart chunking
- **Adaptive Difficulty** — Elo rating system (chess-style) for both users and questions
- **Topic Discovery** — BERTopic-based automatic topic modeling
- **Performance Prediction** — ML models predict your accuracy per topic
- **Weak Area Detection** — Identifies topics that need more practice
- **Knowledge Graph** — D3.js-compatible concept relationship visualization
- **Content Summarization** — GPT-powered summaries of uploaded material

### Learning Platform
- Upload text, PDFs, or fetch content from URLs
- Adaptive quizzes that evolve with your skill level
- Real-time analytics with Recharts visualizations
- Elo rating progress tracking
- Dark/light theme with warm organic design
- Admin dashboard for content moderation

---

## Tech Stack

| Layer       | Technology         |
|-------------|-------------------|
| Frontend    | Vite + React, Recharts, D3.js |
| Backend     | FastAPI (Python)   |
| Database    | Supabase (PostgreSQL) |
| AI/LLM      | OpenAI GPT API     |
| NLP         | spaCy, Sentence Transformers |
| ML          | Scikit-learn, BERTopic |
| Auth        | JWT + bcrypt       |

---

## Project Structure

```
Quiz_Generation/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py             # Environment & settings
│   ├── database.py           # Supabase client
│   ├── auth_utils.py         # JWT + bcrypt utilities
│   ├── schemas.py            # Pydantic request/response models
│   ├── routes/
│   │   ├── auth.py           # Register, login, profile
│   │   ├── content.py        # Upload text/PDF/URL
│   │   ├── quiz.py           # Generate, take, submit quizzes
│   │   ├── analytics.py      # Performance, predictions, graphs
│   │   └── admin.py          # User & content management
│   └── services/
│       ├── content_processor.py  # NLP: extract, chunk, scoring
│       ├── question_generator.py # GPT question generation
│       ├── adaptive_engine.py    # Elo rating & difficulty
│       └── ml_engine.py         # BERTopic, predictions, graphs
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx          # React entry
│       ├── App.jsx           # Router + protected routes
│       ├── index.css         # Design system (warm palette)
│       ├── api.js            # Backend API service
│       ├── AuthContext.jsx   # Auth state management
│       ├── components/
│       │   └── Layout.jsx    # Sidebar + topbar layout
│       └── pages/
│           ├── Login.jsx     # Split-screen login
│           ├── Register.jsx  # 3-step registration wizard
│           ├── Dashboard.jsx # Stats, recent quizzes
│           ├── Upload.jsx    # Text/URL/file upload
│           ├── Generate.jsx  # Quiz configuration
│           ├── Quiz.jsx      # Immersive quiz-taking UI
│           ├── Results.jsx   # Score + charts + review
│           ├── Analytics.jsx # Performance analytics
│           ├── Profile.jsx   # Settings & preferences
│           └── Admin.jsx     # Admin dashboard
├── supabase_schema.sql       # Database tables SQL
├── .env                      # API keys (not committed)
├── .env.example              # Template for env vars
├── .gitignore
└── pyproject.toml            # Python dependencies
```

---

## Setup Instructions

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Supabase account** (free tier works)
- **OpenAI API key**

### 2. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase_schema.sql`
3. Copy your **Project URL** and **anon key** from Settings > API

### 3. Environment Variables
```bash
cp .env.example .env
```
Edit `.env` with your actual keys:
```
OPENAI_API_KEY=sk-proj-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
JWT_SECRET=your-secret-key
```

### 4. Backend Setup
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install core dependencies
pip install -e .

# Install ML dependencies (optional, for BERTopic/embeddings)
pip install -e ".[ml]"

# Download spaCy model
python -m spacy download en_core_web_sm

# Start the backend server
uvicorn backend.main:app --reload --port 8000
```

### 5. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 6. Access the App
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get profile |
| POST | `/api/content/upload` | Upload text content |
| POST | `/api/content/url` | Fetch from URL |
| POST | `/api/quiz/generate` | Generate adaptive quiz |
| POST | `/api/quiz/{id}/submit` | Submit answers + Elo update |
| GET | `/api/analytics/performance` | Performance overview |
| GET | `/api/analytics/knowledge-graph` | D3.js graph data |
| GET | `/api/admin/analytics` | Platform statistics |

---

## Design Philosophy

- **Warm, organic palette**: Terracotta, Forest Green, Golden Amber — no generic blues
- **No icon libraries**: CSS shapes, Unicode characters, and styled text only
- **No glow effects**: Physical, tactile animations using CSS `@keyframes` and `transition`
- **Handcrafted feel**: Every component designed with intentional warmth

---

## License

MIT © 2026 Prashna-AI
