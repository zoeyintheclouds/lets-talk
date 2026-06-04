import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/sessionStore';
import { API_BASE } from '../lib/api';
import type { GrammarPattern } from '../types';

export default function GrammarScreen() {
  const navigate = useNavigate();
  const {
    selectedTopic, roughIdea, difficultySlider,
    selectedWords, suggestedGrammar, selectedGrammar,
    cueQuestions, cueAnswers,
    toggleGrammar, setTimeline,
  } = useStore();

  const [buildingTimeline, setBuildingTimeline] = useState(false);

  if (!selectedTopic || !suggestedGrammar.length) {
    navigate('/select');
    return null;
  }

  const sel = (g: GrammarPattern) => selectedGrammar.some(x => x.id === g.id);
  const canContinue = selectedGrammar.length >= 1 && !buildingTimeline;

  const beginnerPatterns    = suggestedGrammar.filter(g => g.level === 'beginner');
  const intermediatePatterns = suggestedGrammar.filter(g => g.level === 'intermediate' || !g.level);

  async function handleContinue() {
    if (!canContinue) return;
    setBuildingTimeline(true);
    try {
      const res = await fetch(`${API_BASE}/api/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          roughIdea,
          selectedWords,
          selectedGrammar,
          cueQuestions,
          cueAnswers,
          difficultySliderValue: difficultySlider,
        }),
      });
      if (!res.ok) throw new Error('Failed to build timeline');
      const data = await res.json();
      setTimeline(data.timeline, data.grammar);
      navigate('/timeline');
    } catch (err) {
      console.error(err);
      alert('Could not build your speech plan. Please try again.');
    } finally {
      setBuildingTimeline(false);
    }
  }

  function GrammarCard({ g }: { g: GrammarPattern }) {
    const selected = sel(g);
    const isIntermediate = g.level === 'intermediate' || !g.level;
    return (
      <div
        onClick={() => toggleGrammar(g)}
        className={`
          rounded-xl border cursor-pointer overflow-hidden transition-all duration-200
          ${selected
            ? isIntermediate
              ? 'border-coral bg-coral text-white shadow-md'
              : 'border-teal bg-teal text-white shadow-md'
            : 'border-stone bg-sand-50 hover:border-ink/30 hover:bg-stone/10'}
        `}
      >
        <div className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className={`font-mono text-sm font-semibold ${selected ? 'text-white' : isIntermediate ? 'text-coral' : 'text-teal'}`}>
              {selected && '✓ '}{g.pattern}
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5
              ${selected
                ? 'bg-white/20 text-white'
                : isIntermediate
                  ? 'bg-coral/10 text-coral'
                  : 'bg-teal/10 text-teal'}`}>
              {isIntermediate ? '중급' : '기초'}
            </span>
          </div>
          <p className={`text-xs mb-2 ${selected ? 'text-white/80' : 'text-ink-muted'}`}>
            {g.meaning}
          </p>
          {g.example && (
            <p className={`text-sm italic leading-relaxed ${selected ? 'text-white/90' : 'text-ink/70'}`}>
              {g.example}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-8 py-10">

        <div className="mb-6 animate-slide-up">
          <button onClick={() => navigate('/select')}
            className="text-xs font-mono text-ink-muted hover:text-ink mb-4 block">
            ← Back to words
          </button>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{selectedTopic.icon}</span>
            <h2 className="font-display text-3xl text-ink">Pick your grammar</h2>
          </div>
          <p className="text-sm text-ink-muted mt-1">
            Choose any patterns you want to try — they'll be woven into your speech plan.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Left — foundational */}
          <div className="col-span-1 animate-slide-up" style={{ animationDelay: '40ms', animationFillMode: 'both' }}>
            <p className="text-xs font-mono uppercase tracking-widest text-teal mb-3">기초 — Foundational</p>
            <div className="flex flex-col gap-2">
              {beginnerPatterns.map(g => <GrammarCard key={g.id} g={g} />)}
            </div>
          </div>

          {/* Right — intermediate (takes 2 cols, 2-col sub-grid) */}
          <div className="col-span-2 animate-slide-up" style={{ animationDelay: '80ms', animationFillMode: 'both' }}>
            <p className="text-xs font-mono uppercase tracking-widest text-coral mb-3">중급 — Intermediate</p>
            <div className="grid grid-cols-2 gap-2">
              {intermediatePatterns.map(g => <GrammarCard key={g.id} g={g} />)}
            </div>
          </div>
        </div>

        {/* Inline CTA */}
        <div className="mt-10 flex items-center gap-6 border-t border-stone pt-6">
          <div>
            <p className="text-sm text-ink">
              <span className="font-semibold">{selectedGrammar.length}</span> pattern{selectedGrammar.length !== 1 ? 's' : ''} selected
            </p>
            {!canContinue && !buildingTimeline && (
              <p className="text-xs text-coral mt-0.5">Select at least 1 pattern</p>
            )}
            {buildingTimeline && (
              <p className="text-xs text-teal mt-0.5">Building your speech plan…</p>
            )}
          </div>
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="btn-primary px-8 py-3 ml-auto"
          >
            {buildingTimeline ? 'Building…' : 'Build my plan →'}
          </button>
        </div>
      </div>
    </div>
  );
}
