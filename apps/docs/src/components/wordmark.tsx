import { WORDMARK } from '@/brand.ts';

/**
 * The keyrove wordmark. `className` carries the height; the width follows from
 * the viewBox. It names the link it sits in, so it is an image, not decoration.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `${className} w-auto shrink-0` : 'w-auto shrink-0'}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={WORDMARK.viewBox}
      role="img"
      aria-label="keyrove"
      dangerouslySetInnerHTML={{ __html: WORDMARK.body }}
    />
  );
}
