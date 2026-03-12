"""Prashna-AI Analytics Routes — Performance data, predictions, knowledge graph."""

import json
from fastapi import APIRouter, Depends

from backend.database import supabase
from backend.auth_utils import get_current_user
from backend.schemas import PerformanceOverview, TopicPerformance, KnowledgeGraphResponse
from backend.services.ml_engine import (
    predict_performance,
    detect_weak_areas,
    build_knowledge_graph,
    generate_embedding_coordinates,
)
from backend.services.adaptive_engine import generate_recommendations

router = APIRouter()


@router.get("/performance", response_model=PerformanceOverview)
def get_performance(current_user: dict = Depends(get_current_user)):
    """Get comprehensive performance analytics for the current user."""
    # Get all attempts
    attempts_result = (
        supabase.table("attempts")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at")
        .execute()
    )
    attempts = attempts_result.data or []

    # Get user Elo
    user_result = (
        supabase.table("users")
        .select("elo_rating")
        .eq("id", current_user["id"])
        .execute()
    )
    current_elo = user_result.data[0].get("elo_rating", 1000.0) if user_result.data else 1000.0

    # Count quizzes
    quizzes_result = (
        supabase.table("quizzes")
        .select("id")
        .eq("user_id", current_user["id"])
        .execute()
    )

    # Topic-wise performance
    topic_stats = {}
    for attempt in attempts:
        topic = attempt.get("topic", "General")
        if topic not in topic_stats:
            topic_stats[topic] = {"correct": 0, "total": 0}
        topic_stats[topic]["total"] += 1
        if attempt.get("is_correct"):
            topic_stats[topic]["correct"] += 1

    topic_performance = []
    for topic, stats in topic_stats.items():
        accuracy = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
        prediction = predict_performance(attempts, topic)

        topic_performance.append(
            TopicPerformance(
                topic=topic,
                accuracy=round(accuracy, 3),
                total_attempts=stats["total"],
                predicted_accuracy=prediction["predicted_accuracy"],
                difficulty_level="easy" if accuracy > 0.8 else ("hard" if accuracy < 0.4 else "medium"),
            )
        )

    # Overall stats
    total_correct = sum(1 for a in attempts if a.get("is_correct"))
    overall_accuracy = total_correct / len(attempts) if attempts else 0

    # Elo history (from attempts' elo_change)
    elo_history = []
    running_elo = 1000.0
    for attempt in attempts:
        change = attempt.get("elo_change", 0)
        running_elo += change
        elo_history.append({"elo": round(running_elo, 1), "date": attempt.get("created_at", "")})

    # Weak and strong areas
    weak_areas_data = detect_weak_areas(attempts)
    weak_areas = [w["topic"] for w in weak_areas_data]
    strong_areas = [tp.topic for tp in topic_performance if tp.accuracy > 0.75]

    recommendations = generate_recommendations(
        [{"topic": tp.topic, "accuracy": tp.accuracy} for tp in topic_performance],
        overall_accuracy,
    )

    return PerformanceOverview(
        total_quizzes=len(quizzes_result.data) if quizzes_result.data else 0,
        total_questions_answered=len(attempts),
        overall_accuracy=round(overall_accuracy, 3),
        current_elo=current_elo,
        elo_history=elo_history[-50:],  # Last 50 points
        topic_performance=topic_performance,
        weak_areas=weak_areas,
        strong_areas=strong_areas,
        recommendations=recommendations,
    )


@router.get("/knowledge-graph", response_model=KnowledgeGraphResponse)
def get_knowledge_graph(current_user: dict = Depends(get_current_user)):
    """Get knowledge graph data for D3.js visualization."""
    # Get all user content
    content_result = (
        supabase.table("content")
        .select("chunks, concepts, topics")
        .eq("user_id", current_user["id"])
        .execute()
    )

    all_chunks = []
    all_concepts = []

    for c in (content_result.data or []):
        chunks = json.loads(c.get("chunks", "[]")) if isinstance(c.get("chunks"), str) else c.get("chunks", [])
        all_chunks.extend(chunks)
        concepts = c.get("concepts", [])
        if isinstance(concepts, list):
            all_concepts.extend(concepts)

    if not all_concepts:
        return KnowledgeGraphResponse(nodes=[], edges=[])

    # Remove duplicates
    all_concepts = list(set(all_concepts))
    graph_data = build_knowledge_graph(all_chunks, all_concepts)

    return KnowledgeGraphResponse(
        nodes=[
            {"id": n["id"], "label": n["label"], "group": n["group"], "size": n["size"]}
            for n in graph_data["nodes"]
        ],
        edges=[
            {"source": e["source"], "target": e["target"], "weight": e["weight"]}
            for e in graph_data["edges"]
        ],
    )


@router.get("/topic-clusters")
def get_topic_clusters(current_user: dict = Depends(get_current_user)):
    """Get topic cluster visualization data (t-SNE/PCA coordinates)."""
    content_result = (
        supabase.table("content")
        .select("chunks")
        .eq("user_id", current_user["id"])
        .execute()
    )

    all_chunks = []
    for c in (content_result.data or []):
        chunks = json.loads(c.get("chunks", "[]")) if isinstance(c.get("chunks"), str) else c.get("chunks", [])
        all_chunks.extend(chunks)

    if not all_chunks:
        return {"coordinates": []}

    coords = generate_embedding_coordinates(all_chunks)
    return {"coordinates": coords}


@router.get("/weak-areas")
def get_weak_areas(current_user: dict = Depends(get_current_user)):
    """Get detailed weak area analysis."""
    attempts_result = (
        supabase.table("attempts")
        .select("*")
        .eq("user_id", current_user["id"])
        .execute()
    )

    weak_areas = detect_weak_areas(attempts_result.data or [])
    return {"weak_areas": weak_areas}


@router.get("/predictions")
def get_predictions(current_user: dict = Depends(get_current_user)):
    """Get performance predictions for each topic."""
    attempts_result = (
        supabase.table("attempts")
        .select("*")
        .eq("user_id", current_user["id"])
        .execute()
    )
    attempts = attempts_result.data or []

    # Get unique topics
    topics = list(set(a.get("topic", "General") for a in attempts))

    predictions = {}
    for topic in topics:
        pred = predict_performance(attempts, topic)
        predictions[topic] = pred

    return {"predictions": predictions}
