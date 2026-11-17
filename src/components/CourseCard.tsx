import type { Lesson, ProgressRecord } from '../types';
import { formatDuration, quizLabel, screenNumber } from '../lib/format';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';

interface Props {
  lesson: Lesson;
  record: ProgressRecord | undefined;
  onOpen: (lessonId: string) => void;
  onReset: (lessonId: string) => void;
}

export function CourseCard({ lesson, record, onOpen, onReset }: Props) {
  const locked = !lesson.fileUrl;
  const status = record?.status ?? 'not_started';
  const percent = record?.percent ?? 0;
  const quiz = record ? quizLabel(record) : null;

  const action = locked
    ? 'Coming soon'
    : status === 'completed'
      ? 'Review'
      : status === 'in_progress' && record
        ? `Resume from screen ${screenNumber(record)}`
        : 'Start';

  return (
    <article
      className={`flex flex-col rounded-2xl border border-line bg-panel p-5 ${locked ? 'opacity-60' : ''}`}
      data-testid={`course-${lesson.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="label text-xs text-brand">{lesson.category}</span>
        <StatusBadge record={record} locked={locked} />
      </div>

      <h3 className="mt-3 text-lg leading-tight text-paper">{lesson.title}</h3>
      <p className="mt-1 text-sm text-muted">{lesson.description}</p>

      <div className="label mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>⏱ ~{lesson.estMinutes} min</span>
        {record && record.stats.activeMs > 0 && <span>Spent {formatDuration(record.stats.activeMs)}</span>}
        {quiz && <span className={record?.quiz?.passed ? 'text-ok' : 'text-bad'}>Quiz {quiz}</span>}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <ProgressBar percent={percent} complete={status === 'completed'} />
        <span className="label w-10 text-right text-sm text-paper" data-testid="card-percent">
          {percent}%
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={locked}
          onClick={() => onOpen(lesson.id)}
          className={`label rounded-lg px-4 py-2 text-sm transition ${
            locked
              ? 'cursor-not-allowed border border-line text-muted'
              : status === 'completed'
                ? 'border border-paper/30 text-paper hover:border-brand hover:text-brand'
                : 'bg-brand text-ink hover:brightness-110'
          }`}
        >
          {action}
        </button>
        {!locked && (
          <button
            type="button"
            onClick={() => onReset(lesson.id)}
            disabled={!record || status === 'not_started'}
            className="text-xs text-muted underline-offset-2 hover:text-bad hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted disabled:hover:no-underline"
            title="Testing only: clears saved progress and events"
          >
            Reset progress
          </button>
        )}
      </div>
    </article>
  );
}
