import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { withChrome, type Chrome } from '../scripts/chrome.ts';

/**
 * An executable that starts like Chrome, announcing DevTools on stderr unless
 * told not to, then runs `behavior` with `profile` set to its
 * `--user-data-dir`. It notes that path in a `profile` file next to itself.
 */
const fakeChrome = async (
  t: TestContext,
  behavior: string,
  { announce = true } = {},
) => {
  const dir = await mkdtemp(join(tmpdir(), 'keyrove-fake-chrome-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'chrome');
  await writeFile(
    path,
    `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const profile = process.argv
  .find((arg) => arg.startsWith('--user-data-dir='))
  .slice('--user-data-dir='.length);
fs.writeFileSync(path.join(__dirname, 'profile'), profile);
${announce ? "process.stderr.write('DevTools listening on ws://127.0.0.1:1/devtools/browser/fake\\n');" : ''}
${behavior}
`,
  );
  await chmod(path, 0o755);
  return path;
};

/**
 * Keeps writing the profile for a while, as Chrome does once asked to close,
 * then exits. Like Chrome mid-shutdown, it doesn't stop for SIGTERM.
 */
const SHUTS_DOWN_SLOWLY = `
process.on('SIGTERM', () => {});
const until = Date.now() + 300;
const write = () => {
  fs.mkdirSync(path.join(profile, 'Default'), { recursive: true });
  fs.writeFileSync(path.join(profile, 'Default', 'Preferences'), '{}');
  if (Date.now() < until) setTimeout(write, 5);
  else process.exit(0);
};
write();
`;

test('withChrome removes the profile after Chrome has finished writing it', async (t) => {
  const chrome = await fakeChrome(t, SHUTS_DOWN_SLOWLY);
  let profile = '';

  await withChrome(chrome, async (browser) => {
    profile = browser.profile;
  });
  // A Chrome still running would have written the profile again by now.
  await delay(100);

  assert.ok(profile);
  assert.equal(existsSync(profile), false);
});

/** Ignores SIGTERM and never exits on its own. */
const HANGS = `
process.on('SIGTERM', () => {});
fs.mkdirSync(path.join(profile, 'Default'), { recursive: true });
setInterval(() => {}, 1000);
`;

test('withChrome kills a Chrome that does not exit in time, and removes its profile', async (t) => {
  const chrome = await fakeChrome(t, HANGS);
  let browser: Chrome | undefined;

  const started = Date.now();
  await withChrome(
    chrome,
    async (running) => {
      browser = running;
    },
    { timeout: 200 },
  );

  assert.ok(Date.now() - started < 2000);
  assert.equal(browser?.child.signalCode, 'SIGKILL');
  assert.equal(existsSync(browser!.profile), false);
});

/** Leaves a profile that can't be removed: a file in a read-only folder. */
const LEAVES_A_LOCKED_PROFILE = `
fs.mkdirSync(path.join(profile, 'Default'), { recursive: true });
fs.writeFileSync(path.join(profile, 'Default', 'Preferences'), '{}');
fs.chmodSync(path.join(profile, 'Default'), 0o555);
setTimeout(() => process.exit(0), 50);
`;

/** Lets the test remove a profile the fake Chrome locked. */
const unlockAfter = (t: TestContext, profile: () => string) =>
  t.after(async () => {
    if (!existsSync(profile())) return;
    await chmod(join(profile(), 'Default'), 0o755);
    await rm(profile(), { recursive: true, force: true });
  });

test('withChrome returns what its body did when the profile cannot be removed, and warns', async (t) => {
  const chrome = await fakeChrome(t, LEAVES_A_LOCKED_PROFILE);
  let profile = '';
  unlockAfter(t, () => profile);
  const warnings: string[] = [];

  const result = await withChrome(
    chrome,
    async (browser) => {
      profile = browser.profile;
      return 'report';
    },
    { warn: (message) => warnings.push(message) },
  );

  assert.equal(result, 'report');
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes(profile), warnings[0]);
});

test('withChrome rejects with what its body threw, not with a cleanup failure', async (t) => {
  const chrome = await fakeChrome(t, LEAVES_A_LOCKED_PROFILE);
  let profile = '';
  unlockAfter(t, () => profile);
  const warnings: string[] = [];

  await assert.rejects(
    withChrome(
      chrome,
      async (browser) => {
        profile = browser.profile;
        throw new Error('runBench failed');
      },
      { warn: (message) => warnings.push(message) },
    ),
    { message: 'runBench failed' },
  );
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes(profile), warnings[0]);
});

test('withChrome removes the profile when Chrome exits before DevTools starts', async (t) => {
  const chrome = await fakeChrome(t, 'process.exit(1);', { announce: false });

  await assert.rejects(
    withChrome(chrome, async () => {}),
    {
      message: 'Chrome exited (1) before DevTools started.',
    },
  );
  const profile = await readFile(join(dirname(chrome), 'profile'), 'utf8');
  assert.equal(existsSync(profile), false);
});

test('withChrome rejects when Chrome cannot be started', async (t) => {
  const chrome = await fakeChrome(t, '');
  await chmod(chrome, 0o644);

  await assert.rejects(
    withChrome(chrome, async () => {}),
    { code: 'EACCES' },
  );
});
