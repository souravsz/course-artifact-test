import { forwardRef, useRef, type CSSProperties, type ReactNode } from 'react';
import { useElementSize } from '../hooks/useElementSize';
import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * Smallest canvas a lesson is laid out on (16:9, tablet-landscape size). When the visible
 * area is smaller (phones), the lesson is rendered at this size and scaled down to fit,
 * like a video, instead of collapsing into a cramped layout.
 */
const MIN_W = 768;
const MIN_H = 432;
const VIDEO_RATIO = 16 / 9;

/** Phones in portrait or landscape: show the lesson inline as a 16:9 "video". */
const COMPACT_QUERY = '(max-width: 767px), (max-height: 500px)';

interface Props {
  title: string;
  percent: number;
  screenText: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  /** Shows a Finish button in the control bar while in full screen (the header is hidden then). */
  canFinish: boolean;
  onFinish: () => void;
  children: ReactNode;
}

export function ExpandIcon({ collapse, className = 'h-5 w-5' }: { collapse: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {collapse ? (
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      ) : (
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      )}
    </svg>
  );
}

/** Where to draw the lesson inside the stage, and at what scale. */
function layout(stageW: number, stageH: number, letterbox: boolean) {
  let boxW = stageW;
  let boxH = stageH;
  if (letterbox) {
    // Fit a 16:9 box inside the stage, centred (a landscape video on a portrait screen).
    boxW = stageW;
    boxH = stageW / VIDEO_RATIO;
    if (boxH > stageH) {
      boxH = stageH;
      boxW = stageH * VIDEO_RATIO;
    }
  }
  const scale = Math.min(1, boxW / MIN_W, boxH / MIN_H);
  return {
    left: (stageW - boxW) / 2,
    top: (stageH - boxH) / 2,
    boxW,
    boxH,
    scale,
    width: boxW / scale,
    height: boxH / scale,
  };
}

/**
 * Video-player style frame around the lesson: a contained "screen", a control bar and a
 * full-screen toggle. Only styles change between modes, so the iframe inside is never
 * re-mounted or reloaded. Full-screen state is owned by the parent so other controls
 * (e.g. the player header) can toggle it too.
 */
export const LessonScreen = forwardRef<HTMLDivElement, Props>(function LessonScreen(
  { title, percent, screenText, isFullscreen, onToggleFullscreen, canFinish, onFinish, children },
  ref,
) {
  const stageRef = useRef<HTMLDivElement>(null);
  const stage = useElementSize(stageRef);
  const compact = useMediaQuery(COMPACT_QUERY);
  const pct = Math.max(0, Math.min(100, percent));

  // Full screen on a phone held upright: letterbox like a video and ask to rotate.
  const portraitFullscreen = isFullscreen && stage.height > stage.width;
  const measured = stage.width > 0 && stage.height > 0;
  const fit = measured ? layout(stage.width, stage.height, portraitFullscreen) : null;

  const canvasStyle: CSSProperties = fit
    ? {
        position: 'absolute',
        left: fit.left,
        top: fit.top,
        width: fit.width,
        height: fit.height,
        transform: fit.scale < 1 ? `scale(${fit.scale})` : undefined,
        transformOrigin: 'top left',
      }
    : { position: 'absolute', inset: 0 };

  const outerClass = isFullscreen
    ? 'fixed inset-0 z-50 h-dvh w-screen'
    : `w-full rounded-2xl border border-line ${compact ? '' : 'h-[max(644px,calc(100dvh-8rem))]'}`;
  const stageClass = isFullscreen || !compact ? 'min-h-0 flex-1' : 'aspect-video max-h-[70dvh] w-full';

  return (
    <div
      ref={ref}
      data-testid="lesson-screen"
      data-fullscreen={isFullscreen || undefined}
      data-scale={fit ? fit.scale.toFixed(3) : undefined}
      className={`flex flex-col overflow-hidden bg-ink ${outerClass}`}
    >
      <div ref={stageRef} className={`relative overflow-hidden bg-black ${stageClass}`} data-testid="lesson-stage">
        <div style={canvasStyle} data-testid="lesson-canvas">
          {children}
        </div>
        {portraitFullscreen && fit && (
          <div
            className="label absolute inset-x-0 flex flex-col items-center gap-2 px-6 text-center text-sm text-muted"
            style={{ top: fit.top + fit.boxH + 24 }}
            data-testid="rotate-hint"
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="7" y="2.5" width="10" height="19" rx="2" />
              <path d="M3 9a9 9 0 0 1 3-5.5M3 9V5M3 9h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Turn your phone sideways for the full view
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-panel">
        <div className="h-1 w-full bg-panel-2" aria-hidden="true">
          <div className="h-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-3 px-3 py-1.5">
          <div className="label flex min-w-0 flex-1 items-center gap-3 text-xs text-muted">
            {isFullscreen && <span className="truncate text-paper">{title}</span>}
            {screenText && <span className="shrink-0">Screen {screenText}</span>}
            <span className="shrink-0 text-paper">{pct}%</span>
          </div>
          {isFullscreen && canFinish && (
            <button
              type="button"
              onClick={onFinish}
              className="label rounded-md bg-brand px-3 py-1.5 text-xs text-ink hover:brightness-110"
            >
              Finish course
            </button>
          )}
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            data-testid="screen-fullscreen-toggle"
            className="label flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-paper hover:bg-panel-2 hover:text-brand"
          >
            <ExpandIcon collapse={isFullscreen} />
            {isFullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
        </div>
      </div>
    </div>
  );
});
