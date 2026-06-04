"""Parse krdict XML → chunk → embed with KURE-v1 → store in Chroma.

Usage:
    python ingest_krdict.py data/krdict/<file>.xml [more.xml ...]

Keeps only 초급 + 중급 entries. Re-running rebuilds the collection.

The parser targets the krdict download-center LMF export (``<LexicalEntry>``
with ``<feat att=... val=...>`` children) and falls back to the OpenAPI-style
nested export (``<word_info>`` / ``<sense_info>``). Field extraction is
defensive about attribute naming so either dump works.
"""
import sys

from lxml import etree

from rag_store import COLLECTION, embed, get_collection
from rag_store import _client  # noqa: internal — used to reset the collection

KEEP_GRADES = {"초급", "중급"}
BATCH = 256


def _feats(elem):
    """Direct-child <feat att val> pairs of an element."""
    out = {}
    for f in elem.findall("feat"):
        att = f.get("att")
        if att is not None:
            out[att] = f.get("val", "")
    return out


def _first(elem, tag):
    found = elem.find(tag)
    return found if found is not None else None


def _parse_lmf(root):
    """Yield chunk dicts from the LMF (feat-style) export."""
    for entry in root.iter("LexicalEntry"):
        ef = _feats(entry)
        lemma = _first(entry, "Lemma")
        headword = _feats(lemma).get("writtenForm", "") if lemma is not None else ""
        grade = ef.get("vocabularyLevel") or ef.get("grade", "")
        if not headword or grade not in KEEP_GRADES:
            continue
        # Skip affixes (entries whose headword starts with a dash)
        if headword.startswith("-") or headword.endswith("-"):
            continue
        pos = ef.get("partOfSpeech", "")

        senses = entry.findall("Sense")
        for sense in senses:
            sf = _feats(sense)
            definition = sf.get("definition", "")

            english = ""
            for eq in sense.findall("Equivalent"):
                qf = _feats(eq)
                if qf.get("language") in (None, "", "영어", "English"):
                    english = qf.get("lemma") or qf.get("definition", "")
                    if english:
                        break

            # Prefer sentence examples (type=문장) over phrase examples (type=구)
            example = ""
            for ex in sense.findall("SenseExample"):
                ef_ex = _feats(ex)
                candidate = ef_ex.get("example", "")
                if ef_ex.get("type") == "문장" and candidate:
                    example = candidate
                    break
            if not example:
                ex = sense.find("SenseExample")
                if ex is not None:
                    example = _feats(ex).get("example", "")

            yield {
                "headword": headword,
                "pos": pos,
                "grade": grade,
                "definition": definition,
                "english": english,
                "example": example,
            }
            break  # one representative sense per headword


def _text(elem, *tags):
    for tag in tags:
        node = elem.find(tag)
        if node is not None and (node.text or "").strip():
            return node.text.strip()
    return ""


def _parse_nested(root):
    """Fallback: OpenAPI-style <item>/<word_info>/<sense_info> export."""
    for item in root.iter("item"):
        wi = item.find("word_info") or item
        headword = _text(wi, "word")
        grade = _text(wi, "word_grade", "grade", "vocabulary_level")
        if not headword or grade not in KEEP_GRADES:
            continue
        pos = _text(wi, "pos")
        si = wi.find("sense_info") or item.find("sense_info") or wi
        definition = _text(si, "definition", "sense_definition")
        english = _text(si, "translation", "trans_word", "equivalent")
        example = _text(si, "example", "sense_example")
        yield {
            "headword": headword,
            "pos": pos,
            "grade": grade,
            "definition": definition,
            "english": english,
            "example": example,
        }


def parse(path):
    parser = etree.XMLParser(recover=True, encoding="utf-8")
    root = etree.parse(path, parser=parser).getroot()
    chunks = list(_parse_lmf(root))
    if not chunks:
        chunks = list(_parse_nested(root))
    return chunks


def main(paths):
    # Fresh build: drop and recreate the collection.
    client = _client()
    try:
        client.delete_collection(COLLECTION)
    except Exception:
        pass
    col = get_collection()

    all_chunks = []
    for path in paths:
        found = parse(path)
        print(f"  {path}: {len(found)} entries (초급+중급)")
        all_chunks.extend(found)

    print(f"Embedding {len(all_chunks)} entries with KURE-v1…")
    for i in range(0, len(all_chunks), BATCH):
        batch = all_chunks[i : i + BATCH]
        texts = [
            f"{c['headword']} {c['definition']} {c['example']}".strip()
            for c in batch
        ]
        col.add(
            ids=[f"{c['headword']}#{i + j}" for j, c in enumerate(batch)],
            embeddings=embed(texts),
            metadatas=batch,
        )
        print(f"  stored {min(i + BATCH, len(all_chunks))}/{len(all_chunks)}")

    print(f"Done. Collection '{COLLECTION}' now holds {col.count()} entries.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1:])
