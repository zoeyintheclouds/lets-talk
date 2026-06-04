// Base URL for the FastAPI RAG backend (replaces the old Node server on :3001).
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8000';
