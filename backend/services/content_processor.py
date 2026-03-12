"""Prashna-AI Content Processor — PDF extraction, URL scraping, NLP chunking, complexity scoring."""

import re
import math
import requests
from bs4 import BeautifulSoup


def extract_text_from_url(url: str) -> str:
    """Fetch and extract clean text from a URL."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # Remove script and style elements
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
        # Clean up whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines)
    except Exception as e:
        raise ValueError(f"Failed to fetch URL: {str(e)}")


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF file bytes using pdfplumber."""
    import pdfplumber
    import io

    text_parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


def clean_text(text: str) -> str:
    """Clean and normalize text content."""
    # Remove excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    # Remove non-printable characters
    text = re.sub(r"[^\x20-\x7E\n\r\t]", " ", text)
    return text.strip()


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks for question generation."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks = []
    current_chunk = []
    current_length = 0

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        sentence_length = len(sentence.split())

        if current_length + sentence_length > chunk_size and current_chunk:
            chunk_text_str = " ".join(current_chunk)
            chunks.append(chunk_text_str)

            # Keep overlap
            overlap_words = []
            overlap_count = 0
            for s in reversed(current_chunk):
                words = s.split()
                if overlap_count + len(words) > overlap:
                    break
                overlap_words.insert(0, s)
                overlap_count += len(words)

            current_chunk = overlap_words
            current_length = overlap_count

        current_chunk.append(sentence)
        current_length += sentence_length

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks if chunks else [text]


def calculate_complexity_score(text: str) -> float:
    """
    Calculate text complexity using multiple readability metrics.
    Returns a normalized score from 0.0 (very easy) to 1.0 (very hard).

    Uses: Flesch-Kincaid Grade Level, average word length, vocabulary richness.
    """
    words = text.split()
    if len(words) < 10:
        return 0.3

    sentences = re.split(r"[.!?]+", text)
    sentences = [s.strip() for s in sentences if s.strip()]

    if not sentences:
        return 0.3

    # Average words per sentence
    avg_words_per_sentence = len(words) / len(sentences)

    # Average syllables per word (approximation)
    def count_syllables(word):
        word = word.lower()
        count = 0
        vowels = "aeiouy"
        if word[0] in vowels:
            count += 1
        for i in range(1, len(word)):
            if word[i] in vowels and word[i - 1] not in vowels:
                count += 1
        if word.endswith("e"):
            count -= 1
        return max(count, 1)

    total_syllables = sum(count_syllables(w) for w in words if len(w) > 0)
    avg_syllables_per_word = total_syllables / len(words)

    # Flesch-Kincaid Grade Level
    fk_grade = (
        0.39 * avg_words_per_sentence + 11.8 * avg_syllables_per_word - 15.59
    )

    # Vocabulary richness (type-token ratio)
    unique_words = len(set(w.lower() for w in words))
    vocabulary_richness = unique_words / len(words)

    # Average word length
    avg_word_length = sum(len(w) for w in words) / len(words)

    # Normalize to 0-1 scale
    fk_normalized = min(max(fk_grade / 16.0, 0.0), 1.0)
    length_normalized = min(max((avg_word_length - 3) / 5, 0.0), 1.0)
    richness_normalized = min(max(vocabulary_richness, 0.0), 1.0)

    # Weighted combination
    score = (
        0.5 * fk_normalized + 0.25 * length_normalized + 0.25 * richness_normalized
    )

    return round(min(max(score, 0.05), 0.95), 3)


def extract_key_concepts(text: str) -> list[str]:
    """
    Extract key concepts from text using frequency analysis and NLP heuristics.
    Falls back to frequency-based extraction if spaCy is not available.
    """
    try:
        import spacy

        try:
            nlp = spacy.load("en_core_web_sm")
        except OSError:
            return _extract_concepts_fallback(text)

        doc = nlp(text[:100000])  # Limit for performance

        concepts = set()

        # Named entities
        for ent in doc.ents:
            if ent.label_ in [
                "ORG", "PERSON", "GPE", "PRODUCT", "EVENT",
                "WORK_OF_ART", "LAW", "NORP", "FAC",
            ]:
                concepts.add(ent.text.strip())

        # Noun chunks (key phrases)
        for chunk in doc.noun_chunks:
            if len(chunk.text.split()) <= 4 and len(chunk.text) > 3:
                concepts.add(chunk.text.strip())

        return list(concepts)[:50]

    except ImportError:
        return _extract_concepts_fallback(text)


def _extract_concepts_fallback(text: str) -> list[str]:
    """Fallback concept extraction using word frequency."""
    words = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", text)
    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1

    sorted_concepts = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [concept for concept, count in sorted_concepts[:30] if count >= 2]
