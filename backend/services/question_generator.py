"""Prashna-AI Question Generator — Multi-provider AI-powered question generation."""

import json
import logging
from backend.services.ai_provider import chat_completion, chat_completion_json

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = "You are an expert educational content creator. Always respond with valid JSON only. No markdown formatting."

QUESTION_GENERATION_PROMPT = """You are an expert educational question generator. Generate quiz questions from the given content.

CONTENT:
{content}

REQUIREMENTS:
- Generate exactly {num_questions} questions
- Question types to include: {question_types}
- Target difficulty: {difficulty} (easy = recall/remember, medium = understand/apply, hard = analyze/evaluate based on Bloom's taxonomy)
- Each question must be directly answerable from the content provided
- For MCQs: provide exactly 4 options (A, B, C, D) with plausible distractors
- For True/False: make statements that test understanding, not trivial facts
- For Fill in the Blank: use key terms from the content
- For Short Answer: ask concise questions expecting 1-3 sentence answers

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks, just raw JSON):
{{
  "questions": [
    {{
      "type": "mcq",
      "difficulty": "easy|medium|hard",
      "question_text": "The question text here",
      "options": [
        {{"label": "A", "text": "Option text", "is_correct": false}},
        {{"label": "B", "text": "Option text", "is_correct": true}},
        {{"label": "C", "text": "Option text", "is_correct": false}},
        {{"label": "D", "text": "Option text", "is_correct": false}}
      ],
      "correct_answer": "The correct answer text",
      "explanation": "Why this is the correct answer",
      "topic": "The topic this question covers"
    }},
    {{
      "type": "true_false",
      "difficulty": "easy|medium|hard",
      "question_text": "Statement to evaluate as true or false",
      "options": [
        {{"label": "A", "text": "True", "is_correct": true}},
        {{"label": "B", "text": "False", "is_correct": false}}
      ],
      "correct_answer": "True",
      "explanation": "Why this is true/false",
      "topic": "Topic"
    }},
    {{
      "type": "fill_blank",
      "difficulty": "easy|medium|hard",
      "question_text": "Sentence with ______ for the blank",
      "options": [
        {{"label": "A", "text": "correct term", "is_correct": true}},
        {{"label": "B", "text": "wrong term", "is_correct": false}}
      ],
      "correct_answer": "The correct term",
      "explanation": "Explanation",
      "topic": "Topic"
    }},
    {{
      "type": "short_answer",
      "difficulty": "easy|medium|hard",
      "question_text": "Short answer question",
      "options": [],
      "correct_answer": "Expected answer in 1-3 sentences",
      "explanation": "Detailed explanation",
      "topic": "Topic"
    }}
  ]
}}"""


SUMMARIZE_PROMPT = """Provide a concise summary of the following educational content. Include:
1. A 2-3 sentence TL;DR
2. 3-5 key takeaways as bullet points
3. Main topics covered

CONTENT:
{content}

RESPOND IN JSON FORMAT:
{{
  "summary": "TL;DR summary here",
  "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "topics": ["topic 1", "topic 2", "topic 3"]
}}"""


def generate_questions(
    content: str,
    num_questions: int = 10,
    question_types: list[str] = None,
    difficulty: str = "medium",
) -> list[dict]:
    """Generate questions from content using the AI provider chain (OpenAI → Groq → Ollama)."""
    if question_types is None:
        question_types = ["mcq", "true_false", "fill_blank", "short_answer"]

    type_str = ", ".join(question_types)

    prompt = QUESTION_GENERATION_PROMPT.format(
        content=content[:8000],
        num_questions=num_questions,
        question_types=type_str,
        difficulty=difficulty,
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    try:
        result = chat_completion_json(messages, temperature=0.7, max_tokens=4000)
        return result.get("questions", [])
    except json.JSONDecodeError:
        # Retry with stricter prompt
        return _retry_generation(content, num_questions, question_types, difficulty)
    except Exception as e:
        logger.error(f"Question generation failed: {e}")
        raise ValueError(f"Question generation failed: {str(e)}")


def _retry_generation(
    content: str, num_questions: int, question_types: list, difficulty: str
) -> list[dict]:
    """Retry question generation with stricter JSON enforcement."""
    messages = [
        {
            "role": "system",
            "content": "You MUST respond with ONLY valid JSON. No text before or after the JSON object.",
        },
        {
            "role": "user",
            "content": f"Generate {num_questions} {difficulty} quiz questions ({', '.join(question_types)}) from this text. Respond ONLY with JSON having a 'questions' array.\n\nText: {content[:4000]}",
        },
    ]

    try:
        result = chat_completion_json(messages, temperature=0.5, max_tokens=4000)
        return result.get("questions", [])
    except Exception:
        # Return a minimal fallback
        return [
            {
                "type": "mcq",
                "difficulty": difficulty,
                "question_text": "Based on the provided content, which of the following is most accurate?",
                "options": [
                    {"label": "A", "text": "Option A", "is_correct": True},
                    {"label": "B", "text": "Option B", "is_correct": False},
                    {"label": "C", "text": "Option C", "is_correct": False},
                    {"label": "D", "text": "Option D", "is_correct": False},
                ],
                "correct_answer": "Option A",
                "explanation": "Please try generating questions again with different content.",
                "topic": "General",
            }
        ]


def summarize_content(content: str) -> dict:
    """Generate a summary of educational content using the AI provider chain."""
    prompt = SUMMARIZE_PROMPT.format(content=content[:6000])

    messages = [
        {"role": "system", "content": "Respond with valid JSON only. No markdown."},
        {"role": "user", "content": prompt},
    ]

    try:
        return chat_completion_json(messages, temperature=0.5, max_tokens=1000)
    except Exception:
        return {
            "summary": content[:200] + "...",
            "key_takeaways": ["Content uploaded successfully"],
            "topics": ["General"],
        }
