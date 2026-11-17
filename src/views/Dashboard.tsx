import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Learner, Lesson, ProgressRecord } from '../types';
import { progressStore } from '../services/progressStore';
import { formatDuration } from '../lib/format';
import { AppShell } from '../components/AppShell';
import { CourseCard } from '../components/CourseCard';

interface Props {
  learner: Learner;
  lessons: Lesson[];
  onOpen: (lessonId: string) => void;
}

function StatCard({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="label text-xs text-muted">{label}</div>
      <div className="mt-2 font-display text-3xl text-paper" data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

export function Dashboard({ learner, lessons, onOpen }: Props) {
  const [records, setRecords] = useState<Record<string, ProgressRecord>>({});

  const load = useCallback(async () => {
    const list = await progressStore.listProgress(learner.id);
    setRecords(Object.fromEntries(list.map((r) => [r.lessonId, r])));
  }, [learner.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReset = useCallback(
    async (lessonId: string) => {
      if (!window.confirm('Reset saved progress for this course? (testing only)')) return;
      await progressStore.resetProgress(learner.id, lessonId);
      await load();
    },
    [learner.id, load],
  );

  const stats = useMemo(() => {
    const known = lessons.map((l) => records[l.id]).filter((r): r is ProgressRecord => !!r);
    return {
      inProgress: known.filter((r) => r.status === 'in_progress').length,
      completed: known.filter((r) => r.status === 'completed').length,
      timeMs: known.reduce((sum, r) => sum + r.stats.activeMs, 0),
    };
  }, [lessons, records]);

  const firstName = learner.name.split(' ')[0];

  return (
    <AppShell learner={learner}>
      <div className="mx-auto max-w-6xl">
        <div className="label text-sm text-brand">Dashboard</div>
        <h1 className="mt-1 text-3xl text-paper md:text-4xl">Welcome back, {firstName}</h1>
        <p className="mt-2 text-muted">Pick up where you left off. Every module makes you a stronger steward.</p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Your stats">
          <StatCard label="Courses in progress" value={String(stats.inProgress)} testId="stat-in-progress" />
          <StatCard label="Completed" value={String(stats.completed)} testId="stat-completed" />
          <StatCard label="Total learning time" value={formatDuration(stats.timeMs)} testId="stat-time" />
        </section>

        <section className="mt-10" aria-labelledby="courses-heading">
          <h2 id="courses-heading" className="text-xl text-paper">
            Your courses
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lessons.map((lesson) => (
              <CourseCard key={lesson.id} lesson={lesson} record={records[lesson.id]} onOpen={onOpen} onReset={handleReset} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
