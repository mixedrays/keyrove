import { useState } from 'react';

import { Icon } from '@/components/icon.tsx';
import { Button } from '@/components/ui/button.tsx';
import { themeLabel, toggleTheme } from '@/theme.ts';

export function ThemeToggle() {
  const [label, setLabel] = useState('Switch between light and dark theme');

  // Both glyphs ship and CSS picks, so the button isn't empty before the bundle.
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
