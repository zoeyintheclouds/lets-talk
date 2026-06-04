# 말해봐

A Korean speaking practice app for intermediate learners who know more words than they can actually use.

---

## The Problem

Intermediate Korean learners hit a wall. They can read, recognize vocabulary on flashcards, and follow a slow podcast — but when they open their mouth, they revert to the same 50 words they've used since TOPIK Level 1. The rest of their vocabulary sits in passive memory and never migrates to active speech.

No existing app targets it directly. Duolingo is gamified repetition. Anki trains recognition. AI conversation apps let learners avoid unfamiliar words entirely by steering toward what they already control.

**말해봐** closes the gap through **forced retrieval practice**: you choose target words before you speak, then self-evaluate which ones you actually used.

---

## How It Works

```
① Setup       Choose a topic and write a rough speaking idea
② Plan        Answer 4–5 AI-generated planning questions in English
③ Words       Select 5–20 vocabulary words retrieved from krdict
③½ Grammar    Pick grammar patterns to target (5 foundational + 10 intermediate)
④ Timeline    Review your AI-generated speech plan: sections, cues, words, grammar
⑤ Record      Speak naturally using the timeline as a reference
⑥ Self-check  Listen back, mark which words and grammar you actually used
⑦ Feedback    Receive a coaching report grounded in real krdict data
```

### Step-by-step

**① Setup** — Pick a topic (Food, Travel, Relationships, etc.), write a rough speaking idea in any language, and set vocabulary difficulty.

**② Plan** — Gemini generates 4–5 specific English planning questions based on what the user wrote. Answers form the foundation for everything that follows.

**③ Words** — The user's topic and cue answers are embedded with KURE-v1 and used to retrieve the 80 most semantically similar words from the krdict 초급+중급 corpus. Gemini ranks these to 30 (no generation — zero hallucination). The user picks 5–20 words to actively target.

**③½ Grammar** — Gemini suggests 15 grammar patterns (5 foundational TOPIK 1–2 + 10 intermediate TOPIK 3–4), grounded in the user's selected words. The user picks any they want to try.

**④ Timeline** — Gemini builds a 4–5 section speech plan distributing the user's own words and selected grammar patterns across sections. Each section has a cue, target vocabulary, and grammar where natural.

**⑤ Record** — The timeline stays visible as a collapsible reference. The user presses record and speaks.

**⑥ Self-check** — The user listens back and marks which words and grammar patterns they actually used.

**⑦ Feedback** — For each missed word, the app retrieves its exact krdict entry plus 3 nearest semantic neighbors. Gemini writes a cognitive retrieval explanation and a krdict-anchored example sentence. No hallucination in the coaching cards.

---

## RAG Architecture

Word selection and coaching are grounded in the **krdict (한국어기초사전)** — the National Institute of Korean Language's open learner dictionary.

### Ingestion (one-time)
The 11 krdict XML files are parsed to extract 초급+중급 entries (~11,500 words). Each entry is embedded using **KURE-v1** (`nlpai-lab/KURE-v1`), a Korean-specialized sentence-transformer, producing a 768-dim vector from `headword + definition + example`. All vectors are stored in a local **Chroma** collection.

### At session time
The user's topic + cue answers are embedded with KURE-v1 and used to retrieve the 80–120 most semantically similar krdict words. Gemini ranks these down to 40 for display — it cannot invent words, change definitions, or write examples. Every word card shows a real krdict definition and example sentence.

### Why KURE-v1
A generic multilingual model groups Korean words by surface patterns and romanization. KURE-v1 was trained on Korean semantic similarity tasks, so semantically close words (그립다, 보고싶다, 그리워하다) cluster together correctly.

### Difficulty slider → grade filter
| Slider | Label | Query |
|---|---|---|
| 1–2 | Easier | 초급 only |
| 3 | Balanced | Both grades interleaved |
| 4–5 | Harder | 중급 only |

---

## Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| React 19 + Vite | Component architecture, fast dev build |
| TypeScript | Type safety across all components and store |
| Tailwind CSS | Utility-first styling |
| React Router | Client-side routing |
| Zustand | Session state |

### Backend — FastAPI (Python)
| Tool | Purpose |
|---|---|
| FastAPI + uvicorn | REST API, replaces the original Node/Express server |
| KURE-v1 (`sentence-transformers`) | Korean-specialized embedding model |
| ChromaDB | Local vector store for 11,455 krdict entries |
| Google Gemini 2.5 Flash | Ranking, grammar suggestion, timeline, coaching reasoning |
| lxml | krdict XML parsing |

### Data
**krdict 초급+중급** — 11 XML files, ~11,500 entries after filtering. Each stored in Chroma with: headword, part-of-speech, grade, Korean definition, English gloss, example sentence.

---

## API Endpoints

| Method | Path | Engine | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | Health check + vocab count |
| POST | `/api/cues` | Gemini | Generate planning questions |
| POST | `/retrieve-vocab` | Chroma + Gemini-rank | Retrieve and rank krdict words |
| POST | `/suggest-grammar` | Gemini | Suggest 15 grammar patterns |
| POST | `/api/timeline` | Gemini | Build speech plan sections |
| POST | `/retrieve-coaching` | Chroma + Gemini-reason | Grounded coaching per missed word |

---

## Project Structure

```
malhaebwa/
├── rag/                          # FastAPI backend
│   ├── app.py                    # All 6 API endpoints
│   ├── rag_store.py              # KURE-v1 + Chroma helpers
│   ├── gemini.py                 # Gemini client wrapper
│   ├── ingest_krdict.py          # XML → embed → Chroma ingestion script
│   ├── requirements.txt
│   ├── data/
│   │   ├── sample_krdict.xml     # 10-entry fixture for dev/testing
│   │   └── *_*.xml               # Full krdict dump (gitignored)
│   └── chroma/                   # Persistent vector store (gitignored)
├── src/
│   ├── pages/
│   │   ├── SetupScreen.tsx       # Topic + rough idea + difficulty
│   │   ├── CueScreen.tsx         # Planning questions + answers
│   │   ├── SelectScreen.tsx      # Word selection (40 cards, pick 5–20)
│   │   ├── GrammarScreen.tsx     # Grammar selection (15 patterns, unlimited pick)
│   │   ├── TimelineScreen.tsx    # Speech plan review + notes
│   │   ├── RecordScreen.tsx      # Recording with timeline reference
│   │   ├── EvaluateScreen.tsx    # Playback + self-marking
│   │   └── FeedbackScreen.tsx    # Coaching report
│   ├── components/
│   │   └── AppHeader.tsx         # Persistent nav + step progress
│   ├── store/
│   │   └── sessionStore.ts       # Zustand store (full session state)
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── data/
│   │   └── topics.ts             # Topic definitions
│   └── lib/
│       └── api.ts                # API base URL config
└── server/
    └── .env                      # GEMINI_API_KEY (loaded by FastAPI)
```

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.12 (3.14 does not have torch wheels)
- krdict 초급+중급 XML files in `rag/data/`

### 1. Frontend
```bash
npm install
```

### 2. Python environment
```bash
python3.12 -m venv rag/.venv
rag/.venv/bin/pip install -r rag/requirements.txt
```

### 3. Gemini API key
Add to `server/.env`:
```
GEMINI_API_KEY=your_key_here
```

### 4. Ingest krdict corpus
```bash
cd rag
.venv/bin/python ingest_krdict.py data/<file1>.xml data/<file2>.xml ...
```
This runs once (~2–3 minutes for 11,500 entries). KURE-v1 downloads automatically on first run (~500MB).

### 5. Run
```bash
npm run dev:all
```
Opens Vite on `:5173` and FastAPI on `:8000` concurrently.

Or separately:
```bash
npm run dev    # Vite frontend
npm run rag    # FastAPI backend
```
