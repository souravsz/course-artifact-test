import { useRef } from 'react';
import type { Learner, Lesson, ProgressRecord } from '../types';
import { useLessonBridge } from '../hooks/useLessonBridge';
import { useFullscreen } from '../hooks/useFullscreen';
import { LessonFrame } from '../components/LessonFrame';
import { SessionPanel } from '../components/SessionPanel';
import { EventLog } from '../components/EventLog';
import { StatusBadge } from '../components/StatusBadge';
import { Star } from '../components/Logo';
import { ExpandIcon, LessonScreen } from '../components/LessonScreen';
import { screenLabel } from '../lib/format';

interface Props {
  lesson: Lesson & { fileUrl: string };
  learner: Learner;
  onBack: () => void;
  onFinish: (record: ProgressRecord | null) => void;
}

export function Player({ lesson, learner, onBack, onFinish }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const { loaded, record, events, mode, completedThisSession, onIframeLoad } = useLessonBridge(iframeRef, lesson, learner);
  const { isFullscreen, toggle, exit } = useFullscreen(screenRef, { lockLandscape: true });
  const canFinish = completedThisSession && record?.status === 'completed';

  // Hand keyboard focus back to the lesson after using the player's own controls,
  // so the click doesn't register as the learner leaving the lesson.
  const toggleFullscreen = async () => {
    await toggle();
    iframeRef.current?.focus();
  };

  const finish = async () => {
    await exit();
    onFinish(record);
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-ink/95 px-4 py-3 backdrop-blur md:px-6">
        <button type="button" onClick={onBack} className="label text-sm text-muted hover:text-brand">
          ← Back to dashboard
        </button>
        <div className="order-last flex w-full min-w-0 items-center gap-3 sm:order-none sm:w-auto sm:flex-1">
          <Star className="hidden h-5 w-5 shrink-0 text-brand sm:block" />
          <h1 className="truncate text-base text-paper md:text-lg">{lesson.title}</h1>
          <span data-testid="player-status">
            <StatusBadge record={record} />
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            disabled={!loaded}
            aria-label="Full screen"
            title="View the course in full screen"
            data-testid="header-fullscreen"
            className="label flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-paper transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExpandIcon collapse={false} className="h-4 w-4" />
            <span className="hidden sm:inline">Full screen</span>
          </button>
          <button
            type="button"
            disabled={!canFinish}
            onClick={finish}
            title={canFinish ? undefined : 'Unlocks when you reach the end of the lesson'}
            className="label rounded-lg bg-brand px-4 py-2 text-sm text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-panel-2 disabled:text-muted disabled:hover:brightness-100"
          >
            Finish course
          </button>
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <LessonScreen
            ref={screenRef}
            title={lesson.title}
            percent={record?.percent ?? 0}
            screenText={record ? screenLabel(record) : null}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            canFinish={canFinish}
            onFinish={finish}
          >
            {/* Mount the lesson only once saved progress is known so the first `ready` can be answered. */}
            {loaded ? (
              <LessonFrame ref={iframeRef} src={lesson.fileUrl} title={lesson.title} onLoad={onIframeLoad} />
            ) : (
              <div className="grid h-full place-items-center text-muted">Loading lesson…</div>
            )}
          </LessonScreen>
        </div>
        <aside className="space-y-4 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
          <SessionPanel record={record} mode={mode} />
          <EventLog events={events} />
        </aside>
      </div>
    </div>
  );
}
