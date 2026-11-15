/**
 * Headless Chrome for the runner: finding it, running it in a fresh profile,
 * and cleaning up after it.
 *
 * Chrome answers `Browser.close` before it exits, and keeps writing its
 * profile until it does, so the profile is removed only once the process is
 * gone. Cleanup never throws: a run that finished keeps its report, and an
 * error from the run is never replaced by one from cleaning up.
 */

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

/** Chrome or Chromium: at CHROME_PATH, else at its usual install locations. */
export const findChrome = () => {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const found = candidates.find((path) => path && existsSync(path));
  if (found) return found;

  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium']) {
    const which = spawnSync('which', [name], { encoding: 'utf8' });
    if (which.status === 0) return which.stdout.trim();
  }

  throw new Error('Chrome not found. Set CHROME_PATH to its executable.');
};

/** A running Chrome, as `withChrome` hands it to its body. */
export type Chrome = {
  child: ChildProcess;
  /** Its DevTools WebSocket URL. */
  url: string;
  /** Its `--user-data-dir`, removed once Chrome has exited. */
  profile: string;
};

type Launched = Chrome & { exited: Promise<void> };

/** Starts Chrome and resolves once its DevTools are listening. */
const launch = (chrome: string, profile: string) =>
  new Promise<Launched>((ready, fail) => {
    const child = spawn(chrome, [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      'about:blank',
    ]);
    // Made at spawn time, so no exit goes unseen.
    const exited = new Promise<void>((done) => {
      child.once('exit', () => done());
      child.once('error', () => done());
    });
    let stderr = '';
    child.stderr!.on('data', (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) ready({ child, exited, url: match[1], profile });
    });
    child.on('exit', (code) =>
      fail(new Error(`Chrome exited (${code}) before DevTools started.`)),
    );
    child.on('error', fail);
  });

/** Whether Chrome exits within `timeout` ms. */
const exitsWithin = (chrome: Launched, timeout: number) =>
  Promise.race([
    chrome.exited.then(() => true),
    // Unreferenced, so a pending wait doesn't keep Node running.
    delay(timeout, false, { ref: false }),
  ]);

/** Waits for Chrome to exit, and kills it if it doesn't in time. */
const stop = async (chrome: Launched, timeout: number) => {
  if (await exitsWithin(chrome, timeout)) return;
  chrome.child.kill('SIGKILL');
  await exitsWithin(chrome, timeout);
};

export type Warn = (message: string) => void;

const warnOnStderr: Warn = (message) => console.error(`Warning: ${message}`);

/** Removes `dir`, or warns that it is left behind. Never throws. */
export const removeDir = async (dir: string, warn: Warn = warnOnStderr) => {
  try {
    // Retries what a process still letting go of a file causes: ENOTEMPTY,
    // EBUSY and EPERM.
    await rm(dir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  } catch (error) {
    warn(`Could not remove ${dir}: ${(error as Error).message}`);
  }
};

/**
 * Runs `body` with a headless Chrome in a fresh profile. Afterwards, waits up
 * to `timeout` ms for Chrome to exit (the body asks it to, with
 * `Browser.close`), kills it if it hasn't, then removes the profile. If the
 * profile can't be removed, `warn` names it and the body's result stands.
 */
export const withChrome = async <T>(
  path: string,
  body: (chrome: Chrome) => Promise<T>,
  {
    timeout = 5000,
    warn = warnOnStderr,
  }: { timeout?: number; warn?: Warn } = {},
): Promise<T> => {
  const profile = await mkdtemp(join(tmpdir(), 'keyrove-bench-chrome-'));
  let chrome: Launched | undefined;
  try {
    chrome = await launch(path, profile);
    return await body(chrome);
  } finally {
    if (chrome) await stop(chrome, timeout);
    await removeDir(profile, warn);
  }
};
