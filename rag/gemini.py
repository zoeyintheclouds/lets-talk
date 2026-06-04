"""Gemini client wrapper — ports the JSON handling from server/index.js."""
import json
import os

from dotenv import load_dotenv
from google import genai

# Reuse the existing key source (server/.env) — no duplication.
load_dotenv("server/.env")
load_dotenv()  # fall back to rag/.env or process env if present

MODEL = "gemini-2.5-flash"

_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def extract_json(text: str):
    """Strip markdown code fences and parse JSON (port of extractJson)."""
    cleaned = text.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)


def generate_json(prompt: str, model: str = MODEL, retries: int = 2):
    """Single Gemini call returning parsed JSON. Retries on parse failure."""
    last_err = None
    for attempt in range(retries + 1):
        response = _client.models.generate_content(model=model, contents=prompt)
        try:
            return extract_json(response.text)
        except Exception as e:
            last_err = e
            if attempt < retries:
                continue
    raise ValueError(f"Gemini returned non-JSON after {retries + 1} attempts: {last_err}")


def generate_text(prompt: str, model: str = MODEL) -> str:
    response = _client.models.generate_content(model=model, contents=prompt)
    return response.text
