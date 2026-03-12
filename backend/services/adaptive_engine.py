"""Prashna-AI Adaptive Engine — Elo rating system and difficulty adjustment."""

import math


# Elo rating constants
K_FACTOR_USER = 32  # How much user rating changes per question
K_FACTOR_QUESTION = 16  # How much question rating changes
BASE_ELO = 1000.0


def calculate_expected_score(user_elo: float, question_elo: float) -> float:
    """Calculate expected probability of correct answer using Elo formula."""
    return 1.0 / (1.0 + math.pow(10, (question_elo - user_elo) / 400))


def update_elo_ratings(
    user_elo: float,
    question_elo: float,
    is_correct: bool,
    time_taken_seconds: float = 30.0,
) -> dict:
    """
    Update both user and question Elo ratings after an answer.
    Returns dict with new ratings and change amounts.
    """
    expected = calculate_expected_score(user_elo, question_elo)
    actual = 1.0 if is_correct else 0.0

    # Time bonus/penalty: faster correct answers get a small boost
    time_factor = 1.0
    if is_correct and time_taken_seconds < 15:
        time_factor = 1.15  # 15% bonus for fast correct answers
    elif is_correct and time_taken_seconds < 30:
        time_factor = 1.05  # 5% bonus for moderately fast
    elif not is_correct and time_taken_seconds < 5:
        time_factor = 1.1  # Penalize rushed wrong answers slightly more

    user_change = K_FACTOR_USER * (actual - expected) * time_factor
    question_change = K_FACTOR_QUESTION * (expected - actual)

    new_user_elo = max(100, user_elo + user_change)
    new_question_elo = max(100, question_elo + question_change)

    return {
        "user_elo_before": user_elo,
        "user_elo_after": round(new_user_elo, 1),
        "user_elo_change": round(user_change, 1),
        "question_elo_before": question_elo,
        "question_elo_after": round(new_question_elo, 1),
        "question_elo_change": round(question_change, 1),
    }


def get_target_difficulty(user_elo: float) -> str:
    """Map user Elo to a target difficulty level."""
    if user_elo < 800:
        return "easy"
    elif user_elo < 1200:
        return "medium"
    else:
        return "hard"


def select_next_difficulty(
    user_elo: float,
    recent_accuracy: float,
    consecutive_correct: int,
    consecutive_wrong: int,
) -> str:
    """
    Determine the next question difficulty based on adaptive logic.
    Uses Elo + recent performance for real-time adaptation.
    """
    base_difficulty = get_target_difficulty(user_elo)

    # Streak-based adjustment
    if consecutive_correct >= 3 and recent_accuracy > 0.8:
        # User is on fire — increase difficulty
        if base_difficulty == "easy":
            return "medium"
        elif base_difficulty == "medium":
            return "hard"
        return "hard"

    elif consecutive_wrong >= 2 and recent_accuracy < 0.4:
        # User is struggling — decrease difficulty
        if base_difficulty == "hard":
            return "medium"
        elif base_difficulty == "medium":
            return "easy"
        return "easy"

    return base_difficulty


def calculate_session_stats(attempts: list[dict]) -> dict:
    """Calculate performance stats for a quiz session."""
    if not attempts:
        return {
            "total": 0,
            "correct": 0,
            "accuracy": 0.0,
            "avg_time": 0.0,
            "difficulty_progression": [],
            "streak_best": 0,
        }

    total = len(attempts)
    correct = sum(1 for a in attempts if a.get("is_correct"))
    accuracy = correct / total if total > 0 else 0.0
    avg_time = (
        sum(a.get("time_taken_seconds", 0) for a in attempts) / total
        if total > 0
        else 0.0
    )

    # Track difficulty progression
    difficulty_progression = [a.get("difficulty", "medium") for a in attempts]

    # Best streak
    best_streak = 0
    current_streak = 0
    for a in attempts:
        if a.get("is_correct"):
            current_streak += 1
            best_streak = max(best_streak, current_streak)
        else:
            current_streak = 0

    return {
        "total": total,
        "correct": correct,
        "accuracy": round(accuracy, 3),
        "avg_time": round(avg_time, 1),
        "difficulty_progression": difficulty_progression,
        "streak_best": best_streak,
    }


def generate_recommendations(
    topic_performance: list[dict], overall_accuracy: float
) -> list[str]:
    """Generate personalized learning recommendations."""
    recommendations = []

    # Find weak topics (accuracy < 50%)
    weak_topics = [
        tp for tp in topic_performance if tp.get("accuracy", 0) < 0.5
    ]
    strong_topics = [
        tp for tp in topic_performance if tp.get("accuracy", 0) > 0.8
    ]

    for tp in weak_topics[:3]:
        topic = tp.get("topic", "this topic")
        acc = int(tp.get("accuracy", 0) * 100)
        recommendations.append(
            f"Focus on '{topic}' — your accuracy is {acc}%. Try reviewing the source material again."
        )

    if overall_accuracy > 0.85:
        recommendations.append(
            "Excellent performance! Consider increasing your difficulty level to challenge yourself further."
        )
    elif overall_accuracy < 0.4:
        recommendations.append(
            "Try lowering the difficulty level and focus on understanding core concepts before moving on."
        )

    if strong_topics:
        topics_str = ", ".join(t.get("topic", "") for t in strong_topics[:2])
        recommendations.append(
            f"Great mastery in: {topics_str}. Try harder questions on these topics."
        )

    if not recommendations:
        recommendations.append(
            "Keep practicing consistently! Regular quizzes help reinforce learning."
        )

    return recommendations
