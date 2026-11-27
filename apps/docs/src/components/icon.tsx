import { CHROME_ICONS, type ChromeIconName } from '@/icons.ts';

export function Icon({
  name,
  className,
}: {
  name: ChromeIconName;
  className?: string;
}) {
  const { viewBox, strokeWidth, body } = CHROME_ICONS[name];

  // A filled mark carries `fill` on its path; a stroked one on the wrapper.
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
