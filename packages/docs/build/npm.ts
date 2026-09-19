/**
 * What npm says about the published library: the version `latest` points at,
 * and what that version weighs in a browser bundle.
 *
 * Asked at build time rather than read off the workspace manifest, which can
 * lag the registry — release-it commits its version bump on `main`, so any
 * other branch still carries the previous release's number.
 *
 * The size is bundlejs's figure, minified and gzipped, for the same version.
 * It is the service the README's size badge is drawn by, so the site and the
 * badge give one number.
 *
 * Either request can fail — a build offline, a service down — and neither is
 * worth failing the build over. What could not be fetched comes back missing,
 * with a warning, and the page leaves that fact out rather than stating a
 * stale one.
 */

const REGISTRY = 'https://registry.npmjs.org';
const BUNDLEJS = 'https://deno.bundlejs.com';

/** bundlejs builds a version it has not seen before on request, which is slow. */
const TIMEOUT_MS = 15_000;

export type Published = {
  version: string;
  /** Minified and gzipped, in bytes. */
  gzipSize?: number;
};

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);

  return response.json();
};

const warn = (what: string, error: unknown) =>
  console.warn(
    `[docs] could not fetch ${what}, so the landing page leaves it out: ${error instanceof Error ? error.message : String(error)}`,
  );

const fetchVersion = async (name: string) => {
  const manifest = (await fetchJson(`${REGISTRY}/${name}/latest`)) as {
    version?: unknown;
  };
  if (typeof manifest.version !== 'string') {
    throw new Error('the registry answered without a version');
  }

  return manifest.version;
};

const fetchGzipSize = async (name: string, version: string) => {
  const url = new URL(BUNDLEJS);
  url.searchParams.set('q', `${name}@${version}`);

  const result = (await fetchJson(url.href)) as {
    size?: { rawCompressedSize?: unknown };
  };
  const size = result.size?.rawCompressedSize;
  if (typeof size !== 'number') {
    throw new Error('bundlejs answered without a size');
  }

  return size;
};

/** The release npm serves for `name`, or nothing if the registry is unreachable. */
export const loadPublished = async (
  name: string,
): Promise<Published | undefined> => {
  let version: string;
  try {
    version = await fetchVersion(name);
  } catch (error) {
    warn(`the published version of ${name}`, error);
    return undefined;
  }

  try {
    return { version, gzipSize: await fetchGzipSize(name, version) };
  } catch (error) {
    warn(`the bundle size of ${name}@${version}`, error);
    return { version };
  }
};
