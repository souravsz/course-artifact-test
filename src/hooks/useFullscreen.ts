import { useCallback, useEffect, useState, type RefObject } from 'react';

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const fullscreenElement = () => document.fullscreenElement ?? (document as WebkitDocument).webkitFullscreenElement ?? null;

// `lock` is missing from some DOM typings and only works in full screen on touch devices (Android Chrome).
type LockableOrientation = ScreenOrientation & { lock?: (o: 'landscape') => Promise<void>; unlock?: () => void };
const orientation = () => (typeof screen !== 'undefined' ? (screen.orientation as LockableOrientation | undefined) : undefined);

async function lockLandscape() {
  if (!window.matchMedia('(pointer: coarse)').matches) return; // desktops: nothing to rotate
  try {
    await orientation()?.lock?.('landscape');
  } catch {
    /* not supported (iOS, desktop): the learner can rotate the phone themselves */
  }
}

function unlockOrientation() {
  try {
    orientation()?.unlock?.();
  } catch {
    /* ignore */
  }
}

interface Options {
  /** Like a video player: turn phones to landscape on entering full screen where the browser allows it. */
  lockLandscape?: boolean;
}

/**
 * Full screen for an element. Uses the Fullscreen API where it exists and falls back to a
 * fixed, viewport-sized overlay where it doesn't (iPhone Safari only supports it for <video>).
 * Either way the element stays in place in the DOM, so an iframe inside it is not reloaded.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>, options: Options = {}) {
  const [native, setNative] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const sync = () => setNative(!!ref.current && fullscreenElement() === ref.current);
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, [ref]);

  // Fallback mode: stop the page behind from scrolling, and let Escape close it.
  useEffect(() => {
    if (!fallback) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFallback(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [fallback]);

  const exitNative = useCallback(async () => {
    if (!fullscreenElement()) return;
    const doc = document as WebkitDocument;
    try {
      await (document.exitFullscreen ? document.exitFullscreen() : doc.webkitExitFullscreen?.());
    } catch {
      /* already exited */
    }
  }, []);

  // Leave full screen if the player unmounts while in it.
  useEffect(() => {
    return () => {
      if (fullscreenElement()) void exitNative();
    };
  }, [exitNative]);

  const enter = useCallback(async () => {
    const el = ref.current as WebkitElement | null;
    if (!el) return;
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (request && document.fullscreenEnabled !== false) {
      try {
        await request();
        if (options.lockLandscape) await lockLandscape();
        return;
      } catch {
        /* blocked or unsupported: use the overlay */
      }
    }
    setFallback(true);
  }, [ref, options.lockLandscape]);

  const exit = useCallback(async () => {
    setFallback(false);
    unlockOrientation();
    await exitNative();
  }, [exitNative]);

  const isFullscreen = native || fallback;
  const toggle = useCallback(() => (isFullscreen ? exit() : enter()), [isFullscreen, enter, exit]);

  return { isFullscreen, enter, exit, toggle };
}
