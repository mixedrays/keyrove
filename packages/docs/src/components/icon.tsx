import { CHROME_ICONS, type ChromeIconName } from '@/icons.ts';

/**
 * One of the chrome's icons, drawn as build/icons.ts draws the content's:
 * `className` carries the size, and the glyph is decorative.
 */
export function Icon({
  name,
  className,
}: {
  name: ChromeIconName;
  className?: string;
}) {
  const { viewBox, strokeWidth, body } = CHROME_ICONS[name];

  // A filled mark carries `fill` on its own path; a stroked one is drawn by
  // the wrapper, so the two need different attribute sets.
  const stroke =
    strokeWidth === null
      ? {}
      : {
          stroke: 'currentColor',
          strokeWidth,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
        };

  return (
    <svg
      className={className ? `${className} shrink-0` : 'shrink-0'}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill="none"
      {...stroke}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
