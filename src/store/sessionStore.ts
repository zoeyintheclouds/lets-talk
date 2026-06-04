import { create } from 'zustand';
import type { Topic, Word, TimelineSection, GrammarPattern } from '../types';

interface SessionState {
  // Setup
  selectedTopic:    Topic | null;
  roughIdea:        string;
  difficultySlider: number;

  // Words
  recommendedWords: Word[];
  selectedWords:    Word[];

  // Cue questions
  cueQuestions: string[];
  cueAnswers:   string[];

  // Grammar selection (step ③.5)
  suggestedGrammar: GrammarPattern[];  // 5–6 from /suggest-grammar
  selectedGrammar:  GrammarPattern[];  // 2–3 the user picks → fed into timeline

  // Timeline + grammar (from /api/timeline)
  speechTimeline:  TimelineSection[];
  grammarPatterns: GrammarPattern[];

  // Recording
  recordingBlob: Blob | null;

  // Self-evaluation
  usedWordIds:    string[];
  usedGrammarIds: string[];  // grammar ids from grammarPatterns

  // Timeline notes (sectionId → note text)
  sectionNotes: Record<string, string>;

  // Feedback
  feedback: FeedbackData | null;

  // ── Actions ──
  setTopic:            (t: Topic) => void;
  setRoughIdea:        (s: string) => void;
  setDifficulty:       (n: number) => void;
  setRecommendedWords: (words: Word[]) => void;
  toggleWord:          (word: Word) => void;
  setCueQuestions:     (qs: string[]) => void;
  setCueAnswers:       (as: string[]) => void;
  setSuggestedGrammar: (g: GrammarPattern[]) => void;
  toggleGrammar:       (g: GrammarPattern) => void;
  setTimeline:         (sections: TimelineSection[], grammar: GrammarPattern[]) => void;
  setRecording:        (blob: Blob) => void;
  toggleUsedWord:      (id: string) => void;
  toggleUsedGrammar:   (id: string) => void;
  setSectionNote:      (sectionId: string, note: string) => void;
  setFeedback:         (f: FeedbackData) => void;
  reset:               () => void;
}

export interface FeedbackData {
  encouragement: string;
  usedSummary:   string;
  missedWords: {
    id: string; korean: string; english: string; definition?: string; reason: string; example: string;
  }[];
  missedGrammar: {
    id: string; pattern: string; meaning: string; reason: string; example: string;
  }[];
  nextSentence: string;
}

const defaults = {
  selectedTopic:    null,
  roughIdea:        '',
  difficultySlider: 3,
  recommendedWords: [],
  selectedWords:    [],
  cueQuestions:     [],
  cueAnswers:       [],
  suggestedGrammar: [],
  selectedGrammar:  [],
  speechTimeline:   [],
  grammarPatterns:  [],
  recordingBlob:    null,
  usedWordIds:      [],
  usedGrammarIds:   [],
  sectionNotes:     {},
  feedback:         null,
};

export const useStore = create<SessionState>((set) => ({
  ...defaults,

  setTopic:            (t) => set({ selectedTopic: t }),
  setRoughIdea:        (s) => set({ roughIdea: s }),
  setDifficulty:       (n) => set({ difficultySlider: n }),
  setRecommendedWords: (words) => set({ recommendedWords: words, selectedWords: [] }),
  toggleWord: (word) => set((s) => {
    const exists = s.selectedWords.some(w => w.id === word.id);
    if (exists) return { selectedWords: s.selectedWords.filter(w => w.id !== word.id) };
    if (s.selectedWords.length >= 20) return {};
    return { selectedWords: [...s.selectedWords, word] };
  }),
  setCueQuestions: (qs) => set({ cueQuestions: qs, cueAnswers: Array(qs.length).fill('') }),
  setCueAnswers:   (as) => set({ cueAnswers: as }),
  setSuggestedGrammar: (g) => set({ suggestedGrammar: g, selectedGrammar: [] }),
  toggleGrammar: (g) => set((s) => {
    const exists = s.selectedGrammar.some(x => x.id === g.id);
    if (exists) return { selectedGrammar: s.selectedGrammar.filter(x => x.id !== g.id) };
    return { selectedGrammar: [...s.selectedGrammar, g] };
  }),
  setTimeline: (sections, grammar) => set({
    speechTimeline: sections,
    grammarPatterns: grammar,
    usedGrammarIds: [],
  }),
  setRecording:      (blob) => set({ recordingBlob: blob }),
  toggleUsedWord:    (id) => set((s) => ({
    usedWordIds: s.usedWordIds.includes(id)
      ? s.usedWordIds.filter(x => x !== id)
      : [...s.usedWordIds, id],
  })),
  toggleUsedGrammar: (id) => set((s) => ({
    usedGrammarIds: s.usedGrammarIds.includes(id)
      ? s.usedGrammarIds.filter(x => x !== id)
      : [...s.usedGrammarIds, id],
  })),
  setSectionNote: (sectionId, note) => set((s) => ({
    sectionNotes: { ...s.sectionNotes, [sectionId]: note },
  })),
  setFeedback: (f) => set({ feedback: f }),
  reset: () => set(defaults),
}));