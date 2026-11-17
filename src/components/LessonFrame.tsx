import { forwardRef } from 'react';

interface Props {
  src: string;
  title: string;
  onLoad: () => void;
}

/** Presentational only. All messaging lives in useLessonBridge. */
export const LessonFrame = forwardRef<HTMLIFrameElement, Props>(function LessonFrame({ src, title, onLoad }, ref) {
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      sandbox="allow-scripts"
      onLoad={onLoad}
      className="absolute inset-0 block h-full w-full bg-ink"
    />
  );
});
