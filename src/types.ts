export interface Lesson {
  id: string;
  title: string;
  description: string;
  /** URL of the self-contained HTML lesson. Missing = locked / coming soon. */
  fileUrl?: string;
  estMinutes: number;
  category: string;
}

export interface Learner {
  id: string;
  name: string;
}

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface TrackingStats {
  activeMs: number;
  tabSwitches: number;
  awayMs: number;
  idleCount: number;
  idleMs: number;
  focusLost: number;
}

export interface QuizResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  attempt?: number;
}

/** Opaque data owned by the lesson; the host stores it and hands it back. */
export type SuspendData = unknown;

export interface ProgressRecord {
  lessonId: string;
  attemptId: string | null;
  version: string | null;
  status: ProgressStatus;
  percent: number;
  /** Zero-based index of the screen the learner is on (screen number = currentSlide + 1). */
  currentSlide: number;
  totalSlides: number | null;
  suspendData: SuspendData | null;
  stats: TrackingStats;
  /** Accumulated active ms per screen id, from `slide_exit`. */
  screenTimes: Record<string, number>;
  quiz: QuizResult | null;
  scenario: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
  success: 'passed' | 'failed' | null;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}

/** Message the lesson posts to the host. */
export interface LessonMessage {
  source: 'wtcm-lesson';
  lessonId: string;
  version: string;
  attemptId: string;
  learnerId: string;
  type: string;
  slide: number;
  slideId: string | null;
  t: number;
  ts: string;
  data: Record<string, unknown>;
}

export interface LoggedEvent {
  /** ISO time the host received the event. */
  at: string;
  type: string;
  slide: number | null;
  attemptId: string | null;
  data: Record<string, unknown>;
  /** True when the host received but did not act on the event. */
  ignored?: boolean;
}
