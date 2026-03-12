"""Prashna-AI Content Routes — Upload, fetch, parse, and manage educational content."""

import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form

from backend.database import supabase
from backend.auth_utils import get_current_user
from backend.schemas import ContentUpload, ContentURLFetch, ContentResponse, ContentListItem
from backend.services.content_processor import (
    extract_text_from_url,
    extract_text_from_pdf,
    clean_text,
    chunk_text,
    calculate_complexity_score,
    extract_key_concepts,
)
from backend.services.question_generator import summarize_content
from backend.services.ml_engine import discover_topics

router = APIRouter()


@router.post("/upload", response_model=ContentResponse)
def upload_content(
    data: ContentUpload, current_user: dict = Depends(get_current_user)
):
    """Upload text content for quiz generation."""
    cleaned = clean_text(data.text)
    if len(cleaned) < 50:
        raise HTTPException(status_code=400, detail="Content is too short. Please provide at least 50 characters.")

    chunks = chunk_text(cleaned)
    complexity = calculate_complexity_score(cleaned)
    concepts = extract_key_concepts(cleaned)
    summary_data = summarize_content(cleaned)
    topics_data = discover_topics(chunks)

    content_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    topic_names = [t["topic"] for t in topics_data]

    record = {
        "id": content_id,
        "user_id": current_user["id"],
        "title": data.title,
        "raw_text": cleaned,
        "chunks": json.dumps(chunks),
        "topics": topic_names,
        "summary": summary_data.get("summary", ""),
        "complexity_score": complexity,
        "source_type": data.source_type,
        "concepts": concepts[:30],
        "created_at": now,
    }

    supabase.table("content").insert(record).execute()

    return ContentResponse(
        id=content_id,
        user_id=current_user["id"],
        title=data.title,
        raw_text=cleaned[:500] + "..." if len(cleaned) > 500 else cleaned,
        chunks=chunks[:5],
        topics=topic_names,
        summary=summary_data.get("summary", ""),
        complexity_score=complexity,
        source_type=data.source_type,
        created_at=now,
    )


@router.post("/upload-pdf", response_model=ContentResponse)
def upload_pdf(
    file: UploadFile = File(...),
    title: str = Form("Uploaded PDF"),
    current_user: dict = Depends(get_current_user),
):
    """Upload a PDF file for quiz generation."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = file.file.read()
    raw_text = extract_text_from_pdf(pdf_bytes)
    cleaned = clean_text(raw_text)

    if len(cleaned) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough text from PDF.")

    chunks = chunk_text(cleaned)
    complexity = calculate_complexity_score(cleaned)
    concepts = extract_key_concepts(cleaned)
    summary_data = summarize_content(cleaned)
    topics_data = discover_topics(chunks)

    content_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    topic_names = [t["topic"] for t in topics_data]

    record = {
        "id": content_id,
        "user_id": current_user["id"],
        "title": title,
        "raw_text": cleaned,
        "chunks": json.dumps(chunks),
        "topics": topic_names,
        "summary": summary_data.get("summary", ""),
        "complexity_score": complexity,
        "source_type": "pdf",
        "concepts": concepts[:30],
        "created_at": now,
    }

    supabase.table("content").insert(record).execute()

    return ContentResponse(
        id=content_id,
        user_id=current_user["id"],
        title=title,
        raw_text=cleaned[:500] + "..." if len(cleaned) > 500 else cleaned,
        chunks=chunks[:5],
        topics=topic_names,
        summary=summary_data.get("summary", ""),
        complexity_score=complexity,
        source_type="pdf",
        created_at=now,
    )


@router.post("/url", response_model=ContentResponse)
def fetch_url_content(
    data: ContentURLFetch, current_user: dict = Depends(get_current_user)
):
    """Fetch content from a URL for quiz generation."""
    raw_text = extract_text_from_url(data.url)
    cleaned = clean_text(raw_text)

    if len(cleaned) < 50:
        raise HTTPException(status_code=400, detail="Could not extract enough content from URL.")

    chunks = chunk_text(cleaned)
    complexity = calculate_complexity_score(cleaned)
    concepts = extract_key_concepts(cleaned)
    summary_data = summarize_content(cleaned)
    topics_data = discover_topics(chunks)

    content_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    title = data.title or data.url[:60]

    topic_names = [t["topic"] for t in topics_data]

    record = {
        "id": content_id,
        "user_id": current_user["id"],
        "title": title,
        "raw_text": cleaned,
        "chunks": json.dumps(chunks),
        "topics": topic_names,
        "summary": summary_data.get("summary", ""),
        "complexity_score": complexity,
        "source_type": "url",
        "concepts": concepts[:30],
        "created_at": now,
    }

    supabase.table("content").insert(record).execute()

    return ContentResponse(
        id=content_id,
        user_id=current_user["id"],
        title=title,
        raw_text=cleaned[:500] + "..." if len(cleaned) > 500 else cleaned,
        chunks=chunks[:5],
        topics=topic_names,
        summary=summary_data.get("summary", ""),
        complexity_score=complexity,
        source_type="url",
        created_at=now,
    )


@router.get("/", response_model=list[ContentListItem])
def list_content(current_user: dict = Depends(get_current_user)):
    """List all content uploaded by the current user."""
    result = (
        supabase.table("content")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    items = []
    for c in result.data:
        chunks = json.loads(c.get("chunks", "[]")) if isinstance(c.get("chunks"), str) else c.get("chunks", [])
        topics = c.get("topics", [])

        items.append(
            ContentListItem(
                id=c["id"],
                title=c["title"],
                source_type=c.get("source_type", "text"),
                complexity_score=c.get("complexity_score", 0.5),
                topic_count=len(topics) if isinstance(topics, list) else 0,
                chunk_count=len(chunks),
                created_at=c["created_at"],
            )
        )

    return items


@router.get("/{content_id}", response_model=ContentResponse)
def get_content(content_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific content details."""
    result = (
        supabase.table("content")
        .select("*")
        .eq("id", content_id)
        .eq("user_id", current_user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Content not found")

    c = result.data[0]
    chunks = json.loads(c.get("chunks", "[]")) if isinstance(c.get("chunks"), str) else c.get("chunks", [])

    return ContentResponse(
        id=c["id"],
        user_id=c["user_id"],
        title=c["title"],
        raw_text=c.get("raw_text", "")[:500],
        chunks=chunks[:10],
        topics=c.get("topics", []),
        summary=c.get("summary", ""),
        complexity_score=c.get("complexity_score", 0.5),
        source_type=c.get("source_type", "text"),
        created_at=c["created_at"],
    )


@router.delete("/{content_id}")
def delete_content(content_id: str, current_user: dict = Depends(get_current_user)):
    """Delete content."""
    supabase.table("content").delete().eq("id", content_id).eq("user_id", current_user["id"]).execute()
    return {"message": "Content deleted successfully"}
