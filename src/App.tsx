import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppHeader      from './components/AppHeader';
import SetupScreen    from './pages/SetupScreen';
import CueScreen      from './pages/CueScreen';
import SelectScreen   from './pages/SelectScreen';
import GrammarScreen  from './pages/GrammarScreen';
import TimelineScreen from './pages/TimelineScreen';
import RecordScreen   from './pages/RecordScreen';
import EvaluateScreen from './pages/EvaluateScreen';
import FeedbackScreen from './pages/FeedbackScreen';

export default function App() {
  return (
    <BrowserRouter>
      <AppHeader />
      <Routes>
        <Route path="/"          element={<SetupScreen />} />
        <Route path="/cues"      element={<CueScreen />} />
        <Route path="/select"    element={<SelectScreen />} />
        <Route path="/grammar"   element={<GrammarScreen />} />
        <Route path="/timeline"  element={<TimelineScreen />} />
        <Route path="/record"    element={<RecordScreen />} />
        <Route path="/evaluate"  element={<EvaluateScreen />} />
        <Route path="/feedback"  element={<FeedbackScreen />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
