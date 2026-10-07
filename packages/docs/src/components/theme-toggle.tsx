import { useState } from 'react';

import { Icon } from '@/components/icon.tsx';
import { Button } from '@/components/ui/button.tsx';
import { themeLabel, toggleTheme } from '@/theme.ts';

/**
 * The header theme toggle. The inline script in the root route applies the
 * stored choice before the page paints (see src/theme.ts); this handles
 * clicks.
 */
export function ThemeToggle() {
  const [label, setLabel] = useState('Switch between light and dark theme');

  // Both glyphs ship; style.css shows one per theme. Picking in script would
  // mean an empty button until the bundle ran, and the theme is not known
  // until the inline head script has run anyway.
  return (
    <Button
      variant="icon"
      aria-label={label}
      onClick={() => setLabel(themeLabel(toggleTheme()))}
    >
      <Icon name="sun" className="size-4 icon-light" />
      <Icon name="moon" className="size-4 icon-dark" />
    </Button>
  );
}
