"""Prashna-AI ML Engine — Topic modeling, performance prediction, knowledge graph, visualization data."""

import re
import math
from collections import Counter, defaultdict


def discover_topics(chunks: list[str], num_topics: int = 5) -> list[dict]:
    """
    Discover topics from text chunks using keyword frequency analysis.
    Falls back to frequency-based approach if BERTopic is unavailable.
    Returns list of {topic, keywords, chunk_indices}.
    """
    try:
        from bertopic import BERTopic

        if len(chunks) < 3:
            return _discover_topics_fallback(chunks, num_topics)

        topic_model = BERTopic(
            nr_topics=num_topics,
            verbose=False,
            calculate_probabilities=False,
        )
        topics, _ = topic_model.fit_transform(chunks)

        result = []
        topic_info = topic_model.get_topic_info()

        for _, row in topic_info.iterrows():
            if row["Topic"] == -1:
                continue
            topic_words = topic_model.get_topic(row["Topic"])
            keywords = [word for word, _ in topic_words[:5]]
            chunk_indices = [i for i, t in enumerate(topics) if t == row["Topic"]]

            result.append(
                {
                    "topic": keywords[0].title() if keywords else f"Topic {row['Topic']}",
                    "keywords": keywords,
                    "chunk_indices": chunk_indices,
                    "size": len(chunk_indices),
                }
            )

        return result if result else _discover_topics_fallback(chunks, num_topics)

    except (ImportError, Exception):
        return _discover_topics_fallback(chunks, num_topics)


def _discover_topics_fallback(chunks: list[str], num_topics: int = 5) -> list[dict]:
    """Frequency-based topic discovery when BERTopic is unavailable."""
    # Common English stopwords
    stopwords = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "shall", "can", "need", "dare", "ought",
        "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
        "as", "into", "through", "during", "before", "after", "above",
        "below", "between", "out", "off", "over", "under", "again", "further",
        "then", "once", "here", "there", "when", "where", "why", "how", "all",
        "each", "every", "both", "few", "more", "most", "other", "some",
        "such", "no", "nor", "not", "only", "own", "same", "so", "than",
        "too", "very", "just", "because", "but", "and", "or", "if", "while",
        "that", "this", "these", "those", "it", "its", "they", "them",
        "their", "we", "us", "our", "you", "your", "he", "him", "his",
        "she", "her", "which", "what", "who", "whom",
    }

    all_text = " ".join(chunks).lower()
    words = re.findall(r"\b[a-z]{4,}\b", all_text)
    words = [w for w in words if w not in stopwords]

    word_freq = Counter(words)
    top_words = [w for w, _ in word_freq.most_common(num_topics * 3)]

    # Group into topics
    topics = []
    used_words = set()

    for i in range(min(num_topics, len(top_words))):
        if i >= len(top_words):
            break
        keyword = top_words[i]
        if keyword in used_words:
            continue

        # Find related words that co-occur
        related = [keyword]
        used_words.add(keyword)

        for w in top_words:
            if w in used_words:
                continue
            # Check co-occurrence in chunks
            co_occur = sum(
                1 for c in chunks if keyword in c.lower() and w in c.lower()
            )
            if co_occur >= 1:
                related.append(w)
                used_words.add(w)
                if len(related) >= 5:
                    break

        chunk_indices = [
            i for i, c in enumerate(chunks) if keyword in c.lower()
        ]

        topics.append(
            {
                "topic": keyword.title(),
                "keywords": related,
                "chunk_indices": chunk_indices,
                "size": len(chunk_indices),
            }
        )

    return topics if topics else [{"topic": "General", "keywords": ["general"], "chunk_indices": list(range(len(chunks))), "size": len(chunks)}]


def predict_performance(user_attempts: list[dict], target_topic: str = None) -> dict:
    """
    Predict user performance on topics based on historical data.
    Uses weighted moving average of recent accuracy with topic similarity.
    """
    if not user_attempts:
        return {
            "predicted_accuracy": 0.5,
            "confidence": 0.1,
            "basis": "no_history",
        }

    # Group by topic
    topic_stats = defaultdict(lambda: {"correct": 0, "total": 0, "recent": []})

    for attempt in user_attempts:
        topic = attempt.get("topic", "General")
        is_correct = attempt.get("is_correct", False)
        topic_stats[topic]["total"] += 1
        if is_correct:
            topic_stats[topic]["correct"] += 1
        topic_stats[topic]["recent"].append(1.0 if is_correct else 0.0)

    if target_topic and target_topic in topic_stats:
        stats = topic_stats[target_topic]
        # Weighted recent accuracy (more weight to recent attempts)
        recent = stats["recent"][-10:]  # Last 10 attempts
        weights = [i + 1 for i in range(len(recent))]
        weighted_acc = sum(r * w for r, w in zip(recent, weights)) / sum(weights)

        return {
            "predicted_accuracy": round(weighted_acc, 3),
            "confidence": min(0.9, stats["total"] / 20),
            "basis": "topic_history",
            "sample_size": stats["total"],
        }

    # Overall prediction
    total_correct = sum(s["correct"] for s in topic_stats.values())
    total_all = sum(s["total"] for s in topic_stats.values())
    overall_acc = total_correct / total_all if total_all > 0 else 0.5

    return {
        "predicted_accuracy": round(overall_acc, 3),
        "confidence": min(0.9, total_all / 50),
        "basis": "overall_history",
        "sample_size": total_all,
    }


def detect_weak_areas(user_attempts: list[dict]) -> list[dict]:
    """
    Analyze user attempts to find weak knowledge areas.
    Returns topics where accuracy is significantly below average.
    """
    if not user_attempts:
        return []

    topic_stats = defaultdict(lambda: {"correct": 0, "total": 0, "times": []})

    for attempt in user_attempts:
        topic = attempt.get("topic", "General")
        topic_stats[topic]["total"] += 1
        if attempt.get("is_correct"):
            topic_stats[topic]["correct"] += 1
        topic_stats[topic]["times"].append(
            attempt.get("time_taken_seconds", 30)
        )

    # Calculate overall accuracy
    total_correct = sum(s["correct"] for s in topic_stats.values())
    total_all = sum(s["total"] for s in topic_stats.values())
    overall_acc = total_correct / total_all if total_all > 0 else 0.5

    weak_areas = []
    for topic, stats in topic_stats.items():
        if stats["total"] < 2:
            continue

        accuracy = stats["correct"] / stats["total"]
        avg_time = sum(stats["times"]) / len(stats["times"])

        # Weak if accuracy is 20%+ below overall, or if avg time is very high
        if accuracy < overall_acc - 0.15 or (accuracy < 0.5 and avg_time > 45):
            weak_areas.append(
                {
                    "topic": topic,
                    "accuracy": round(accuracy, 3),
                    "total_attempts": stats["total"],
                    "avg_time_seconds": round(avg_time, 1),
                    "gap_from_average": round(overall_acc - accuracy, 3),
                    "suggestion": _get_improvement_suggestion(accuracy, avg_time),
                }
            )

    return sorted(weak_areas, key=lambda x: x["accuracy"])


def _get_improvement_suggestion(accuracy: float, avg_time: float) -> str:
    """Generate specific improvement suggestion based on performance pattern."""
    if accuracy < 0.3:
        return "Review foundational concepts in this topic. Consider re-reading the source material carefully."
    elif accuracy < 0.5 and avg_time > 40:
        return "You may need more practice with this topic. Try starting with easier questions."
    elif accuracy < 0.5:
        return "Common mistakes detected. Focus on understanding why your answers were incorrect."
    elif avg_time > 50:
        return "Your accuracy is decent but response time is high. Practice more to build confidence."
    return "Keep practicing to strengthen this area."


def build_knowledge_graph(
    content_chunks: list[str], concepts: list[str]
) -> dict:
    """
    Build a knowledge graph showing relationships between concepts.
    Returns nodes and edges for D3.js visualization.
    """
    if not concepts:
        return {"nodes": [], "edges": []}

    nodes = []
    edges = []
    concept_frequency = Counter()

    # Count concept frequency across chunks
    for chunk in content_chunks:
        chunk_lower = chunk.lower()
        for concept in concepts:
            if concept.lower() in chunk_lower:
                concept_frequency[concept] += 1

    # Create nodes
    for concept in concepts[:30]:  # Limit to 30 for visualization
        freq = concept_frequency.get(concept, 1)
        nodes.append(
            {
                "id": concept.lower().replace(" ", "_"),
                "label": concept,
                "group": _get_concept_group(concept, content_chunks),
                "size": min(3.0, 0.5 + freq * 0.3),
            }
        )

    # Create edges based on co-occurrence in chunks
    for i, c1 in enumerate(concepts[:30]):
        for j, c2 in enumerate(concepts[:30]):
            if i >= j:
                continue

            co_occurrence = sum(
                1
                for chunk in content_chunks
                if c1.lower() in chunk.lower() and c2.lower() in chunk.lower()
            )

            if co_occurrence > 0:
                edges.append(
                    {
                        "source": c1.lower().replace(" ", "_"),
                        "target": c2.lower().replace(" ", "_"),
                        "weight": min(3.0, co_occurrence * 0.5),
                    }
                )

    return {"nodes": nodes, "edges": edges}


def _get_concept_group(concept: str, chunks: list[str]) -> str:
    """Assign a group/category to a concept based on context."""
    concept_lower = concept.lower()

    # Simple heuristic grouping
    science_terms = ["theory", "equation", "experiment", "hypothesis", "law", "force", "energy"]
    tech_terms = ["algorithm", "data", "computer", "software", "system", "network", "code"]
    math_terms = ["number", "function", "equation", "formula", "calculate", "graph"]
    history_terms = ["century", "war", "king", "empire", "revolution", "civilization"]

    for term in science_terms:
        if term in concept_lower:
            return "Science"
    for term in tech_terms:
        if term in concept_lower:
            return "Technology"
    for term in math_terms:
        if term in concept_lower:
            return "Mathematics"
    for term in history_terms:
        if term in concept_lower:
            return "History"

    return "General"


def generate_embedding_coordinates(chunks: list[str]) -> list[dict]:
    """
    Generate 2D coordinates for topic cluster visualization.
    Uses TF-IDF + simple dimensionality reduction when sklearn is available,
    falls back to heuristic positioning.
    """
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.decomposition import PCA

        if len(chunks) < 3:
            return _embedding_fallback(chunks)

        vectorizer = TfidfVectorizer(max_features=100, stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(chunks)

        n_components = min(2, tfidf_matrix.shape[0] - 1, tfidf_matrix.shape[1])
        if n_components < 2:
            return _embedding_fallback(chunks)

        pca = PCA(n_components=2)
        coords = pca.fit_transform(tfidf_matrix.toarray())

        result = []
        for i, (x, y) in enumerate(coords):
            preview = chunks[i][:80] + "..." if len(chunks[i]) > 80 else chunks[i]
            result.append(
                {
                    "x": round(float(x), 4),
                    "y": round(float(y), 4),
                    "chunk_index": i,
                    "preview": preview,
                }
            )

        return result

    except ImportError:
        return _embedding_fallback(chunks)


def _embedding_fallback(chunks: list[str]) -> list[dict]:
    """Simple positioning when sklearn is unavailable."""
    result = []
    n = len(chunks)
    for i, chunk in enumerate(chunks):
        angle = (2 * math.pi * i) / max(n, 1)
        radius = 1 + (len(chunk) / 500)
        preview = chunk[:80] + "..." if len(chunk) > 80 else chunk
        result.append(
            {
                "x": round(radius * math.cos(angle), 4),
                "y": round(radius * math.sin(angle), 4),
                "chunk_index": i,
                "preview": preview,
            }
        )
    return result
