import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * When each file under `content/` last changed, according to git.
 *
 * The sitemap wants a `lastmod`, and the filesystem cannot give one: a CI
 * checkout stamps every file with the time it cloned, so mtimes would say the
 * whole site changed on every deploy. The commit history is the only record of
 * when a page's text actually moved.
 *
 * Google ignores the field outright once a site is caught reporting it
 * carelessly, so anything uncertain here answers with nothing rather than with
 * a guess — a missing `lastmod` costs nothing, a wrong one costs the field.
 */

/** Separates a commit's date from the paths it touched; a path cannot hold one. */
const RECORD = '\x1e';

/**
 * Maps absolute file path → ISO 8601 commit date, for everything under `dir`.
 *
 * One `git log` for the whole directory rather than one per page: the log is
 * newest-first, so the first time a path appears is the last time it changed.
 * Merge commits list no paths of their own, so a page dates from the commit
 * that wrote it rather than from the merge that landed it.
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
        // Paths are compared against real filenames, so they have to come back
        // verbatim rather than octal-escaped.
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
    // No git, no repository, or a history too shallow to answer — every page
    // goes without a `lastmod` rather than with a date the build made up.
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
