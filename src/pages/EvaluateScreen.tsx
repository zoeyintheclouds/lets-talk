import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/sessionStore';
import { API_BASE } from '../lib/api';

export default function EvaluateScreen() {
  const navigate = useNavigate();
  const {
    selectedTopic, recordingBlob,
    selectedWords, grammarPatterns,
    usedWordIds, usedGrammarIds,
    toggleUsedWord, toggleUsedGrammar,
    setFeedback, roughIdea,
  } = useStore();

  const audioUrl = recordingBlob ? URL.createObjectURL(recordingBlob) : null;
  if (!audioUrl || !selectedTopic) { navigate('/record'); return null; }

  async function handleGetFeedback() {
    if (!selectedTopic) return;

    const missedWords = selectedWords.filter(w => !usedWordIds.includes(w.id));
    const usedWords   = selectedWords.filter(w =>  usedWordIds.includes(w.id));

    try {
      const usedGrammar   = grammarPatterns.filter(g =>  usedGrammarIds.includes(g.id));
      const missedGrammar = grammarPatterns.filter(g => !usedGrammarIds.includes(g.id));

      const response = await fetch(`${API_BASE}/retrieve-coaching`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          roughIdea,
          usedWords,
          missedWords,
          usedGrammar,
          missedGrammar,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to generate feedback.');
      }

      const data = await response.json();
      setFeedback(data.feedback);
      navigate('/feedback');
    } catch (error) {
      console.error('Feedback error:', error);
      alert('Could not generate feedback right now. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-10">
        <button onClick={() => navigate('/record')}
          className="text-xs font-mono text-ink-muted hover:text-ink mb-6 block">
          ← Re-record
        </button>

        <div className="mb-6">
          <h2 className="font-display text-3xl text-ink mb-1">Self-check</h2>
          <p className="text-ink-muted text-sm">Listen back and tap every word and grammar pattern you actually used.</p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left — player + counters */}
          <div className="col-span-1 space-y-5">
            <div className="bg-ink rounded-2xl p-5">
              <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Your recording</p>
              <audio controls src={audioUrl} className="w-full" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-sand-50 border border-stone rounded-xl p-4 text-center">
                <p className="font-mono text-3xl text-teal font-bold">{usedWordIds.length}
                  <span className="text-ink-muted text-lg font-normal">/{selectedWords.length}</span>
                </p>
                <p className="text-xs text-ink-muted mt-1">Words used</p>
              </div>
              {grammarPatterns.length > 0 && (
                <div className="bg-sand-50 border border-stone rounded-xl p-4 text-center">
                  <p className="font-mono text-3xl text-teal font-bold">{usedGrammarIds.length}
                    <span className="text-ink-muted text-lg font-normal">/{grammarPatterns.length}</span>
                  </p>
                  <p className="text-xs text-ink-muted mt-1">Grammar used</p>
                </div>
              )}
            </div>

            <button onClick={handleGetFeedback} className="btn-primary w-full py-4 text-base">
              Get Feedback →
            </button>
          </div>

          {/* Right — word + grammar tiles */}
          <div className="col-span-2 space-y-8">
            <section>
              <p className="text-xs font-mono uppercase tracking-widest text-ink-muted mb-3">Mark the words you used</p>
              <div className="flex flex-wrap gap-2">
                {selectedWords.map(word => {
                  const used = usedWordIds.includes(word.id);
                  return (
                    <button key={word.id} onClick={() => toggleUsedWord(word.id)}
                      className={`px-4 py-2.5 rounded-xl border transition-all duration-150 text-sm font-display
                        ${used
                          ? 'bg-teal text-white border-teal shadow-sm animate-pop'
                          : 'bg-sand-50 border-stone text-ink hover:border-teal/40'}`}>
                      {used && <span className="mr-1 text-xs">✓</span>}
                      {word.korean}
                    </button>
                  );
                })}
              </div>
            </section>

            {grammarPatterns.length > 0 && (
              <section>
                <p className="text-xs font-mono uppercase tracking-widest text-ink-muted mb-3">Mark grammar patterns used</p>
                <div className="grid grid-cols-2 gap-2">
                  {grammarPatterns.map(g => {
                    const used = usedGrammarIds.includes(g.id);
                    return (
                      <button key={g.id} onClick={() => toggleUsedGrammar(g.id)}
                        className={`text-left px-4 py-3 rounded-xl border transition-all duration-150
                          ${used
                            ? 'bg-teal text-white border-teal animate-pop'
                            : 'bg-sand-50 border-stone text-ink hover:border-teal/40'}`}>
                        <p className={`font-mono text-sm font-medium ${used ? 'text-white' : 'text-ink'}`}>
                          {used && '✓ '}{g.pattern}
                        </p>
                        <p className={`text-xs mt-0.5 ${used ? 'text-white/70' : 'text-ink-muted'}`}>{g.meaning}</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
