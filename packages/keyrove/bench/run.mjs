/**
 * Runs the keydown benchmark in headless Chrome and prints its results.
 *
 *   pnpm bench                     build, then run with the default settings
 *   pnpm bench -- --json out.json  also write the raw results
 *   pnpm bench -- --serve          only serve the page, to run it by hand in
 *                                  another browser
 *
 * Chrome is found at CHROME_PATH, else at its usual install locations. The
 * page is served locally with cross-origin isolation, which gives
 * `performance.now()` its finer resolution, and driven over the DevTools
 * protocol with focus emulation on, so a headless window behaves as a
 * focused one. No dependency beyond Node and Chrome.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { arch, cpus, platform, release, tmpdir, totalmem } from 'node:os';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jsonOut = process.argv.includes('--json')
  ? process.argv[process.argv.indexOf('--json') + 1]
  : null;
const serveOnly = process.argv.includes('--serve');

const findChrome = () => {
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

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.map': 'application/json',
};

/** Serves the package directory: the bench page and the built `dist`. */
const serve = () =>
  new Promise((ready) => {
    const server = createServer(async (request, response) => {
      const path = normalize(
        join(root, new URL(request.url, 'http://x').pathname),
      );
      if (!path.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      try {
        const body = await readFile(path);
        response.writeHead(200, {
          'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
        });
        response.end(body);
      } catch {
        response.writeHead(404).end();
      }
    });
    server.listen(0, '127.0.0.1', () => ready(server));
  });

/** Starts Chrome and resolves with its DevTools WebSocket URL. */
const launch = (chrome, profile) =>
  new Promise((ready, fail) => {
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
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) ready({ child, url: match[1] });
    });
    child.on('exit', (code) =>
      fail(new Error(`Chrome exited (${code}) before DevTools started.`)),
    );
  });

/** The DevTools protocol over the WebSocket Node ships. */
const connect = (url) =>
  new Promise((ready, fail) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    const listeners = new Set();
    let id = 0;

    socket.onerror = () => fail(new Error(`Cannot connect to ${url}`));
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      const call = pending.get(message.id);
      if (call) {
        pending.delete(message.id);
        if (message.error) call.fail(new Error(message.error.message));
        else call.done(message.result);
      } else {
        for (const listener of listeners) listener(message);
      }
    };
    socket.onopen = () =>
      ready({
        send: (method, params = {}, sessionId) =>
          new Promise((done, fail) => {
            pending.set(++id, { done, fail });
            socket.send(JSON.stringify({ id, method, params, sessionId }));
          }),
        once: (method) =>
          new Promise((done) => {
            const listener = (message) => {
              if (message.method !== method) return;
              listeners.delete(listener);
              done(message.params);
            };
            listeners.add(listener);
          }),
        close: () => socket.close(),
      });
  });

const format = (value) => value.toFixed(2);

/** The results as Markdown: environment, fixtures, then one table per section. */
const report = ({ environment, results }) => {
  const lines = [
    '## Environment',
    '',
    ...Object.entries(environment).map(
      ([name, value]) => `- ${name}: ${value}`,
    ),
    '',
    '## Fixtures',
    '',
    '| Fixture | Groups | Items | Focus keys | Grid | Elements | Build (ms) |',
    '| ------- | -----: | ----: | ---------: | ---- | -------: | ---------: |',
    ...results.fixtures.map(
      (fixture) =>
        `| ${fixture.name} | ${fixture.groups} | ${fixture.groups * 20} | ${fixture.focusKeys ?? 0} | ${fixture.grid ?? '-'} | ${fixture.elements} | ${format(fixture.buildMs)} |`,
    ),
  ];

  for (const section of new Set(results.cases.map((each) => each.section))) {
    lines.push(
      '',
      `## ${section}`,
      '',
      '| Fixture | Case | Result | Median (µs) | p10–p90 (µs) | Batch |',
      '| ------- | ---- | ------ | ----------: | -----------: | ----: |',
      ...results.cases
        .filter((each) => each.section === section)
        .map(
          (each) =>
            `| ${each.fixture.name} | ${each.label} | ${each.result} | ${format(each.median)} | ${format(each.p10)}–${format(each.p90)} | ${each.batch} |`,
        ),
    );
  }

  return lines.join('\n');
};

const main = async () => {
  if (!existsSync(join(root, 'dist', 'index.js'))) {
    throw new Error('dist/index.js is missing. Run `pnpm build` first.');
  }

  const server = await serve();

  if (serveOnly) {
    const { port } = server.address();
    console.log(
      `Serving http://127.0.0.1:${port}/bench/index.html — press Run there. Ctrl+C stops.`,
    );
    return;
  }

  const chrome = findChrome();
  const profile = await mkdtemp(join(tmpdir(), 'keyrove-bench-'));
  const { child, url } = await launch(chrome, profile);
  const cdp = await connect(url);

  try {
    const version = await cdp.send('Browser.getVersion');
    const { targetId } = await cdp.send('Target.createTarget', {
      url: 'about:blank',
    });
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send(
      'Emulation.setFocusEmulationEnabled',
      { enabled: true },
      sessionId,
    );

    const loaded = cdp.once('Page.loadEventFired');
    const { port } = server.address();
    await cdp.send(
      'Page.navigate',
      { url: `http://127.0.0.1:${port}/bench/index.html` },
      sessionId,
    );
    await loaded;

    const evaluation = await cdp.send(
      'Runtime.evaluate',
      {
        expression: 'window.runBench()',
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    );
    if (evaluation.exceptionDetails) {
      throw new Error(evaluation.exceptionDetails.exception?.description);
    }

    const results = evaluation.result.value;
    const cpu = cpus();
    const environment = {
      Browser: `${version.product} (headless), V8 ${version.jsVersion}`,
      OS: `${platform()} ${release()} ${arch()}`,
      CPU: `${cpu[0]?.model ?? 'unknown'} × ${cpu.length}`,
      Memory: `${Math.round(totalmem() / 2 ** 30)} GB`,
      Node: process.version,
      'Cross-origin isolated': results.crossOriginIsolated,
      Timing: `${results.options.warmupMs} ms warmup, then ${results.options.samples} batches of ≥ ${results.options.minBatchMs} ms per case`,
      Date: new Date().toISOString().slice(0, 10),
    };

    console.log(report({ environment, results }));
    if (jsonOut) {
      await writeFile(
        jsonOut,
        JSON.stringify({ environment, results }, null, 2),
      );
    }
  } finally {
    await cdp.send('Browser.close').catch(() => {});
    cdp.close();
    child.kill();
    server.close();
    await rm(profile, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
