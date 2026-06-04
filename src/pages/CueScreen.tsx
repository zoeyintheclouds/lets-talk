import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/sessionStore';
import { API_BASE } from '../lib/api';

export default function CueScreen() {
  const navigate = useNavigate();
  const {
    selectedTopic, roughIdea,
    cueQuestions, cueAnswers,
    setCueQuestions, setCueAnswers,
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [localAnswers, setLocalAnswers] = useState<string[]>(
    cueAnswers.length ? cueAnswers : []
  );

  useEffect(() => {
    if (!selectedTopic || !roughIdea) { navigate('/'); return; }
    if (cueQuestions.length > 0) {
      if (localAnswers.length === 0) setLocalAnswers(Array(cueQuestions.length).fill(''));
      return;
    }
    fetchCues();
  }, []);

  async function fetchCues() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic, roughIdea }),
      });
      if (!res.ok) throw new Error('Failed to fetch cues');
      const data = await res.json();
      setCueQuestions(data.questions);
      setLocalAnswers(Array(data.questions.length).fill(''));
    } catch (err) {
      console.error(err);
      alert('Could not load planning questions. Please go back and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerChange(idx: number, value: string) {
    setLocalAnswers(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  const answeredCount = localAnswers.filter(a => a.trim().length > 3).length;
  const canContinue = !loading && cueQuestions.length > 0 && answeredCount >= 2;

  function handleContinue() {
    setCueAnswers(localAnswers);
    navigate('/select');
  }

  if (!selectedTopic) return null;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <button onClick={() => navigate('/')}
            className="text-xs font-mono text-ink-muted hover:text-ink mb-4 block">
            ← Back to setup
          </button>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{selectedTopic.icon}</span>
            <h2 className="font-display text-3xl text-ink">Plan your talk</h2>
          </div>
          <p className="text-ink-muted text-sm mt-2">
            Answer in English — as much or as little as you like.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Questions + answers */}
          <div className="col-span-2">
            {loading && (
              <div className="flex flex-col gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-xl border border-stone bg-stone/20 p-5">
                    <div className="h-3 bg-stone rounded w-3/4 mb-4" />
                    <div className="h-20 bg-stone/50 rounded-lg" />
                  </div>
                ))}
              </div>
            )}

            {!loading && cueQuestions.length > 0 && (
              <div className="flex flex-col gap-4">
                {cueQuestions.map((question, idx) => (
                  <div key={idx}
                    className="rounded-xl border border-stone bg-sand-50 p-5 animate-slide-up"
                    style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ink flex items-center justify-center
                                       text-[10px] font-mono text-white mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-ink leading-snug">{question}</p>
                    </div>
                    <textarea
                      value={localAnswers[idx] || ''}
                      onChange={e => handleAnswerChange(idx, e.target.value)}
                      placeholder="Type your answer here…"
                      rows={3}
                      className="w-full rounded-lg border border-stone bg-white px-3 py-2.5
                                 text-sm text-ink placeholder:text-ink-muted/40 resize-none
                                 focus:outline-none focus:border-ink/40
                                 transition-colors duration-150"
                    />
                    {(localAnswers[idx] || '').trim().length > 3 && (
                      <p className="text-[10px] font-mono text-teal mt-1.5">✓ noted</p>
                    )}
                  </div>
                ))}
                <p className="text-xs text-ink-muted text-center mt-2">
                  You don't have to answer everything — skip any that don't apply.
                </p>
              </div>
            )}
          </div>

          {/* Right — context + CTA */}
          <div className="col-span-1">
            <div className="sticky top-28 space-y-5">
              <div className="bg-sand-50 border border-stone rounded-xl p-4">
                <p className="text-xs font-mono text-ink-muted mb-1">Your idea</p>
                <p className="text-sm text-ink/80 italic leading-relaxed">"{roughIdea}"</p>
              </div>

              <div className="bg-sand-50 border border-stone rounded-xl p-4">
                <p className="text-xs font-mono text-ink-muted mb-2">Progress</p>
                <p className="text-2xl font-mono text-ink font-bold">{answeredCount}
                  <span className="text-ink-muted text-base font-normal"> / {cueQuestions.length}</span>
                </p>
                <p className="text-xs text-ink-muted mt-1">questions answered</p>
              </div>

              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className="btn-primary w-full py-4 text-base"
              >
                Choose my words →
              </button>
              {!canContinue && !loading && (
                <p className="text-xs text-ink-muted text-center">
                  Answer at least 2 questions to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
