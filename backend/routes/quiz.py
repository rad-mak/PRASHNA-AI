"""Prashna-AI Quiz Routes — Generate, take, and submit quizzes with adaptive logic."""

import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks

from backend.database import supabase
from backend.auth_utils import get_current_user
from backend.schemas import (
    QuizGenerateRequest, QuizResponse, QuizListItem,
    QuizSubmitRequest, QuizResultResponse, QuestionResponse,
    QuestionOption, QuestionResult,
)
from backend.services.question_generator import generate_questions
from backend.services.adaptive_engine import (
    update_elo_ratings, select_next_difficulty,
    calculate_session_stats, generate_recommendations,
)

router = APIRouter()


@router.post("/generate", response_model=QuizResponse)
def generate_quiz(
    data: QuizGenerateRequest, current_user: dict = Depends(get_current_user)
):
    """Generate a new quiz from uploaded content."""
    # Get content
    content_result = (
        supabase.table("content")
        .select("*")
        .eq("id", data.content_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not content_result.data:
        raise HTTPException(status_code=404, detail="Content not found")

    content = content_result.data[0]
    raw_text = content.get("raw_text", "")
    chunks = json.loads(content.get("chunks", "[]")) if isinstance(content.get("chunks"), str) else content.get("chunks", [])

    # Use chunks for better question generation
    combined_text = "\n\n".join(chunks[:5]) if chunks else raw_text

    # Determine difficulty
    difficulty = data.difficulty
    if data.adaptive_mode:
        user_result = supabase.table("users").select("elo_rating").eq("id", current_user["id"]).execute()
        if user_result.data:
            user_elo = user_result.data[0].get("elo_rating", 1000.0)
            if user_elo < 800:
                difficulty = "easy"
            elif user_elo < 1200:
                difficulty = "medium"
            else:
                difficulty = "hard"

    # Generate questions using GPT
    raw_questions = generate_questions(
        content=combined_text,
        num_questions=data.num_questions,
        question_types=data.question_types,
        difficulty=difficulty,
    )

    # Save quiz
    quiz_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    quiz_record = {
        "id": quiz_id,
        "user_id": current_user["id"],
        "content_id": data.content_id,
        "title": f"Quiz: {content.get('title', 'Untitled')}",
        "difficulty": difficulty,
        "question_count": len(raw_questions),
        "adaptive_mode": data.adaptive_mode,
        "created_at": now,
    }
    supabase.table("quizzes").insert(quiz_record).execute()

    # Save questions and build response
    questions_response = []
    for i, q in enumerate(raw_questions):
        q_id = str(uuid.uuid4())

        options = q.get("options", [])
        options_formatted = [
            QuestionOption(
                label=opt.get("label", chr(65 + j)),
                text=opt.get("text", ""),
                is_correct=opt.get("is_correct", False)
            )
            for j, opt in enumerate(options)
        ]

        question_record = {
            "id": q_id,
            "quiz_id": quiz_id,
            "content_id": data.content_id,
            "type": q.get("type", "mcq"),
            "difficulty": q.get("difficulty", difficulty),
            "question_text": q.get("question_text", ""),
            "options": json.dumps(options),
            "correct_answer": q.get("correct_answer", ""),
            "explanation": q.get("explanation", ""),
            "topic": q.get("topic", "General"),
            "elo_rating": 1000.0,
            "order_index": i,
            "flagged": False,
        }
        supabase.table("questions").insert(question_record).execute()

        questions_response.append(
            QuestionResponse(
                id=q_id,
                content_id=data.content_id,
                type=q.get("type", "mcq"),
                difficulty=q.get("difficulty", difficulty),
                question_text=q.get("question_text", ""),
                options=options_formatted,
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", ""),
                topic=q.get("topic", "General"),
                elo_rating=1000.0,
            )
        )

    return QuizResponse(
        id=quiz_id,
        user_id=current_user["id"],
        title=quiz_record["title"],
        difficulty=difficulty,
        question_count=len(questions_response),
        adaptive_mode=data.adaptive_mode,
        questions=questions_response,
        created_at=now,
    )


@router.get("/", response_model=list[QuizListItem])
def list_quizzes(current_user: dict = Depends(get_current_user)):
    """List all quizzes for the current user. Optimized for bulk fetch."""
    result = (
        supabase.table("quizzes")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    # Fetch all attempts for the user in a single query
    attempts_result = (
        supabase.table("attempts")
        .select("quiz_id, is_correct")
        .eq("user_id", current_user["id"])
        .execute()
    )
    
    # Aggregate stats by quiz_id
    quiz_stats = {}
    for a in (attempts_result.data or []):
        qid = a.get("quiz_id")
        if not qid:
            continue
        if qid not in quiz_stats:
            quiz_stats[qid] = {"total": 0, "correct": 0}
        quiz_stats[qid]["total"] += 1
        if a.get("is_correct"):
            quiz_stats[qid]["correct"] += 1

    items = []
    for q in result.data:
        qid = q["id"]
        score = None
        completed = False
        
        if qid in quiz_stats:
            stats = quiz_stats[qid]
            completed = True
            total = stats["total"]
            if total > 0:
                score = round((stats["correct"] / total) * 100, 1)

        items.append(
            QuizListItem(
                id=qid,
                title=q.get("title", "Quiz"),
                difficulty=q.get("difficulty", "medium"),
                question_count=q.get("question_count", 0),
                score=score,
                completed=completed,
                created_at=q["created_at"],
            )
        )

    return items


@router.get("/{quiz_id}", response_model=QuizResponse)
def get_quiz(quiz_id: str, current_user: dict = Depends(get_current_user)):
    """Get a quiz with all its questions."""
    quiz_result = (
        supabase.table("quizzes")
        .select("*")
        .eq("id", quiz_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not quiz_result.data:
        raise HTTPException(status_code=404, detail="Quiz not found")

    quiz = quiz_result.data[0]

    questions_result = (
        supabase.table("questions")
        .select("*")
        .eq("quiz_id", quiz_id)
        .order("order_index")
        .execute()
    )

    questions = []
    for q in questions_result.data:
        options_raw = json.loads(q.get("options", "[]")) if isinstance(q.get("options"), str) else q.get("options", [])
        options = [
            QuestionOption(
                label=opt.get("label", ""),
                text=opt.get("text", ""),
                is_correct=opt.get("is_correct", False)
            )
            for opt in options_raw
        ]

        questions.append(
            QuestionResponse(
                id=q["id"],
                content_id=q.get("content_id", ""),
                type=q.get("type", "mcq"),
                difficulty=q.get("difficulty", "medium"),
                question_text=q.get("question_text", ""),
                options=options,
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", ""),
                topic=q.get("topic", "General"),
                elo_rating=q.get("elo_rating", 1000.0),
            )
        )

    return QuizResponse(
        id=quiz["id"],
        user_id=quiz["user_id"],
        title=quiz.get("title", "Quiz"),
        difficulty=quiz.get("difficulty", "medium"),
        question_count=len(questions),
        adaptive_mode=quiz.get("adaptive_mode", False),
        questions=questions,
        created_at=quiz["created_at"],
    )


@router.post("/{quiz_id}/submit", response_model=QuizResultResponse)
def submit_quiz(
    quiz_id: str,
    data: QuizSubmitRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Submit quiz answers and get results with adaptive scoring. Fast response using background tasks."""
    # Get user Elo
    user_result = supabase.table("users").select("elo_rating").eq("id", current_user["id"]).execute()
    user_elo = user_result.data[0].get("elo_rating", 1000.0) if user_result.data else 1000.0
    elo_before = user_elo

    now = datetime.now(timezone.utc).isoformat()
    question_results = []
    total_time = 0.0
    correct_count = 0
    difficulty_progression = []

    # Fetch all questions for this quiz in a single query
    q_result = supabase.table("questions").select("*").eq("quiz_id", quiz_id).execute()
    questions_map = {q["id"]: q for q in q_result.data} if q_result.data else {}

    attempt_records = []
    question_elo_updates = []

    for answer in data.answers:
        question = questions_map.get(answer.question_id)
        if not question:
            continue

        correct_answer = question.get("correct_answer", "")
        
        # LENIENT EVALUATION FOR WRITTEN/SHORT ANSWERS
        user_ans = answer.user_answer.strip().lower()
        corr_ans = correct_answer.strip().lower()
        is_correct = False
        
        if user_ans == corr_ans:
            is_correct = True
        elif len(user_ans) > 2 and (user_ans in corr_ans or corr_ans in user_ans):
            is_correct = True
        else:
            # Keyword matching (words > 3 chars)
            corr_words = set(w for w in corr_ans.replace(",", " ").replace(".", " ").split() if len(w) > 3)
            user_words = set(w for w in user_ans.replace(",", " ").replace(".", " ").split() if len(w) > 3)
            if corr_words and corr_words.intersection(user_words):
                is_correct = True

        if is_correct:
            correct_count += 1

        # Update Elo ratings
        question_elo = question.get("elo_rating", 1000.0)
        elo_update = update_elo_ratings(
            user_elo=user_elo,
            question_elo=question_elo,
            is_correct=is_correct,
            time_taken_seconds=answer.time_taken_seconds,
        )

        user_elo = elo_update["user_elo_after"]
        
        # Save question Elo update to apply in background
        question_elo_updates.append((answer.question_id, elo_update["question_elo_after"]))

        # Save attempt into array for bulk insert
        attempt_records.append({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "quiz_id": quiz_id,
            "question_id": answer.question_id,
            "user_answer": answer.user_answer,
            "is_correct": is_correct,
            "time_taken_seconds": answer.time_taken_seconds,
            "topic": question.get("topic", "General"),
            "difficulty": question.get("difficulty", "medium"),
            "elo_change": elo_update["user_elo_change"],
            "created_at": now,
        })

        total_time += answer.time_taken_seconds
        difficulty_progression.append(question.get("difficulty", "medium"))

        question_results.append(
            QuestionResult(
                question_id=answer.question_id,
                question_text=question.get("question_text", ""),
                user_answer=answer.user_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
                time_taken_seconds=answer.time_taken_seconds,
                explanation=question.get("explanation", ""),
                elo_change=elo_update["user_elo_change"],
            )
        )

    # BACKGROUND TASK: Offload all DB writes
    def save_quiz_results_background(
        attempts: list[dict], 
        u_id: str, 
        new_u_elo: float,
        q_updates: list[tuple[str, float]]
    ):
        try:
            if attempts:
                supabase.table("attempts").insert(attempts).execute()
            for q_id, q_elo in q_updates:
                supabase.table("questions").update({"elo_rating": q_elo}).eq("id", q_id).execute()
            supabase.table("users").update({"elo_rating": round(new_u_elo, 1)}).eq("id", u_id).execute()
        except Exception as e:
            print(f"Background save failed: {e}")

    # Dispatch to FastAPI BackgroundTasks
    background_tasks.add_task(
        save_quiz_results_background,
        attempts=attempt_records,
        u_id=current_user["id"],
        new_u_elo=user_elo,
        q_updates=question_elo_updates
    )

    total_questions = len(data.answers)
    score_pct = round((correct_count / total_questions) * 100, 1) if total_questions > 0 else 0
    avg_time = round(total_time / total_questions, 1) if total_questions > 0 else 0

    # Get weak topics
    weak_topics = list(set(
        qr.question_text[:30]
        for qr in question_results
        if not qr.is_correct
    ))[:5]

    # Generate recommendations
    recommendations = generate_recommendations(
        [{"topic": qr.question_text[:30], "accuracy": 1.0 if qr.is_correct else 0.0} for qr in question_results],
        score_pct / 100,
    )

    return QuizResultResponse(
        quiz_id=quiz_id,
        total_questions=total_questions,
        correct_count=correct_count,
        score_percentage=score_pct,
        total_time_seconds=round(total_time, 1),
        avg_time_per_question=avg_time,
        elo_before=elo_before,
        elo_after=round(user_elo, 1),
        elo_change=round(user_elo - elo_before, 1),
        difficulty_progression=difficulty_progression,
        question_results=question_results,
        weak_topics=weak_topics,
        recommendations=recommendations,
    )
