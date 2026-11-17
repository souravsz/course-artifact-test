import { useCallback, useEffect, useState } from 'react';
import type { ProgressRecord } from './types';
import { findLesson, lessons } from './data/lessons';
import { currentLearner } from './data/learner';
import { useHashRoute } from './hooks/useHashRoute';
import { Dashboard } from './views/Dashboard';
import { Player } from './views/Player';
import { Toast, type ToastMessage } from './components/Toast';
import { quizLabel } from './lib/format';

export default function App() {
  const { lessonId, openLesson, goHome } = useHashRoute();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const lesson = findLesson(lessonId);
  const playable = lesson?.fileUrl ? { ...lesson, fileUrl: lesson.fileUrl } : null;

  // Unknown or locked lesson in the URL: fall back to the dashboard.
  useEffect(() => {
    if (lessonId && !playable) goHome();
  }, [lessonId, playable, goHome]);

  const handleFinish = useCallback(
    (record: ProgressRecord | null) => {
      const quiz = record ? quizLabel(record) : null;
      setToast({
        id: Date.now(),
        title: `Course completed${record?.success === 'passed' ? ' · Passed' : ''}`,
        body: [lesson?.title, quiz ? `Quiz ${quiz}` : null].filter(Boolean).join(' · '),
      });
      goHome();
    },
    [goHome, lesson?.title],
  );

  return (
    <>
      {playable ? (
        <Player key={playable.id} lesson={playable} learner={currentLearner} onBack={goHome} onFinish={handleFinish} />
      ) : (
        <Dashboard learner={currentLearner} lessons={lessons} onOpen={openLesson} />
      )}
      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
