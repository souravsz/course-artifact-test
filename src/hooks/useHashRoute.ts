import { useCallback, useEffect, useState } from 'react';

const LEARN_PREFIX = '#/learn/';

function parse(hash: string): string | null {
  if (!hash.startsWith(LEARN_PREFIX)) return null;
  const id = decodeURIComponent(hash.slice(LEARN_PREFIX.length)).trim();
  return id || null;
}

/** Keeps the open lesson id in `#/learn/<lessonId>` so a reload reopens the player. */
export function useHashRoute() {
  const [lessonId, setLessonId] = useState<string | null>(() => parse(window.location.hash));

  useEffect(() => {
    const sync = () => setLessonId(parse(window.location.hash));
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const openLesson = useCallback((id: string) => {
    window.location.hash = `/learn/${encodeURIComponent(id)}`;
  }, []);

  const goHome = useCallback(() => {
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
    setLessonId(null);
  }, []);

  return { lessonId, openLesson, goHome };
}
