"""말해봐 RAG backend — single FastAPI service (replaces server/index.js).

Endpoints:
    GET  /api/health
    POST /api/cues            Gemini — planning questions (ported verbatim)
    POST /retrieve-vocab      Chroma top-80 중급 → Gemini ranks to 30 (no generation)
    POST /suggest-grammar     Gemini — 5–6 grammar patterns (step ③.5)
    POST /api/timeline        Gemini — speech plan, grammar passed in
    POST /retrieve-coaching   Chroma exact + neighbors → Gemini reasoning only
"""
import json
import traceback

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import gemini
import rag_store

from fastapi.requests import Request
from fastapi.responses import JSONResponse

app = FastAPI(title="말해봐 RAG")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": f"{type(exc).__name__}: {exc}"},
    )

DIFFICULTY_LABEL = {
    1: "beginner (TOPIK 1-2)",
    2: "lower-intermediate (TOPIK 2-3)",
    3: "intermediate (TOPIK 3)",
    4: "upper-intermediate (TOPIK 3-4)",
    5: "advanced-intermediate (TOPIK 4)",
}


# ─── Models ──────────────────────────────────────────────────────────────────
class CuesIn(BaseModel):
    topic: dict | str
    roughIdea: str


class VocabIn(BaseModel):
    topic: dict | str
    roughIdea: str = ""
    cueAnswers: list[str] = []
    difficultySliderValue: int = 3


class GrammarIn(BaseModel):
    topic: dict | str
    targetWords: list[dict] = []
    cueAnswers: list[str] = []


class TimelineIn(BaseModel):
    topic: dict | str
    roughIdea: str
    selectedWords: list[dict]
    selectedGrammar: list[dict] = []
    cueQuestions: list[str] = []
    cueAnswers: list[str] = []
    difficultySliderValue: int = 3


class CoachingIn(BaseModel):
    topic: dict | str
    roughIdea: str = ""
    usedWords: list[dict] = []
    missedWords: list[dict] = []
    usedGrammar: list[dict] = []
    missedGrammar: list[dict] = []


def _topic_str(topic) -> str:
    if isinstance(topic, dict):
        return topic.get("english") or topic.get("korean") or json.dumps(topic, ensure_ascii=False)
    return str(topic)


# ─── Health ──────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"ok": True, "vocabCount": rag_store.vocab_count()}


# ─── /api/cues (ported verbatim from server/index.js) ────────────────────────
@app.post("/api/cues")
def cues(body: CuesIn):
    prompt = f"""You are a Korean speaking coach helping a beginner-to-intermediate learner plan a short spoken practice session.

The user has chosen a topic and written a rough speaking idea. Your job is to generate 4 to 5 short, specific questions in English that help them think more deeply about what they want to say — so that when they speak, they have more to talk about and don't run out of content.

Use the 5W1H framework (Who, What, When, Where, Why, How) as your internal tool for generating questions, but do NOT label questions with "Who:", "What:", etc. The questions should feel natural and conversational, not like a form.

Rules:
- Questions must be specific to the user's rough idea, not generic.
- Each question should unlock a different dimension: a specific detail, a feeling or reaction, a reason or cause, a comparison or contrast, or what changed / what comes next.
- Questions should be answerable in 1-3 English sentences.
- Do not ask about Korean language itself.
- Do not ask about vocabulary or grammar.
- Keep questions short — one sentence each.
- Return 4 to 5 questions, no more.
- Return valid JSON only — no markdown, no code fences.

Topic: {json.dumps(_topic_str(body.topic), ensure_ascii=False)}
User's rough idea: {body.roughIdea}

Return format:
{{
  "questions": ["Question one here?", "Question two here?"]
}}"""
    parsed = gemini.generate_json(prompt)
    return {"questions": parsed["questions"]}


# ─── /retrieve-vocab (Chroma retrieval + Gemini ranking) ─────────────────────
@app.post("/retrieve-vocab")
def retrieve_vocab(body: VocabIn):
    topic = _topic_str(body.topic)
    answers = " ".join(a.strip() for a in body.cueAnswers if a and a.strip())
    query = f"{topic} — {answers}".strip(" —") or topic

    # Map slider to grade filter:
    #   1-2 → 초급 only (simpler words)
    #   3   → both grades mixed
    #   4-5 → 중급 only (more advanced)
    slider = int(body.difficultySliderValue)
    if slider <= 2:
        grade_filter = "초급"
    elif slider >= 4:
        grade_filter = "중급"
    else:
        grade_filter = None  # both grades

    if grade_filter:
        candidates = rag_store.query_vocab(query, n_results=120, grade=grade_filter)
    else:
        # Fetch from both grades and merge, preserving relevance order
        cands_cho = rag_store.query_vocab(query, n_results=60, grade="초급")
        cands_jung = rag_store.query_vocab(query, n_results=60, grade="중급")
        seen_merge: set[str] = set()
        candidates = []
        for a, b in zip(cands_cho, cands_jung):
            for c in (a, b):
                if c["korean"] not in seen_merge:
                    candidates.append(c)
                    seen_merge.add(c["korean"])

    by_word = {c["korean"]: c for c in candidates}

    listing = "\n".join(
        f"- {c['korean']} ({c['grade']} {c['pos']}): {c['definition']}" for c in candidates
    )
    prompt = f"""Here are real Korean vocabulary entries from the krdict dictionary.

The user wants to talk about: {topic}
Their specific idea: {answers or "(no extra detail)"}

Select the 40 most useful words for this specific topic and idea.
Return ONLY headwords, in order of relevance. Do not invent words — choose only
from the list. Do not write definitions or examples.

Entries:
{listing}

Return valid JSON only — no markdown, no code fences:
{{ "headwords": ["단어1", "단어2", "..."] }}"""

    parsed = gemini.generate_json(prompt)
    selected = []
    seen = set()
    for hw in parsed.get("headwords", []):
        entry = by_word.get(hw)
        if entry and hw not in seen:
            selected.append(entry)
            seen.add(hw)
        if len(selected) >= 40:
            break

    # Safety net: top up from retrieval order if Gemini under-returns.
    if len(selected) < 40:
        for c in candidates:
            if c["korean"] not in seen:
                selected.append(c)
                seen.add(c["korean"])
            if len(selected) >= 40:
                break

    return {"words": selected}


# ─── /suggest-grammar (Gemini-free, step ③.5) ────────────────────────────────
@app.post("/suggest-grammar")
def suggest_grammar(body: GrammarIn):
    topic = _topic_str(body.topic)
    words = ", ".join(
        f"{w.get('korean', '')} ({w.get('english', '')})" for w in body.targetWords
    )
    answers = " ".join(a.strip() for a in body.cueAnswers if a and a.strip())

    prompt = f"""The user is a Korean learner (roughly TOPIK 3–4 level). They want to speak about: {topic}.
Context from their planning answers: {answers or "(none)"}
They have selected these target words: {words}

Suggest exactly 15 Korean grammar patterns useful for speaking about this topic — split as follows:

SECTION A — 5 foundational patterns (TOPIK 1–2 level). These should be well-known connective
or causal forms that even beginners use, but that appear naturally in real speech about this topic.
Examples of the kind of patterns to draw from: -아/어서, -(으)니까, -지만, -(으)면, -고 싶다,
-는 것 같다, -(으)ㄹ 거예요, -고 있다, -아/어도, -기 전에. Choose whichever 5 fit this topic best.

SECTION B — 10 intermediate patterns (TOPIK 3–4 level / 중급). These should be more nuanced
patterns a learner at this level is working to acquire. Draw from forms like:
-았/었던 (retrospective past), -(으)ㄹ 텐데 (supposition/expectation), -는 바람에 (unexpected cause),
-다 보면 (if you keep doing), -(으)ㄹ수록 (the more…the more), -고 보니 (after doing, realize),
-(으)ㄴ/는 데다가 (in addition to), -아/어 버리다 (do completely), -자마자 (as soon as),
-기는 하다 (concession), -(으)ㄹ까 봐 (worried that), -는 한 (as long as),
-아/어 오다 (has been doing up to now), -던데 (reminiscing contrast),
-(으)ㄹ 뻔했다 (almost did), -고서야 (only after doing). Choose whichever 10 fit this topic.

Rules for all 15:
- Each pattern must combine naturally with the user's target words or topic.
- For each pattern give: the pattern name, a one-line English explanation, one short Korean
  example sentence using one of the target words (under 15 words).
- Label each with its level: "beginner" for section A, "intermediate" for section B.

Return valid JSON only — no markdown, no code fences:
{{
  "grammar": [
    {{ "id": "g1", "pattern": "-(으)니까", "meaning": "because / since", "example": "...", "level": "beginner" }},
    {{ "id": "g2", "pattern": "-았/었던", "meaning": "used to / remembered past state", "example": "...", "level": "intermediate" }}
  ]
}}"""
    parsed = gemini.generate_json(prompt)
    grammar = parsed.get("grammar", [])
    for i, g in enumerate(grammar):
        g.setdefault("id", f"g{i + 1}")
    return {"grammar": grammar}


# ─── /api/timeline (ported; grammar now passed in, not invented) ─────────────
@app.post("/api/timeline")
def timeline(body: TimelineIn):
    difficulty = DIFFICULTY_LABEL.get(int(body.difficultySliderValue), "intermediate (TOPIK 3)")
    cue_context = "\n\n".join(
        f"Q: {q}\nA: {body.cueAnswers[i] if i < len(body.cueAnswers) else '(no answer)'}"
        for i, q in enumerate(body.cueQuestions)
    )
    words_json = json.dumps(
        [
            {"id": w.get("id"), "korean": w.get("korean"), "english": w.get("english")}
            for w in body.selectedWords
        ],
        ensure_ascii=False,
    )
    grammar_json = json.dumps(body.selectedGrammar, ensure_ascii=False)

    prompt = f"""You are a Korean speaking coach building a personalised speech plan for a beginner-to-intermediate Korean learner.

The learner is about to do a 2-minute spoken practice session. They have selected
vocabulary words AND grammar patterns they want to use. They answered planning
questions in English. Your job is to build 4 to 5 speech timeline sections:

- Each section has a label (e.g. "Open", "The story", "How you felt", "The reason", "Wrap up").
- Each section has a short speaking cue — rephrase one of their cue answers as a
  1-sentence English prompt, a gentle nudge, not a command.
- Distribute ALL selected words across sections — every word appears in exactly one section (2–3 per section).
- Attach the provided grammar patterns to the sections where they fit most naturally.
  Use ONLY the grammar patterns given below — do not invent new ones. Not every
  section needs grammar. For a section with grammar, write one short Korean example
  sentence using that pattern, relevant to the section.

Topic: {json.dumps(_topic_str(body.topic), ensure_ascii=False)}
Rough idea: {body.roughIdea}
Difficulty level: {difficulty}

Cue Q&A:
{cue_context}

Selected vocabulary (use ALL, distribute across sections):
{words_json}

Selected grammar patterns (attach these where natural — do not invent others):
{grammar_json}

Return valid JSON only — no markdown, no code fences:
{{
  "grammar": [
    {{ "id": "g1", "pattern": "-(으)니까", "meaning": "because / since", "example": "피곤하니까 일찍 잤어요." }}
  ],
  "timeline": [
    {{
      "id": "s1",
      "label": "Open",
      "cue": "Set the scene — where and when does your story take place?",
      "words": [{{ "id": "w0001", "korean": "사람", "english": "person" }}],
      "grammar": null
    }}
  ]
}}"""
    parsed = gemini.generate_json(prompt)
    # Echo the user's selected grammar as the canonical list (the source of truth
    # for self-check), keeping any example refinements the model produced inline.
    if not parsed.get("grammar"):
        parsed["grammar"] = body.selectedGrammar
    return parsed


# ─── /retrieve-coaching (Chroma-grounded; Gemini reasoning only) ─────────────
@app.post("/retrieve-coaching")
def retrieve_coaching(body: CoachingIn):
    topic = _topic_str(body.topic)

    grounded = []
    for w in body.missedWords:
        headword = w.get("korean", "")
        entry = rag_store.get_entry(headword)
        neighbors = rag_store.nearest_neighbors(headword, k=3)
        grounded.append(
            {
                "id": w.get("id"),
                "korean": headword,
                "english": (entry or w).get("english", ""),
                "definition": (entry or {}).get("definition", ""),
                "example": (entry or {}).get("example", ""),
                "neighbors": [n["korean"] for n in neighbors],
            }
        )

    grounded_json = json.dumps(grounded, ensure_ascii=False)
    used_json = json.dumps(
        [w.get("korean") for w in body.usedWords], ensure_ascii=False
    )
    missed_grammar_json = json.dumps(body.missedGrammar, ensure_ascii=False)

    prompt = f"""You are a friendly Korean speaking coach for "말해봐".

The user just finished a speaking practice session and self-marked which target
words and grammar they actually used. You do NOT have the audio or transcript.

Core philosophy: the goal is active retrieval, not perfect Korean. Missed words
are the next session's targets — not failures. Tone: warm, encouraging, concise.

LANGUAGE: Write ALL prose — encouragement, usedSummary, every "reason", and grammar
explanations — in ENGLISH. Korean appears ONLY inside the "example" sentences,
"nextSentence", and the krdict "definition" (which you copy verbatim). Do not write
the reasons or encouragement in Korean.

For each MISSED word you are given its REAL krdict definition, a REAL krdict
example sentence, and its 3 nearest semantic neighbors. Your job per missed word:
1. "reason": one or two sentences on WHY this word is hard to retrieve mid-speech.
   Use the neighbors where helpful (e.g. "often confused with X / Y").
2. "example": a short natural sentence the user can try next time. Use the krdict
   example as a TEMPLATE — lightly adapt it to their topic; do NOT invent something
   unrelated or more complex.
Keep the krdict "definition" exactly as provided.

Topic: {json.dumps(topic, ensure_ascii=False)}
Rough idea: {body.roughIdea}
Words the user successfully used: {used_json}

Missed words (grounded data):
{grounded_json}

Missed grammar: {missed_grammar_json}

Rules:
- English only (Korean in example sentences only). No pronunciation feedback, no scores.
- For each missed grammar: explain how it could have helped, then one short Korean example.
- Return valid JSON only — no markdown, no code fences:
{{
  "encouragement": "1-2 warm sentences",
  "usedSummary": "Short sentence on what went well",
  "missedWords": [
    {{ "id": "w1", "korean": "...", "english": "...", "definition": "...", "reason": "...", "example": "..." }}
  ],
  "missedGrammar": [
    {{ "id": "g1", "pattern": "...", "meaning": "...", "reason": "...", "example": "..." }}
  ],
  "nextSentence": "One natural Korean sentence the user can try next time"
}}"""
    feedback = gemini.generate_json(prompt)

    # Guarantee the krdict definition/example survive even if the model drops them.
    by_id = {g["id"]: g for g in grounded}
    for mw in feedback.get("missedWords", []):
        src = by_id.get(mw.get("id"))
        if src:
            mw.setdefault("definition", src["definition"])
            if not mw.get("example"):
                mw["example"] = src["example"]
    return {"feedback": feedback}
