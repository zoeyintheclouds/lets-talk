import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/sessionStore';
import { useRecorder } from '../hooks/useRecorder';

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function RecordScreen() {
  const navigate = useNavigate();
  const {
    selectedTopic, roughIdea,
    speechTimeline,
    selectedWords, sectionNotes,
    setRecording,
  } = useStore();
  const { status, audioBlob, audioUrl, error, start, stop, reset } = useRecorder();
  const [elapsed, setElapsed] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    speechTimeline[0]?.id ?? null
  );

  useEffect(() => {
    if (status !== 'recording') return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (audioBlob) setRecording(audioBlob);
  }, [audioBlob]);

  if (!selectedTopic) { navigate('/'); return null; }

  // Fallback: if no timeline built (e.g. user navigated directly), show flat words
  const hasTimeline = speechTimeline.length > 0;

  return (
    <div className="min-h-screen bg-white max-w-6xl mx-auto px-8 py-8 flex flex-col">
      <button onClick={() => navigate(hasTimeline ? '/timeline' : '/select')}
        className="text-xs font-mono text-ink-muted hover:text-ink mb-6 self-start">
        ← Back
      </button>

      <div className="grid grid-cols-2 gap-10 flex-1">
        {/* Left — timeline reference */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          <div className="bg-ink rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{selectedTopic.icon}</span>
              <p className="font-mono text-xs text-white/40 uppercase tracking-widest">{selectedTopic.english}</p>
            </div>
            <p className="font-display text-base text-white leading-relaxed">
              {roughIdea || `Speak freely about ${selectedTopic.english}.`}
            </p>
          </div>

          {hasTimeline ? (
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-ink-muted mb-2">Speech plan</p>
              <div className="flex flex-col gap-2">
                {speechTimeline.map((section, idx) => {
                  const isOpen = expandedSection === section.id;
                  return (
                    <button key={section.id}
                      onClick={() => setExpandedSection(isOpen ? null : section.id)}
                      className={`text-left rounded-xl border transition-all duration-200 overflow-hidden
                        ${isOpen ? 'border-ink/20 bg-white shadow-sm' : 'border-stone bg-stone/20 hover:border-ink/20'}`}>
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono flex-shrink-0
                                         ${isOpen ? 'bg-ink text-white' : 'bg-stone text-ink-muted'}`}>
                          {idx + 1}
                        </span>
                        <span className={`text-sm font-display flex-1 ${isOpen ? 'text-ink' : 'text-ink-muted'}`}>
                          {section.label}
                        </span>
                        {!isOpen && (
                          <span className="text-[10px] text-ink-muted font-mono truncate max-w-[100px]">
                            {section.words.slice(0, 2).map(w => w.korean).join(' · ')}{section.words.length > 2 ? ' …' : ''}
                          </span>
                        )}
                        <span className="text-ink-muted text-xs ml-1">{isOpen ? '▲' : '▼'}</span>
                      </div>
                      {isOpen && (
                        <div className="px-3 pb-3 border-t border-stone/60">
                          <p className="text-xs text-ink-muted italic leading-relaxed mt-2 mb-2">"{section.cue}"</p>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {section.words.map(word => (
                              <span key={word.id} className="px-2.5 py-1 bg-stone/60 border border-stone rounded-full font-display text-xs text-ink">
                                {word.korean}
                              </span>
                            ))}
                          </div>
                          {section.grammar && (
                            <div className="bg-teal/6 border border-teal/20 rounded-lg px-2.5 py-1.5">
                              <span className="font-mono text-xs font-medium text-teal">{section.grammar.pattern}</span>
                              <span className="text-[10px] text-teal/70 ml-1.5">{section.grammar.meaning}</span>
                            </div>
                          )}
                          {sectionNotes[section.id] && (
                            <p className="text-xs italic text-ink-muted border-l-2 border-stone pl-2 mt-1">{sectionNotes[section.id]}</p>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedWords.map(w => (
                <span key={w.id} className="px-3 py-1.5 bg-white border border-stone rounded-full text-sm font-display text-ink">
                  {w.korean}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right — recorder */}
        <div className="flex flex-col items-center justify-center gap-6">
          {error && <p className="text-sm text-coral text-center">{error}</p>}

          <p className="font-mono text-7xl text-ink/15 tabular-nums">{fmt(elapsed)}</p>

          {status === 'idle' && (
            <button onClick={start}
              className="w-28 h-28 rounded-full bg-ink flex items-center justify-center text-4xl
                         hover:bg-coral transition-colors duration-200 shadow-xl active:scale-95">
              🎙️
            </button>
          )}

          {status === 'recording' && (
            <button onClick={stop}
              className="w-28 h-28 rounded-full bg-coral flex items-center justify-center text-4xl
                         shadow-xl animate-pulse hover:animate-none active:scale-95 transition-all">
              ⏹
            </button>
          )}

          {status === 'stopped' && audioUrl && (
            <div className="w-full flex flex-col gap-4 items-center animate-slide-up">
              <audio controls src={audioUrl} className="w-full rounded-xl" />
              <div className="flex gap-3">
                <button onClick={() => { reset(); setElapsed(0); }} className="btn-outline">Re-record</button>
                <button onClick={() => navigate('/evaluate')} className="btn-primary">Self-check →</button>
              </div>
            </div>
          )}

          <p className="text-sm text-ink-muted text-center max-w-xs">
            {status === 'idle'      && 'Press the mic. Speak naturally — aim for 2 minutes.'}
            {status === 'recording' && "Recording… press stop when you're done."}
            {status === 'stopped'   && 'Listen back, then mark the words you used.'}
          </p>
        </div>
      </div>
    </div>
  );
}
