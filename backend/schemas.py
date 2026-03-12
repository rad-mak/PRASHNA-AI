"""Prashna-AI Pydantic Models — request/response schemas."""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ─── Auth ───

class UserRegister(BaseModel):
    email: str
    name: str
    password: str
    preferred_difficulty: str = "medium"
    preferred_subjects: list[str] = []
    preferred_question_types: list[str] = ["mcq", "true_false"]


class UserLogin(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    preferred_difficulty: str
    preferred_subjects: list[str]
    preferred_question_types: list[str]
    elo_rating: float
    created_at: str


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    preferred_difficulty: Optional[str] = None
    preferred_subjects: Optional[list[str]] = None
    preferred_question_types: Optional[list[str]] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


# ─── Content ───

class ContentUpload(BaseModel):
    title: str
    text: str
    source_type: str = "text"  # text, pdf, url


class ContentURLFetch(BaseModel):
    url: str
    title: Optional[str] = None


class ContentResponse(BaseModel):
    id: str
    user_id: str
    title: str
    raw_text: str
    chunks: list[str]
    topics: list[str]
    summary: str
    complexity_score: float
    source_type: str
    created_at: str


class ContentListItem(BaseModel):
    id: str
    title: str
    source_type: str
    complexity_score: float
    topic_count: int
    chunk_count: int
    created_at: str


# ─── Questions ───

class QuestionOption(BaseModel):
    label: str
    text: str
    is_correct: bool = False


class QuestionResponse(BaseModel):
    id: str
    content_id: str
    type: str  # mcq, true_false, fill_blank, short_answer
    difficulty: str  # easy, medium, hard
    question_text: str
    options: list[QuestionOption]
    correct_answer: str
    explanation: str
    topic: str
    elo_rating: float


# ─── Quiz ───

class QuizGenerateRequest(BaseModel):
    content_id: str
    question_types: list[str] = ["mcq", "true_false", "fill_blank", "short_answer"]
    difficulty: str = "medium"  # easy, medium, hard, adaptive
    num_questions: int = 10
    adaptive_mode: bool = True


class QuizResponse(BaseModel):
    id: str
    user_id: str
    title: str
    difficulty: str
    question_count: int
    adaptive_mode: bool
    questions: list[QuestionResponse]
    created_at: str


class QuizListItem(BaseModel):
    id: str
    title: str
    difficulty: str
    question_count: int
    score: Optional[float] = None
    completed: bool = False
    created_at: str


class AnswerSubmit(BaseModel):
    question_id: str
    user_answer: str
    time_taken_seconds: float


class QuizSubmitRequest(BaseModel):
    answers: list[AnswerSubmit]


class QuestionResult(BaseModel):
    question_id: str
    question_text: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    time_taken_seconds: float
    explanation: str
    elo_change: float


class QuizResultResponse(BaseModel):
    quiz_id: str
    total_questions: int
    correct_count: int
    score_percentage: float
    total_time_seconds: float
    avg_time_per_question: float
    elo_before: float
    elo_after: float
    elo_change: float
    difficulty_progression: list[str]
    question_results: list[QuestionResult]
    weak_topics: list[str]
    recommendations: list[str]


# ─── Analytics ───

class TopicPerformance(BaseModel):
    topic: str
    accuracy: float
    total_attempts: int
    predicted_accuracy: float
    difficulty_level: str


class PerformanceOverview(BaseModel):
    total_quizzes: int
    total_questions_answered: int
    overall_accuracy: float
    current_elo: float
    elo_history: list[dict]
    topic_performance: list[TopicPerformance]
    weak_areas: list[str]
    strong_areas: list[str]
    recommendations: list[str]


class KnowledgeGraphNode(BaseModel):
    id: str
    label: str
    group: str
    size: float = 1.0


class KnowledgeGraphEdge(BaseModel):
    source: str
    target: str
    weight: float = 1.0


class KnowledgeGraphResponse(BaseModel):
    nodes: list[KnowledgeGraphNode]
    edges: list[KnowledgeGraphEdge]


# ─── Admin ───

class AdminUserListItem(BaseModel):
    id: str
    email: str
    name: str
    elo_rating: float
    total_quizzes: int
    overall_accuracy: float
    created_at: str


class AdminAnalytics(BaseModel):
    total_users: int
    total_quizzes: int
    total_questions: int
    avg_accuracy: float
    active_users_today: int
    popular_topics: list[dict]
    difficulty_distribution: dict


class QuestionFlag(BaseModel):
    reason: str
