/**
 * Runs the keydown benchmark in headless Chrome and prints its results.
 *
 *   pnpm headless                          the working tree's library
 *   pnpm headless -- --ref v2.1.0          the library at a tag, branch or
 *                                          commit, saved as results/v2.1.0.json
 *   pnpm headless -- --ref v2.1.0 --ref v2.2.0
 *                                          one run per ref, each saved
 *   pnpm headless -- --name my-change      saved as results/my-change.json
 *   pnpm headless -- --record              saved as results/recorded.json
 *   pnpm headless -- --json out.json       also written to any path
 *
 * Each run builds its library (see library.ts) and a harness page against
 * it into a scratch directory, and serves that with Vite's preview server,
 * whose config sends the cross-origin isolation headers that give
 * `performance.now()` its finer resolution. Chrome drives the page over the
 * DevTools protocol with focus emulation on, so a headless window behaves as
 * a focused one. Chrome is found at CHROME_PATH, else at its usual install
 * locations.
 */

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, release, tmpdir, totalmem } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { build, preview } from 'vite';

import { toMarkdown } from '../src/report.ts';
import { describeLibrary, timingLine } from '../src/results.ts';
import type { BenchReport, BenchResults } from '../src/types.ts';
import { buildLibrary, prepareSource, reportName } from './library.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resultsDir = join(root, 'results');

const { values: args } = parseArgs({
  // pnpm passes a `--` on to the script on some paths; it separates nothing.
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    ref: { type: 'string', multiple: true, default: [] },
    name: { type: 'string' },
    record: { type: 'boolean', default: false },
    json: { type: 'string' },
  },
});

/** Where each run is saved in `results/`, if anywhere. */
const saveName = (ref: string | undefined) =>
  args.record
    ? 'recorded'
    : (args.name ?? (ref === undefined ? undefined : reportName(ref)));

const checkArgs = () => {
  if (args.ref.length > 1 && (args.name || args.record || args.json)) {
    throw new Error(
      '--name, --record and --json name one report. With several --ref, each is saved under its ref.',
    );
  }
  if (args.name && args.record) {
    throw new Error('--record saves as "recorded"; pass it or --name.');
  }
  if (args.name && !/^[\w.-]+$/.test(args.name)) {
    throw new Error(
      `--name takes letters, digits, ".", "-" and "_", not "${args.name}".`,
    );
  }
};

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

/** Starts Chrome and resolves with its DevTools WebSocket URL. */
const launch = (chrome: string, profile: string) =>
  new Promise<{ child: ChildProcess; url: string }>((ready, fail) => {
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
    child.stderr!.on('data', (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) ready({ child, url: match[1] });
    });
    child.on('exit', (code) =>
      fail(new Error(`Chrome exited (${code}) before DevTools started.`)),
    );
  });

type Message = {
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: { message: string };
};

/** The DevTools protocol over the WebSocket Node ships. */
const connect = (url: string) =>
  new Promise<{
    send: (method: string, params?: object, sessionId?: string) => Promise<any>;
    on: (method: string, listener: (params: any) => void) => () => void;
    close: () => void;
  }>((ready, fail) => {
    const socket = new WebSocket(url);
    const pending = new Map<
      number,
      { done: (value: any) => void; fail: (error: Error) => void }
    >();
    const listeners = new Set<(message: Message) => void>();
    let id = 0;

    socket.onerror = () => fail(new Error(`Cannot connect to ${url}`));
    socket.onmessage = ({ data }) => {
      const message: Message = JSON.parse(String(data));
      const call = message.id === undefined ? null : pending.get(message.id);
      if (call) {
        pending.delete(message.id!);
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
        on: (method, listener) => {
          const wrapped = (message: Message) => {
            if (message.method === method) listener(message.params);
          };
          listeners.add(wrapped);
          return () => listeners.delete(wrapped);
        },
        close: () => socket.close(),
      });
  });

/** A line that rewrites itself on a terminal, and stays quiet elsewhere. */
const status = (text: string) => {
  if (process.stderr.isTTY) process.stderr.write(`\r\x1b[2K${text}`);
};

/** Builds the harness page against `library`, into `outDir`. */
const buildHarness = (library: string, outDir: string) =>
  build({
    configFile: false,
    logLevel: 'warn',
    root,
    resolve: { alias: { '@mixedrays/keyrove': library } },
    build: {
      outDir,
      emptyOutDir: true,
      minify: false,
      rolldownOptions: { input: { harness: join(root, 'harness.html') } },
    },
  });

/** Serves a built harness and runs it in a fresh headless Chrome. */
const runHarness = async (chrome: string, harness: string, label: string) => {
  // The bench's own config, for its headers, serving the scratch build.
  const server = await preview({
    root,
    logLevel: 'warn',
    build: { outDir: harness },
    preview: { host: '127.0.0.1', port: 0, open: false },
  });
  const origin = server.resolvedUrls?.local[0];
  if (!origin) throw new Error('The preview server did not report its URL.');

  const profile = await mkdtemp(join(tmpdir(), 'keyrove-bench-chrome-'));
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
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send(
      'Emulation.setFocusEmulationEnabled',
      { enabled: true },
      sessionId,
    );
    await cdp.send('Runtime.addBinding', { name: 'benchProgress' }, sessionId);
    cdp.on('Runtime.bindingCalled', ({ name, payload }) => {
      if (name === 'benchProgress') status(`${label}  ${payload}`);
    });

    const loaded = new Promise((done) => {
      const stop = cdp.on('Page.loadEventFired', () => {
        stop();
        done(undefined);
      });
    });
    await cdp.send(
      'Page.navigate',
      { url: new URL('harness.html', origin).href },
      sessionId,
    );
    await loaded;

    const evaluation = await cdp.send(
      'Runtime.evaluate',
      {
        expression: `window.runBench({
          onProgress: (p) => benchProgress(p.completed + '/' + p.total + '  ' + p.fixture),
        })`,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    );
    status('');
    if (evaluation.exceptionDetails) {
      throw new Error(evaluation.exceptionDetails.exception?.description);
    }

    return {
      results: evaluation.result.value as BenchResults,
      browser: `${version.product} (headless), V8 ${version.jsVersion}`,
    };
  } finally {
    await cdp.send('Browser.close').catch(() => {});
    cdp.close();
    child.kill();
    await server.close();
    await rm(profile, { recursive: true, force: true });
  }
};

/** Builds, runs and reports one library: the working tree's, or `ref`'s. */
const benchmark = async (chrome: string, ref: string | undefined) => {
  const label = ref ?? 'working tree';
  const scratch = await mkdtemp(join(tmpdir(), 'keyrove-bench-'));

  try {
    status(`${label}  building`);
    const source = await prepareSource(ref, join(scratch, 'source'));
    const library = await buildLibrary(source.root, join(scratch, 'library'));
    await buildHarness(library, join(scratch, 'harness'));

    const { results, browser } = await runHarness(
      chrome,
      join(scratch, 'harness'),
      label,
    );
    const cpu = cpus();
    const report: BenchReport = {
      environment: {
        Library: describeLibrary(source.info),
        Browser: browser,
        OS: `${platform()} ${release()} ${arch()}`,
        CPU: `${cpu[0]?.model ?? 'unknown'} × ${cpu.length}`,
        Memory: `${Math.round(totalmem() / 2 ** 30)} GB`,
        Node: process.version,
        'Cross-origin isolated': results.crossOriginIsolated,
        Timing: timingLine(results.options),
        Date: new Date().toISOString().slice(0, 10),
      },
      library: source.info,
      results,
    };

    return { label, report };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
};

const main = async () => {
  checkArgs();
  const chrome = findChrome();
  const refs: (string | undefined)[] = args.ref.length ? args.ref : [undefined];
  const saved: string[] = [];

  for (const ref of refs) {
    const { label, report } = await benchmark(chrome, ref);

    if (refs.length > 1) console.log(`# ${label}\n`);
    console.log(toMarkdown(report));
    if (refs.length > 1) console.log('');

    const json = `${JSON.stringify(report, null, 2)}\n`;
    const name = saveName(ref);
    if (name) {
      const path = join(resultsDir, `${name}.json`);
      await writeFile(path, json);
      saved.push(relative(process.env.INIT_CWD ?? process.cwd(), path));
    }
    // pnpm runs a script from its package, so a relative path is taken from
    // where the command was typed instead.
    if (args.json) {
      await writeFile(
        resolve(process.env.INIT_CWD ?? process.cwd(), args.json),
        json,
      );
    }
  }

  if (saved.length) {
    console.error(
      `\nSaved ${saved.join(', ')}. Compare reports with pnpm bench.`,
    );
  }
};

main().catch((error: Error) => {
  status('');
  console.error(error.message);
  process.exit(1);
});
