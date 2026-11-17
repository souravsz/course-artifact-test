import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Learner, Lesson, LessonMessage, LoggedEvent, ProgressRecord, QuizResult } from '../types';
import { emptyProgress, progressStore, type ProgressStore } from '../services/progressStore';

export type InitMode = 'new' | 'resume' | 'review';

export interface LessonBridgeState {
  /** Saved progress has been loaded and the host can answer `ready`. */
  loaded: boolean;
  record: ProgressRecord | null;
  /** Latest events, newest last (max 100). */
  events: LoggedEvent[];
  /** What the host told the lesson in the last `init`. */
  mode: InitMode | null;
  /** True only after a validated `lesson_completed` message in this player session. */
  completedThisSession: boolean;
  /** Call from the iframe's onLoad so a reloaded lesson gets a fresh `init`. */
  onIframeLoad: () => void;
}

const UI_EVENT_LIMIT = 100;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

function isLessonMessage(v: unknown): v is LessonMessage {
  return isObj(v) && v.source === 'wtcm-lesson' && typeof v.type === 'string';
}

function newAttemptId(): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `att_${Date.now().toString(36)}_${rand.slice(0, 8)}`;
}

function cloneRecord(r: ProgressRecord): ProgressRecord {
  return { ...r, stats: { ...r.stats }, screenTimes: { ...r.screenTimes } };
}

function toQuiz(d: Record<string, unknown>): QuizResult | null {
  const score = num(d.score);
  const total = num(d.total);
  if (score === null || total === null) return null;
  return {
    score,
    total,
    percent: num(d.percent) ?? (total > 0 ? Math.round((score / total) * 100) : 0),
    passed: d.passed === true,
    attempt: num(d.attempt) ?? undefined,
  };
}

/**
 * Bridges a sandboxed lesson iframe and the progress store.
 * All message validation, resume/review decisions and persistence live here;
 * the iframe component only renders the frame.
 */
export function useLessonBridge(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  lesson: Lesson,
  learner: Learner,
  store: ProgressStore = progressStore,
): LessonBridgeState {
  const [loaded, setLoaded] = useState(false);
  const [record, setRecord] = useState<ProgressRecord | null>(null);
  const [events, setEvents] = useState<LoggedEvent[]>([]);
  const [mode, setMode] = useState<InitMode | null>(null);
  const [completedThisSession, setCompletedThisSession] = useState(false);

  const recordRef = useRef<ProgressRecord | null>(null);
  const loadedRef = useRef(false);
  const initSentRef = useRef(false);
  const answeredReadyRef = useRef<string | null>(null);
  const attemptRef = useRef<string | null>(null);
  /** activeMs stored before this lesson session began; heartbeats report session time only. */
  const activeBaseRef = useRef(0);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  // Load saved progress and recent events for this lesson.
  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;
    initSentRef.current = false;
    answeredReadyRef.current = null;
    attemptRef.current = null;
    recordRef.current = null;
    setLoaded(false);
    setRecord(null);
    setEvents([]);
    setMode(null);
    setCompletedThisSession(false);

    Promise.all([store.getProgress(learner.id, lesson.id), store.getEvents(learner.id, lesson.id, UI_EVENT_LIMIT)])
      .then(([rec, evs]) => {
        if (cancelled) return;
        const current = rec ?? emptyProgress(lesson.id);
        recordRef.current = current;
        loadedRef.current = true;
        setRecord(current);
        setEvents(evs);
        setLoaded(true);
      })
      .catch((err) => console.error('[lessonBridge] failed to load progress', err));

    return () => {
      cancelled = true;
    };
  }, [lesson.id, learner.id, store]);

  // Listen for lesson messages.
  useEffect(() => {
    const commit = (next: ProgressRecord) => {
      next.updatedAt = new Date().toISOString();
      recordRef.current = next;
      setRecord(next);
      saveChainRef.current = saveChainRef.current
        .then(() => store.saveProgress(learner.id, next))
        .catch((err) => console.error('[lessonBridge] save failed', err));
    };

    const log = (event: LoggedEvent) => {
      setEvents((prev) => [...prev, event].slice(-UI_EVENT_LIMIT));
      store.appendEvent(learner.id, lesson.id, event).catch((err) => console.error('[lessonBridge] log failed', err));
    };

    const toLogged = (msg: LessonMessage, ignored = false): LoggedEvent => ({
      at: new Date().toISOString(),
      type: msg.type,
      slide: num(msg.slide),
      attemptId: str(msg.attemptId),
      data: isObj(msg.data) ? msg.data : {},
      ...(ignored ? { ignored: true } : {}),
    });

    const handleReady = (msg: LessonMessage, target: Window) => {
      // Answer once per iframe load, and only once saved progress is known (the lesson keeps retrying).
      // `ready` carries the lesson's own pre-init attempt id, unique per document load, so a `ready`
      // that was already queued when onLoad reset the flag is not answered twice.
      if (initSentRef.current || !loadedRef.current || !recordRef.current) return;
      if (msg.attemptId && msg.attemptId === answeredReadyRef.current) return;
      answeredReadyRef.current = str(msg.attemptId);

      const data = isObj(msg.data) ? msg.data : {};
      const version = str(data.version) ?? str(msg.version);
      const saved = recordRef.current;
      let rec = cloneRecord(saved);
      let initMode: InitMode;

      if (saved.status === 'completed') {
        initMode = 'review';
        if (!rec.attemptId) rec.attemptId = newAttemptId();
      } else if (saved.status === 'in_progress' && saved.attemptId && saved.version === version) {
        initMode = 'resume';
      } else {
        // Not started, or the lesson version changed: discard any resume point and start over.
        initMode = 'new';
        rec = { ...emptyProgress(lesson.id), attemptId: newAttemptId() };
      }
      if (initMode !== 'review' || !rec.version) rec.version = version;
      rec.totalSlides = num(data.totalSlides) ?? rec.totalSlides;
      commit(rec);

      attemptRef.current = rec.attemptId;
      activeBaseRef.current = rec.stats.activeMs;
      initSentRef.current = true;
      setMode(initMode);

      target.postMessage(
        {
          source: 'wtcm-host',
          type: 'init',
          learner: { id: learner.id, name: learner.name },
          attemptId: rec.attemptId,
          resume: initMode === 'resume' ? rec.suspendData ?? null : null,
          review: initMode === 'review',
          config: { idleSeconds: 60 },
        },
        '*',
      );

      log(toLogged(msg));
      log({
        at: new Date().toISOString(),
        type: 'host:init',
        slide: null,
        attemptId: rec.attemptId,
        data: { mode: initMode, version, resumeSlide: initMode === 'resume' ? rec.currentSlide : null },
      });
    };

    const apply = (msg: LessonMessage) => {
      const cur = recordRef.current;
      if (!cur) return;
      const d = isObj(msg.data) ? msg.data : {};
      const done = cur.status === 'completed';
      const next = cloneRecord(cur);
      const now = new Date().toISOString();

      switch (msg.type) {
        case 'lesson_started':
        case 'lesson_resumed':
        case 'review_started':
          if (!done) {
            next.status = 'in_progress';
            next.startedAt = next.startedAt ?? now;
          }
          next.totalSlides = num(d.totalSlides) ?? next.totalSlides;
          break;

        case 'progress': {
          if (done) return;
          const pct = num(d.percent);
          if (pct !== null) next.percent = Math.max(0, Math.min(100, Math.round(pct)));
          if ('suspendData' in d) next.suspendData = d.suspendData ?? null;
          const slide = num(msg.slide);
          if (slide !== null) next.currentSlide = slide;
          break;
        }

        case 'slide_viewed': {
          const slide = num(d.index) ?? num(msg.slide);
          if (slide === null) return;
          next.currentSlide = slide;
          break;
        }

        case 'slide_exit': {
          const id = str(d.slideId) ?? str(msg.slideId);
          const ms = num(d.activeMs);
          if (!id || ms === null) return;
          next.screenTimes[id] = (next.screenTimes[id] ?? 0) + ms;
          break;
        }

        case 'tab_hidden':
          next.stats.tabSwitches += 1;
          break;
        case 'tab_visible':
          next.stats.awayMs += num(d.awayMs) ?? 0;
          break;
        case 'focus_lost':
          next.stats.focusLost += 1;
          break;
        case 'idle_start':
          next.stats.idleCount += 1;
          break;
        case 'idle_end':
          next.stats.idleMs += num(d.idleMs) ?? 0;
          break;
        case 'heartbeat': {
          const ms = num(d.activeMs);
          if (ms === null) return;
          next.stats.activeMs = Math.max(next.stats.activeMs, activeBaseRef.current + ms);
          break;
        }

        case 'quiz_completed': {
          if (done) return;
          const quiz = toQuiz(d);
          if (!quiz) return;
          next.quiz = quiz;
          break;
        }

        case 'scenario_completed':
          if (done) return;
          next.scenario = d;
          break;

        case 'lesson_completed': {
          // The only path to completion: a validated message from this lesson's own iframe and attempt.
          if (done) return;
          next.status = 'completed';
          next.summary = d;
          next.success = d.success === 'passed' || d.success === 'failed' ? d.success : null;
          next.completedAt = now;
          next.percent = 100;
          const ms = num(d.activeMs);
          if (ms !== null) next.stats.activeMs = Math.max(next.stats.activeMs, activeBaseRef.current + ms);
          if (!next.quiz && isObj(d.quiz)) next.quiz = toQuiz(d.quiz);
          if (!next.scenario && isObj(d.scenario)) next.scenario = d.scenario;
          setCompletedThisSession(true);
          break;
        }

        default:
          // lesson_exited, interactions, quiz answers, etc.: logged only.
          return;
      }
      commit(next);
    };

    const onMessage = (e: MessageEvent) => {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow || e.source !== frameWindow) return;
      const msg: unknown = e.data;
      if (!isLessonMessage(msg)) return;

      if (msg.type === 'ready') {
        handleReady(msg, frameWindow);
        return;
      }
      // Events that do not belong to the attempt we initialised are recorded but never acted on.
      if (!attemptRef.current || msg.attemptId !== attemptRef.current) {
        log(toLogged(msg, true));
        return;
      }
      log(toLogged(msg));
      apply(msg);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [iframeRef, lesson.id, learner.id, learner.name, store]);

  const onIframeLoad = useCallback(() => {
    initSentRef.current = false;
  }, []);

  return { loaded, record, events, mode, completedThisSession, onIframeLoad };
}
