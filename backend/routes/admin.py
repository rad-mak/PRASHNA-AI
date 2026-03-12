"""Prashna-AI Admin Routes — User management, content moderation, platform analytics."""

import json
from fastapi import APIRouter, HTTPException, Depends

from backend.database import supabase
from backend.auth_utils import get_current_user
from backend.schemas import AdminUserListItem, AdminAnalytics, QuestionFlag

router = APIRouter()


@router.get("/users", response_model=list[AdminUserListItem])
def list_users(current_user: dict = Depends(get_current_user)):
    """List all users with their stats (admin view). Optimized for bulk fetch."""
    if current_user.get("email") != "radhamakwana28@gmail.com":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Fetch all data in 3 bulk queries instead of 2N+1 queries
    users_result = supabase.table("users").select("*").execute()
    quizzes_result = supabase.table("quizzes").select("id, user_id").execute()
    attempts_result = supabase.table("attempts").select("is_correct, user_id").execute()
    
    users = users_result.data or []
    quizzes = quizzes_result.data or []
    attempts = attempts_result.data or []
        
    # Aggregate quizzes by user
    quiz_counts = {}
    for q in quizzes:
        uid = q.get("user_id")
        quiz_counts[uid] = quiz_counts.get(uid, 0) + 1
        
    # Aggregate attempts and correctness by user
    attempt_stats = {}
    for a in attempts:
        uid = a.get("user_id")
        if uid not in attempt_stats:
            attempt_stats[uid] = {"total": 0, "correct": 0}
        attempt_stats[uid]["total"] += 1
        if a.get("is_correct"):
            attempt_stats[uid]["correct"] += 1

    items = []
    for user in users:
        uid = user["id"]
        q_count = quiz_counts.get(uid, 0)
        
        stats = attempt_stats.get(uid, {"total": 0, "correct": 0})
        total_attempts = stats["total"]
        correct = stats["correct"]
        accuracy = round(correct / total_attempts, 3) if total_attempts > 0 else 0

        items.append(
            AdminUserListItem(
                id=uid,
                email=user["email"],
                name=user.get("name", ""),
                elo_rating=user.get("elo_rating", 1000.0),
                total_quizzes=q_count,
                overall_accuracy=accuracy,
                created_at=user["created_at"],
            )
        )

    return items


@router.get("/analytics", response_model=AdminAnalytics)
def get_platform_analytics(current_user: dict = Depends(get_current_user)):
    """Get platform-wide analytics."""
    if current_user.get("email") != "radhamakwana28@gmail.com":
        raise HTTPException(status_code=403, detail="Admin access required")

    users = supabase.table("users").select("id").execute()
    quizzes = supabase.table("quizzes").select("id").execute()
    questions = supabase.table("questions").select("id, topic, difficulty").execute()
    attempts = supabase.table("attempts").select("is_correct, topic").execute()

    total_users = len(users.data) if users.data else 0
    total_quizzes = len(quizzes.data) if quizzes.data else 0
    total_questions = len(questions.data) if questions.data else 0

    # Average accuracy
    all_attempts = attempts.data or []
    correct = sum(1 for a in all_attempts if a.get("is_correct"))
    avg_accuracy = round(correct / len(all_attempts), 3) if all_attempts else 0

    # Popular topics
    topic_counts = {}
    for a in all_attempts:
        topic = a.get("topic", "General")
        topic_counts[topic] = topic_counts.get(topic, 0) + 1

    popular_topics = [
        {"topic": t, "count": c}
        for t, c in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    ]

    # Difficulty distribution
    difficulty_dist = {"easy": 0, "medium": 0, "hard": 0}
    for q in (questions.data or []):
        diff = q.get("difficulty", "medium")
        difficulty_dist[diff] = difficulty_dist.get(diff, 0) + 1

    return AdminAnalytics(
        total_users=total_users,
        total_quizzes=total_quizzes,
        total_questions=total_questions,
        avg_accuracy=avg_accuracy,
        active_users_today=total_users,  # Simplified
        popular_topics=popular_topics,
        difficulty_distribution=difficulty_dist,
    )


@router.get("/questions")
def list_questions(
    flagged_only: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """List questions, optionally filtered to flagged only."""
    if current_user.get("email") != "radhamakwana28@gmail.com":
        raise HTTPException(status_code=403, detail="Admin access required")

    query = supabase.table("questions").select("*")

    if flagged_only:
        query = query.eq("flagged", True)

    result = query.order("created_at", desc=True).limit(100).execute()

    questions = []
    for q in (result.data or []):
        options = json.loads(q.get("options", "[]")) if isinstance(q.get("options"), str) else q.get("options", [])
        questions.append({
            "id": q["id"],
            "type": q.get("type", "mcq"),
            "difficulty": q.get("difficulty", "medium"),
            "question_text": q.get("question_text", ""),
            "options": options,
            "correct_answer": q.get("correct_answer", ""),
            "topic": q.get("topic", "General"),
            "elo_rating": q.get("elo_rating", 1000.0),
            "flagged": q.get("flagged", False),
            "flag_reason": q.get("flag_reason", ""),
        })

    return {"questions": questions}


@router.put("/questions/{question_id}/flag")
def flag_question(
    question_id: str,
    data: QuestionFlag,
    current_user: dict = Depends(get_current_user),
):
    """Flag a question for review."""
    if current_user.get("email") != "radhamakwana28@gmail.com":
        raise HTTPException(status_code=403, detail="Admin access required")

    supabase.table("questions").update(
        {"flagged": True, "flag_reason": data.reason}
    ).eq("id", question_id).execute()

    return {"message": "Question flagged successfully"}


@router.put("/questions/{question_id}/unflag")
def unflag_question(
    question_id: str, current_user: dict = Depends(get_current_user)
):
    """Remove flag from a question."""
    if current_user.get("email") != "radhamakwana28@gmail.com":
        raise HTTPException(status_code=403, detail="Admin access required")

    supabase.table("questions").update(
        {"flagged": False, "flag_reason": ""}
    ).eq("id", question_id).execute()

    return {"message": "Question unflagged"}


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: str, current_user: dict = Depends(get_current_user)
):
    """Delete a question."""
    if current_user.get("email") != "radhamakwana28@gmail.com":
        raise HTTPException(status_code=403, detail="Admin access required")

    supabase.table("questions").delete().eq("id", question_id).execute()
    return {"message": "Question deleted successfully"}
