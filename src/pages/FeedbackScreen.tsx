import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/sessionStore';

export default function FeedbackScreen() {
  const navigate = useNavigate();
  const { selectedTopic, selectedWords, grammarPatterns, usedWordIds, usedGrammarIds, feedback, reset } = useStore();

  if (!feedback || !selectedTopic) { navigate('/'); return null; }

  const usedWords   = selectedWords.filter(w =>  usedWordIds.includes(w.id));
  const usedGrammar = grammarPatterns.filter(g => usedGrammarIds.includes(g.id));

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-10">

        <div className="mb-8 animate-slide-up">
          <p className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-2">Session complete</p>
          <h2 className="font-display text-4xl text-ink">Feedback</h2>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left column — summary */}
          <div className="col-span-1 space-y-5">
            {/* Score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-teal/10 border border-teal/20 rounded-xl p-4 text-center">
                <p className="font-mono text-3xl text-teal font-bold">{usedWordIds.length}</p>
                <p className="text-xs text-teal/70 mt-1">Words used</p>
              </div>
              <div className="bg-coral/10 border border-coral/20 rounded-xl p-4 text-center">
                <p className="font-mono text-3xl text-coral font-bold">{feedback.missedWords.length}</p>
                <p className="text-xs text-coral/70 mt-1">To practice</p>
              </div>
            </div>

            {/* Coach */}
            <div className="bg-ink rounded-2xl p-5">
              <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Coach says</p>
              <p className="text-white leading-relaxed text-sm">{feedback.encouragement}</p>
              {feedback.usedSummary && (
                <p className="text-white/50 text-xs mt-3 leading-relaxed">{feedback.usedSummary}</p>
              )}
            </div>

            {/* Used words */}
            {usedWords.length > 0 && (
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-teal mb-2">✓ Successfully used</p>
                <div className="flex flex-wrap gap-1.5">
                  {usedWords.map(w => (
                    <div key={w.id} className="px-3 py-1.5 rounded-xl bg-teal/10 border border-teal/20">
                      <p className="font-display text-sm text-teal">{w.korean}</p>
                      <p className="text-[10px] text-teal/60">{w.english}</p>
                    </div>
                  ))}
                </div>
                {usedGrammar.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {usedGrammar.map(g => (
                      <span key={g.id} className="px-3 py-1.5 rounded-lg border border-teal/30 text-teal text-xs font-mono bg-teal/5">
                        {g.pattern}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Next sentence */}
            <div className="bg-stone/30 border border-stone rounded-xl p-4">
              <p className="text-xs font-mono text-ink-muted uppercase tracking-widest mb-2">For next time</p>
              <p className="text-sm text-ink leading-relaxed">{feedback.nextSentence}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate('/record')} className="btn-outline flex-1">Try Again</button>
              <button onClick={() => { reset(); navigate('/'); }} className="btn-primary flex-1">New Practice</button>
            </div>
          </div>

          {/* Right column — missed items */}
          <div className="col-span-2 space-y-8">
            {feedback.missedWords.length > 0 && (
              <section>
                <p className="text-xs font-mono uppercase tracking-widest text-coral mb-3">Practice next time</p>
                <div className="grid grid-cols-2 gap-3">
                  {feedback.missedWords.map(item => (
                    <div key={item.id} className="bg-sand-50 border border-stone rounded-xl p-4">
                      <div className="flex items-baseline gap-2 mb-2">
                        <p className="font-display text-xl text-ink">{item.korean}</p>
                        <p className="text-xs text-ink-muted">{item.english}</p>
                      </div>
                      {item.definition && (
                        <p className="text-xs italic text-ink/60 leading-relaxed mb-2">{item.definition}</p>
                      )}
                      <p className="text-xs text-ink-muted leading-relaxed mb-2">{item.reason}</p>
                      <div className="bg-stone/20 rounded-lg p-3">
                        <p className="text-xs font-mono text-ink-muted mb-1">Try using it like:</p>
                        <p className="text-sm italic text-ink/80">{item.example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {feedback.missedGrammar.length > 0 && (
              <section>
                <p className="text-xs font-mono uppercase tracking-widest text-ink-muted mb-3">Grammar to revisit</p>
                <div className="grid grid-cols-2 gap-3">
                  {feedback.missedGrammar.map(item => (
                    <div key={item.id} className="bg-sand-50 border border-stone rounded-xl p-4">
                      <p className="font-mono text-sm text-ink font-medium mb-1">{item.pattern}</p>
                      <p className="text-xs text-ink-muted mb-2">{item.meaning}</p>
                      <p className="text-xs text-ink-muted leading-relaxed mb-2">{item.reason}</p>
                      <p className="text-xs italic text-ink/60 bg-stone/20 rounded-lg px-3 py-2">{item.example}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
