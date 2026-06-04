import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/sessionStore';

export default function TimelineScreen() {
  const navigate = useNavigate();
  const { selectedTopic, speechTimeline, grammarPatterns, sectionNotes, setSectionNote } = useStore();
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);

  if (!selectedTopic || !speechTimeline.length) { navigate('/select'); return null; }

  function toggleNote(id: string) {
    setOpenNoteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-10">

        <div className="mb-6 animate-slide-up">
          <button onClick={() => navigate('/grammar')}
            className="text-xs font-mono text-ink-muted hover:text-ink mb-4 block">
            ← Edit grammar
          </button>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{selectedTopic.icon}</span>
            <h2 className="font-display text-3xl text-ink">Your speech plan</h2>
          </div>
          <p className="text-sm text-ink-muted mt-1">
            Read through, add notes if you want, then start recording. The plan stays visible while you speak.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Timeline sections — 2 cols */}
          <div className="col-span-2 space-y-3">
            {speechTimeline.map((section, idx) => (
              <div key={section.id}
                className="rounded-xl border border-stone bg-sand-50 overflow-hidden animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}>
                <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                  <div className="w-7 h-7 rounded-full bg-ink flex items-center justify-center
                                  text-[10px] font-mono text-white flex-shrink-0">
                    {idx + 1}
                  </div>
                  <p className="font-display text-lg text-ink">{section.label}</p>
                </div>

                <div className="px-5 pb-3">
                  <p className="text-sm text-ink-muted leading-relaxed italic">"{section.cue}"</p>
                </div>

                {section.words.length > 0 && (
                  <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                    {section.words.map(word => (
                      <div key={word.id} className="px-3 py-1.5 bg-stone/60 border border-stone rounded-full">
                        <span className="font-display text-sm text-ink">{word.korean}</span>
                        <span className="text-[10px] text-ink-muted ml-1.5">{word.english}</span>
                      </div>
                    ))}
                  </div>
                )}

                {section.grammar && (
                  <div className="mx-5 mb-3 bg-teal/6 border border-teal/20 rounded-lg px-3 py-2">
                    <span className="font-mono text-xs font-medium text-teal">{section.grammar.pattern}</span>
                    <span className="text-[10px] text-teal/70 ml-2">{section.grammar.meaning}</span>
                    {section.grammar.example && (
                      <p className="text-xs italic text-ink/60 mt-1">{section.grammar.example}</p>
                    )}
                  </div>
                )}

                <div className="px-5 pb-4">
                  {!openNoteIds.includes(section.id) ? (
                    <button onClick={() => toggleNote(section.id)}
                      className="text-xs font-mono text-ink-muted hover:text-ink transition-colors">
                      + Add note
                    </button>
                  ) : (
                    <div className="animate-slide-up">
                      <textarea
                        value={sectionNotes[section.id] || ''}
                        onChange={e => setSectionNote(section.id, e.target.value)}
                        placeholder="Jot a quick note — a word, phrase, or idea…"
                        rows={2}
                        className="w-full rounded-lg border border-stone bg-white px-3 py-2
                                   text-xs text-ink placeholder:text-ink-muted/40 resize-none
                                   focus:outline-none focus:border-ink/30 transition-colors"
                      />
                      <button onClick={() => toggleNote(section.id)}
                        className="text-[10px] font-mono text-ink-muted hover:text-ink mt-1 transition-colors">
                        ↑ Collapse
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right sidebar — grammar reference + CTA */}
          <div className="col-span-1">
            <div className="sticky top-28 space-y-5">
              {grammarPatterns.length > 0 && (
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-ink-muted mb-3">Grammar to try</p>
                  <div className="flex flex-col gap-2">
                    {grammarPatterns.map(g => (
                      <div key={g.id} className="bg-teal/6 border border-teal/20 rounded-xl px-4 py-3">
                        <p className="font-mono text-sm font-medium text-teal">{g.pattern}</p>
                        <p className="text-xs text-teal/70">{g.meaning}</p>
                        {g.example && <p className="text-xs italic text-ink/60 mt-1">{g.example}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-sand-50 border border-stone rounded-xl p-4">
                <p className="text-xs text-ink-muted leading-relaxed">
                  The plan stays visible during recording. Cues are reminders, not a script — speak naturally.
                </p>
              </div>

              <button onClick={() => navigate('/record')} className="btn-primary w-full py-4 text-base">
                Start Recording →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
