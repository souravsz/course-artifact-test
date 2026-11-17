import type { LoggedEvent, ProgressRecord } from '../types';

/**
 * Progress persistence. The interface is async so the localStorage
 * implementation can be replaced by an HTTP API without touching callers.
 */
export interface ProgressStore {
  getProgress(learnerId: string, lessonId: string): Promise<ProgressRecord | null>;
  saveProgress(learnerId: string, record: ProgressRecord): Promise<void>;
  appendEvent(learnerId: string, lessonId: string, event: LoggedEvent): Promise<void>;
  getEvents(learnerId: string, lessonId: string, limit?: number): Promise<LoggedEvent[]>;
  resetProgress(learnerId: string, lessonId: string): Promise<void>;
  listProgress(learnerId: string): Promise<ProgressRecord[]>;
}

const MAX_EVENTS = 500;
const progressKey = (learnerId: string, lessonId: string) => `lms:progress:${learnerId}:${lessonId}`;
const eventsKey = (learnerId: string, lessonId: string) => `lms:events:${learnerId}:${lessonId}`;

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.warn('[progressStore] read failed', key, err);
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[progressStore] write failed', key, err);
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn('[progressStore] remove failed', key, err);
  }
}

export function emptyProgress(lessonId: string): ProgressRecord {
  return {
    lessonId,
    attemptId: null,
    version: null,
    status: 'not_started',
    percent: 0,
    currentSlide: 0,
    totalSlides: null,
    suspendData: null,
    stats: { activeMs: 0, tabSwitches: 0, awayMs: 0, idleCount: 0, idleMs: 0, focusLost: 0 },
    screenTimes: {},
    quiz: null,
    scenario: null,
    summary: null,
    success: null,
    startedAt: null,
    updatedAt: null,
    completedAt: null,
  };
}

/** Fill in fields missing from records written by older app versions. */
function normalize(lessonId: string, rec: Partial<ProgressRecord>): ProgressRecord {
  const base = emptyProgress(lessonId);
  return { ...base, ...rec, lessonId, stats: { ...base.stats, ...(rec.stats ?? {}) } };
}

export const localProgressStore: ProgressStore = {
  async getProgress(learnerId, lessonId) {
    const rec = readJson<Partial<ProgressRecord>>(progressKey(learnerId, lessonId));
    return rec ? normalize(lessonId, rec) : null;
  },

  async saveProgress(learnerId, record) {
    writeJson(progressKey(learnerId, record.lessonId), record);
  },

  async appendEvent(learnerId, lessonId, event) {
    const key = eventsKey(learnerId, lessonId);
    const list = readJson<LoggedEvent[]>(key) ?? [];
    list.push(event);
    writeJson(key, list.slice(-MAX_EVENTS));
  },

  async getEvents(learnerId, lessonId, limit = MAX_EVENTS) {
    const list = readJson<LoggedEvent[]>(eventsKey(learnerId, lessonId)) ?? [];
    return list.slice(-limit);
  },

  async resetProgress(learnerId, lessonId) {
    remove(progressKey(learnerId, lessonId));
    remove(eventsKey(learnerId, lessonId));
  },

  async listProgress(learnerId) {
    const prefix = `lms:progress:${learnerId}:`;
    const out: ProgressRecord[] = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const rec = readJson<Partial<ProgressRecord>>(key);
        if (rec) out.push(normalize(key.slice(prefix.length), rec));
      }
    } catch (err) {
      console.warn('[progressStore] list failed', err);
    }
    return out;
  },
};

/** The store the app uses. Swap this export for an API-backed implementation later. */
export const progressStore: ProgressStore = localProgressStore;
