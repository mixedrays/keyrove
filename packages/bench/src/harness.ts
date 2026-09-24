import { runBench } from './keydown.ts';
import type { RunBench } from './types.ts';

declare global {
  interface Window {
    /** Called by scripts/run.ts over DevTools, and by the UI into its frame. */
    runBench?: RunBench;
  }
}

window.runBench = runBench;
