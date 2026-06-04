import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/sessionStore';
import { API_BASE } from '../lib/api';
import type { Word } from '../types';

const GRADE_LABEL: Record<string, string> = {
  '초급': 'Beginner',
  '중급': 'Intermediate',
};
const GRADE_COLOR: Record<string, string> = {
  '초급': 'border-teal/30 text-teal',
  '중급': 'border-coral/30 text-coral',
};

export default function SelectScreen() {
  const navigate = useNavigate();
  const {
    selectedTopic, roughIdea, difficultySlider,
    recommendedWords, selectedWords,
    cueAnswers,
    toggleWord, setRecommendedWords, setSuggestedGrammar,
  } = useStore();

  const [flippedWordIds, setFlippedWordIds] = useState<string[]>([]);
  const [suggestingGrammar, setSuggestingGrammar] = useState(false);
  const [loadingWords, setLoadingWords] = useState(false);
  const [wordsLoaded, setWordsLoaded] = useState(recommendedWords.length > 0);

  if (!selectedTopic) { navigate('/'); return null; }

  if (!wordsLoaded && !loadingWords) {
    setLoadingWords(true);
    fetch(`${API_BASE}/retrieve-vocab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: selectedTopic, roughIdea, cueAnswers, difficultySliderValue: difficultySlider }),
    })
      .then(r => r.json())
      .then(data => { setRecommendedWords(data.words); setWordsLoaded(true); })
      .catch(() => alert('Could not load words. Please go back and try again.'))
      .finally(() => setLoadingWords(false));
  }

  function toggleWordFlip(id: string) {
    setFlippedWordIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const MAX_WORDS = 20;
  const wordCount = selectedWords.length;
  const canContinue = wordCount >= 5 && !loadingWords;
  const atMax = wordCount >= MAX_WORDS;

  async function handleContinue() {
    if (!canContinue || suggestingGrammar) return;
    setSuggestingGrammar(true);
    try {
      const res = await fetch(`${API_BASE}/suggest-grammar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic, targetWords: selectedWords, cueAnswers }),
      });
      if (!res.ok) throw new Error('Failed to suggest grammar');
      const data = await res.json();
      setSuggestedGrammar(data.grammar);
      navigate('/grammar');
    } catch (err) {
      console.error(err);
      alert('Could not load grammar suggestions. Please try again.');
    } finally {
      setSuggestingGrammar(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-10">

        <div className="mb-6 animate-slide-up">
          <button onClick={() => navigate('/cues')}
            className="text-xs font-mono text-ink-muted hover:text-ink mb-4 block">
            ← Back to questions
          </button>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{selectedTopic.icon}</span>
            <h2 className="font-display text-3xl text-ink">Pick your words</h2>
          </div>
          <p className="text-sm text-ink-muted mt-1">
            Choose 5–20 words you want to actively use. Tap a card to see its definition, then select.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-8">
          {/* Word grid — 3 cols */}
          <div className="col-span-3">
            {loadingWords && (
              <div className="grid grid-cols-3 gap-3 animate-pulse">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="min-h-[160px] rounded-xl border border-stone bg-stone/20" />
                ))}
              </div>
            )}

            {!loadingWords && (
              <div className="grid grid-cols-3 gap-3">
                {recommendedWords.map((word: Word) => {
                  const sel = selectedWords.some(w => w.id === word.id);
                  const disabled = !sel && atMax;
                  const flipped = flippedWordIds.includes(word.id);

                  return (
                    <div
                      key={word.id}
                      onClick={() => toggleWordFlip(word.id)}
                      className={`
                        relative min-h-[160px] rounded-xl border cursor-pointer overflow-hidden
                        transition-all duration-200
                        ${sel
                          ? 'border-ink bg-ink text-white shadow-md animate-pop'
                          : disabled
                            ? 'border-stone/50 bg-stone/10 opacity-40'
                            : 'border-stone bg-sand-50 hover:border-ink/40 hover:bg-stone/20'}
                      `}
                    >
                      {!flipped ? (
                        <div className="h-full p-4 flex flex-col">
                          <div className="flex-1">
                            <p className={`font-display text-xl mb-1 ${sel ? 'text-white' : 'text-ink'}`}>
                              {word.korean}
                            </p>
                            <p className={`text-xs leading-tight mb-2 ${sel ? 'text-white/70' : 'text-ink-muted'}`}>
                              {word.english}
                            </p>
                            <span className={`chip text-[10px] ${sel
                              ? 'border-white/20 text-white/70'
                              : GRADE_COLOR[word.grade] ?? 'border-ink-muted/30 text-ink-muted'}`}>
                              {GRADE_LABEL[word.grade] ?? word.grade}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={e => { e.stopPropagation(); if (!disabled) toggleWord(word); }}
                            className={`
                              mt-4 w-full rounded-lg px-3 py-2 text-xs font-mono transition-colors
                              ${sel
                                ? 'bg-white text-ink hover:bg-stone/20'
                                : disabled
                                  ? 'bg-stone/40 text-ink-muted cursor-not-allowed'
                                  : 'bg-ink text-white hover:bg-ink/90'}
                            `}
                          >
                            {sel ? 'Selected ✓' : 'Select'}
                          </button>
                        </div>
                      ) : (
                        <div className={`h-full p-4 flex flex-col justify-between
                          ${sel ? 'bg-ink text-white' : 'bg-white text-ink'}`}>
                          <div>
                            {word.definition && (
                              <p className={`text-xs leading-snug mb-2 italic ${sel ? 'text-white/70' : 'text-ink-muted'}`}>
                                {word.definition}
                              </p>
                            )}
                            <p className={`text-[10px] font-mono uppercase tracking-widest mb-1
                              ${sel ? 'text-white/50' : 'text-ink-muted'}`}>
                              Example
                            </p>
                            <p className={`text-sm leading-relaxed ${sel ? 'text-white' : 'text-ink'}`}>
                              {word.example || 'No example.'}
                            </p>
                          </div>
                          <p className={`text-[10px] font-mono mt-3 ${sel ? 'text-white/40' : 'text-ink-muted'}`}>
                            Tap to flip back
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right sidebar — selected list + CTA */}
          <div className="col-span-1">
            <div className="sticky top-28 space-y-4">
              <div className="bg-sand-50 border border-stone rounded-xl p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-xs font-mono uppercase tracking-widest text-ink-muted">Selected</p>
                  <p className={`text-xs font-mono font-bold ${atMax ? 'text-coral' : 'text-ink'}`}>
                    {wordCount} / {MAX_WORDS}
                  </p>
                </div>
                {selectedWords.length === 0 ? (
                  <p className="text-xs text-ink-muted italic">No words selected yet</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedWords.map(w => (
                      <button
                        key={w.id}
                        onClick={e => { e.stopPropagation(); toggleWord(w); }}
                        className="px-2.5 py-1 rounded-lg bg-ink text-white text-xs font-display
                                   hover:bg-coral transition-colors"
                        title="Click to remove"
                      >
                        {w.korean}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {atMax && <p className="text-xs text-coral text-center font-mono">Maximum 20 reached</p>}

              <button
                onClick={handleContinue}
                disabled={!canContinue || suggestingGrammar}
                className="btn-primary w-full py-3"
              >
                {suggestingGrammar ? 'Loading…' : 'Pick grammar →'}
              </button>
              {!canContinue && !loadingWords && (
                <p className="text-xs text-ink-muted text-center">Select at least 5 words</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
