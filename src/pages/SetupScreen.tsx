import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/sessionStore';
import { API_BASE } from '../lib/api';
import { TOPICS } from '../data/topics';
import type { Topic } from '../types';

const PLACEHOLDERS: Record<string, string> = {
  'daily-life':    'e.g. I want to talk about my morning routine. I usually wake up late and rush to work.',
  'food':          'e.g. I want to talk about a restaurant I love near my house. The food is cheap but really good.',
  'travel':        'e.g. I want to talk about a trip I took to Busan. It was my first time there.',
  'relationships': "e.g. I want to talk about my best friend. We met in university and still keep in touch.",
  'work-study':    "e.g. I want to talk about my job. It's stressful but I'm learning a lot.",
  'living-korea':  'e.g. I want to talk about moving to Seoul. At first I felt lonely, but I\'m slowly getting used to it.',
  'health':        'e.g. I want to talk about trying to exercise more. I started running but it\'s hard to stay consistent.',
  'future':        'e.g. I want to talk about my goal to work in Korea. I\'m not sure which city yet.',
  'technology':    'e.g. I want to talk about how I use Instagram. I spend too much time on it.',
};

const SLIDER_LABELS: Record<number, string> = {
  1: 'Mostly beginner words',
  2: 'Mostly beginner, some intermediate',
  3: 'Balanced mix',
  4: 'Mostly intermediate',
  5: 'Mostly intermediate, more challenging',
};

export default function SetupScreen() {
  const navigate = useNavigate();
  const {
    selectedTopic, roughIdea, difficultySlider,
    setTopic, setRoughIdea, setDifficulty,
    setCueQuestions, reset,
  } = useStore();
  const [loading, setLoading] = useState(false);

  const canGenerate = !!selectedTopic && roughIdea.trim().length > 8;

  function handleTopicClick(topic: Topic) {
    reset();
    setTopic(topic);
  }

  async function handleGenerate() {
    if (!canGenerate || !selectedTopic) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic, roughIdea }),
      });
      if (!res.ok) throw new Error('Failed to generate planning questions.');
      const data = await res.json();
      setCueQuestions(data.questions);
      navigate('/cues');
    } catch (error) {
      console.error('Generate error:', error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Could not generate your practice set.\n\n${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* Hero */}
        <div className="mb-10 animate-slide-up">
          <p className="text-xs font-mono uppercase tracking-widest text-ink-muted mb-2">
            Korean speaking practice
          </p>
          <h2 className="font-display text-4xl text-ink mb-2">What do you want to talk about?</h2>
          <p className="text-ink-muted">Choose a topic, describe your idea, then we'll build your session.</p>
        </div>

        <div className="grid grid-cols-5 gap-10">
          {/* Left — topic + difficulty */}
          <div className="col-span-3 space-y-8 animate-slide-up" style={{ animationDelay: '60ms', animationFillMode: 'both' }}>
            <section>
              <p className="text-xs font-mono uppercase tracking-widest text-ink-muted mb-3">
                01 — Choose a topic
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TOPICS.map((t) => {
                  const active = selectedTopic?.id === t.id;
                  return (
                    <button key={t.id} onClick={() => handleTopicClick(t)}
                      className={`text-left p-4 rounded-xl border transition-all duration-150
                        ${active
                          ? 'border-coral bg-coral/6 shadow-sm'
                          : 'border-stone bg-sand-50 hover:border-ink-muted/40 hover:bg-stone/20'}`}>
                      <span className="text-2xl block mb-2">{t.icon}</span>
                      <p className="font-body text-sm font-semibold text-ink leading-tight">{t.korean}</p>
                      <p className="text-ink-muted text-xs leading-tight mt-0.5">{t.english}</p>
                    </button>
                  );
                })}
              </div>
              {selectedTopic && (
                <div className="mt-2 flex flex-wrap gap-1.5 animate-fade-in">
                  {selectedTopic.chips.map(c => (
                    <span key={c} className="chip border-stone text-ink-muted">{c}</span>
                  ))}
                </div>
              )}
            </section>

            <section>
              <p className="text-xs font-mono uppercase tracking-widest text-ink-muted mb-1">
                03 — Vocabulary difficulty
              </p>
              <p className="text-xs text-ink-muted mb-4">How challenging should the words be?</p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink-muted whitespace-nowrap">Easier</span>
                <input type="range" min={1} max={5} value={difficultySlider}
                  onChange={e => setDifficulty(Number(e.target.value))}
                  className="flex-1 accent-coral cursor-pointer" />
                <span className="text-xs text-ink-muted whitespace-nowrap">Harder</span>
              </div>
              <p className="text-xs text-teal font-mono mt-2">{SLIDER_LABELS[difficultySlider]}</p>
            </section>
          </div>

          {/* Right — idea + CTA */}
          <div className="col-span-2 animate-slide-up" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
            <section className="mb-6">
              <p className="text-xs font-mono uppercase tracking-widest text-ink-muted mb-1">
                02 — What do you want to say?
              </p>
              <p className="text-xs text-ink-muted mb-3">
                A rough idea — not a script. English, Korean, or mixed is fine.
              </p>
              <textarea
                value={roughIdea}
                onChange={e => setRoughIdea(e.target.value)}
                placeholder={selectedTopic ? PLACEHOLDERS[selectedTopic.id] : 'Select a topic first…'}
                rows={8}
                disabled={!selectedTopic}
                className="w-full rounded-xl border border-stone bg-sand-50 p-4 text-sm text-ink
                           placeholder:text-ink-muted/40 resize-none
                           focus:outline-none focus:border-ink/40 focus:bg-white
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors duration-150"
              />
            </section>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="btn-primary w-full text-base py-4"
            >
              {loading ? 'Loading…' : "Let's go →"}
            </button>

            {selectedTopic && roughIdea.trim().length <= 8 && (
              <p className="text-xs text-ink-muted text-center mt-3">
                Write a bit more about your idea to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
