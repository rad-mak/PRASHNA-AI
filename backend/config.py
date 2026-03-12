"""Prashna-AI Configuration — loads environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment."""

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "prashna-ai-secret")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 72


settings = Settings()

# Module-level aliases for direct imports
OPENAI_API_KEY = settings.OPENAI_API_KEY
GROQ_API_KEY = settings.GROQ_API_KEY
OLLAMA_BASE_URL = settings.OLLAMA_BASE_URL
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_KEY
JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = settings.JWT_ALGORITHM
JWT_EXPIRATION_HOURS = settings.JWT_EXPIRATION_HOURS
