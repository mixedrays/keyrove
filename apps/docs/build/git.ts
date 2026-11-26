import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

// A CI checkout stamps mtimes at clone time, so only git knows. Uncertain
// answers give nothing: Google ignores `lastmod` once it catches a wrong one.

/** Separates a commit's date from the paths it touched; a path cannot hold one. */
const RECORD = '\x1e';

/**
 * One newest-first `git log`, so a path's first appearance is its last change.
 * Merges list no paths, so a page dates from the commit that wrote it.
 */
export const loadLastModified = async (
  dir: string,
): Promise<Map<string, string>> => {
  const dates = new Map<string, string>();

  let root: string;
  let log: string;
  try {
    const top = await run('git', ['rev-parse', '--show-toplevel'], {
      cwd: dir,
    });
    root = top.stdout.trim();

    const result = await run(
      'git',
      [
        // Verbatim, not octal-escaped, to compare against real filenames.
        '-c',
        'core.quotePath=false',
        'log',
        `--pretty=format:${RECORD}%cI`,
        '--name-only',
        '--',
        dir,
      ],
      { cwd: dir, maxBuffer: 32 * 1024 * 1024 },
    );
    log = result.stdout;
  } catch {
    // No git, or history too shallow: no `lastmod` rather than a made-up one.
    return dates;
  }

  let date = '';
  for (const line of log.split('\n')) {
    if (line === '') continue;

    if (line.startsWith(RECORD)) {
      date = line.slice(RECORD.length);
      continue;
    }

    const file = path.join(root, line);
    if (!dates.has(file)) dates.set(file, date);
  }

  return dates;
};
