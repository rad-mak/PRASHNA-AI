-- ═══════════════════════════════════════════════════════════════
-- PRASHNA-AI — Supabase Database Schema
-- Run this SQL in Supabase SQL Editor to create all tables
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users Table ───
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  elo_rating FLOAT DEFAULT 1000.0,
  preferred_difficulty TEXT DEFAULT 'medium',
  preferred_subjects TEXT[] DEFAULT '{}',
  preferred_question_types TEXT[] DEFAULT '{mcq,true_false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Content Table ───
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  raw_text TEXT,
  chunks JSONB DEFAULT '[]',
  topics TEXT[] DEFAULT '{}',
  concepts TEXT[] DEFAULT '{}',
  summary TEXT DEFAULT '',
  complexity_score FLOAT DEFAULT 0.5,
  source_type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Quizzes Table ───
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  question_count INT DEFAULT 0,
  adaptive_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Questions Table ───
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'mcq',
  difficulty TEXT DEFAULT 'medium',
  question_text TEXT NOT NULL,
  options JSONB DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  explanation TEXT DEFAULT '',
  topic TEXT DEFAULT 'General',
  elo_rating FLOAT DEFAULT 1000.0,
  order_index INT DEFAULT 0,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Attempts Table ───
CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN DEFAULT false,
  time_taken_seconds FLOAT DEFAULT 0,
  topic TEXT DEFAULT 'General',
  difficulty TEXT DEFAULT 'medium',
  elo_change FLOAT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes for Performance ───
CREATE INDEX IF NOT EXISTS idx_content_user ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_flagged ON questions(flagged) WHERE flagged = true;

-- ─── Row Level Security (RLS) ───
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations via the service/anon key since we handle auth in the app layer
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for content" ON content FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for quizzes" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for questions" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for attempts" ON attempts FOR ALL USING (true) WITH CHECK (true);
