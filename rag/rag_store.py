"""KURE-v1 embeddings + Chroma vector store helpers.

The model is loaded once and stays resident so /retrieve-vocab and
/retrieve-coaching embed without reloading.
"""
import os
from functools import lru_cache

import chromadb

MODEL_NAME = "nlpai-lab/KURE-v1"
COLLECTION = "krdict_vocab"

_HERE = os.path.dirname(os.path.abspath(__file__))
CHROMA_DIR = os.path.join(_HERE, "chroma")


@lru_cache(maxsize=1)
def get_model():
    # Imported lazily so lightweight CLI/help paths don't pull in torch.
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODEL_NAME)


@lru_cache(maxsize=1)
def _client():
    return chromadb.PersistentClient(path=CHROMA_DIR)


def get_collection():
    return _client().get_or_create_collection(
        name=COLLECTION, metadata={"hnsw:space": "cosine"}
    )


def embed(texts):
    """Return a list of normalized embedding vectors (plain lists)."""
    vecs = get_model().encode(
        texts, normalize_embeddings=True, convert_to_numpy=True
    )
    return [v.tolist() for v in vecs]


def _hydrate(metadatas, ids):
    out = []
    for meta, _id in zip(metadatas, ids):
        out.append(
            {
                "id": _id,
                "korean": meta.get("headword", ""),
                "english": meta.get("english", ""),
                "pos": meta.get("pos", ""),
                "grade": meta.get("grade", ""),
                "definition": meta.get("definition", ""),
                "example": meta.get("example", ""),
            }
        )
    return out


def query_vocab(query_text: str, n_results: int = 80, grade: str | None = "중급"):
    """Semantic search over the corpus, optionally filtered by grade."""
    col = get_collection()
    where = {"grade": grade} if grade else None
    res = col.query(
        query_embeddings=embed([query_text]),
        n_results=n_results,
        where=where,
    )
    return _hydrate(res["metadatas"][0], res["ids"][0])


def get_entry(headword: str):
    """Exact corpus entry for a headword (first matching sense), or None."""
    col = get_collection()
    res = col.get(where={"headword": headword}, limit=1)
    if not res["ids"]:
        return None
    return _hydrate(res["metadatas"], res["ids"])[0]


def nearest_neighbors(headword: str, k: int = 3):
    """The k nearest *other* headwords to a given word."""
    entry = get_entry(headword)
    seed = f"{headword} {entry['definition']}" if entry else headword
    col = get_collection()
    res = col.query(query_embeddings=embed([seed]), n_results=k + 4)
    hydrated = _hydrate(res["metadatas"][0], res["ids"][0])
    neighbors = [w for w in hydrated if w["korean"] != headword]
    return neighbors[:k]


def vocab_count() -> int:
    try:
        return get_collection().count()
    except Exception:
        return 0
