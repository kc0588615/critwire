// The network entry point for reads (ingest, gbif:register). Sequential, paced (≤ 2 req/s), retried with backoff, one
// stderr line per attempt. GBIF's single POSTs (gbif/post.ts) use fetch themselves (never retried) with USER_AGENT and logRequest.
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

export const USER_AGENT = "critwire-ingest/1.0 (+https://critwire.com; https://github.com/kc0588615/critwire)";
const MIN_GAP_MS = 500;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 5;
const RETRY_AFTER_CAP_MS = 60_000;

let lastStart = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry-After is seconds or an HTTP date; capped at 60 s. null when absent or unparseable.
function retryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const ms = /^\d+$/.test(header.trim()) ? Number(header) * 1000 : Date.parse(header) - Date.now();
  return Number.isFinite(ms) ? Math.min(Math.max(ms, 0), RETRY_AFTER_CAP_MS) : null;
}

// The request log line on stderr: start time, status, duration, attempt, method, url (never headers or bodies).
export function logRequest(start: number, status: number | string, attempt: number, method: string, url: string): void {
  console.error(`${new Date(start).toISOString()}, ${status}, ${Date.now() - start}ms, ${attempt}, ${method}, ${url}`);
}

// A fetch that threw, as a log status: "timeout" or "network <message>".
export const fetchFailure = (error: unknown) =>
  (error as Error).name === "TimeoutError" ? "timeout" : `network ${(error as Error).message}`;

export interface GetJsonInit extends RequestInit { timeoutMs?: number }

// One paced, retried request; returns `read` of the 200 response (default: the body). Retries network errors (also
// while `read` streams the body), timeouts, 429 and 5xx (5 attempts, backoff 1, 2, 4, 8 s); any other status throws at once.
async function getOk<T = Uint8Array>(url: string, accept: string, { timeoutMs = DEFAULT_TIMEOUT_MS, ...init }: GetJsonInit,
  read: (res: Response) => Promise<T> = async (res) => new Uint8Array(await res.arrayBuffer()) as T): Promise<T> {
  const method = init.method ?? "GET";
  const headers = { "User-Agent": USER_AGENT, Accept: accept, ...(init.headers as Record<string, string>) };
  const text = (body: Uint8Array) => new TextDecoder().decode(body).slice(0, 300);
  for (let attempt = 1; ; attempt++) {
    await sleep(Math.max(0, lastStart + MIN_GAP_MS - Date.now()));
    lastStart = Date.now();
    let status: number | string;
    let retryAfter: number | null = null;
    let body = new Uint8Array();
    let result: { value: T } | undefined;
    try {
      const res = await fetch(url, { ...init, method, headers, signal: AbortSignal.timeout(timeoutMs) });
      status = res.status;
      retryAfter = retryAfterMs(res.headers.get("retry-after"));
      if (status === 200) result = { value: await read(res) };
      else body = new Uint8Array(await res.arrayBuffer());
    } catch (error) {
      status = fetchFailure(error);
    }
    logRequest(lastStart, status, attempt, method, url);
    const retryable = typeof status === "string" || status === 429 || status >= 500;
    if (retryable) {
      if (attempt >= MAX_ATTEMPTS) throw new Error(`${method} ${url}: ${status} after ${attempt} attempts: ${text(body)}`);
      await sleep(retryAfter ?? 1000 * 2 ** (attempt - 1));
      continue;
    }
    if (!result) throw new Error(`${method} ${url}: HTTP ${status}: ${text(body)}`);
    return result.value;
  }
}

// Fetches JSON (getOk's retries); a non-JSON body throws.
export async function getJson(url: string, init: GetJsonInit = {}): Promise<unknown> {
  const body = new TextDecoder().decode(await getOk(url, "application/json", init));
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${init.method ?? "GET"} ${url}: HTTP 200, body is not JSON: ${body.slice(0, 300)}`);
  }
}

export interface GetBytesInit extends GetJsonInit { sha256: string }

// Fetches a pinned file (getOk's retries); throws unless the body's sha256 equals the pin.
export async function getBytes(url: string, { sha256, ...init }: GetBytesInit): Promise<Uint8Array> {
  const body = await getOk(url, "*/*", init);
  const got = createHash("sha256").update(body).digest("hex");
  if (got !== sha256) throw new Error(`${init.method ?? "GET"} ${url}: sha256 ${got} ≠ pinned ${sha256}`);
  return body;
}

// sha256 null: only the size is pinned (a file seen for the first time; the caller hashes it, sha256File).
export interface DownloadInit extends GetJsonInit { sha256: string | null; bytes: number }

// Streams a pinned file to `path` (getOk's retries), hashing as it writes. Throws unless the file's sha256 and size
// equal the pins; on any failure no file is left at `path`.
export async function downloadFile(url: string, path: string, { sha256, bytes, ...init }: DownloadInit): Promise<void> {
  try {
    const got = await getOk(url, "*/*", init, async (res) => {
      if (!res.body) throw new Error("no body");
      const hash = createHash("sha256");
      let size = 0;
      const tap = new Transform({ transform(chunk: Buffer, _enc, done) { hash.update(chunk); size += chunk.length; done(null, chunk); } });
      await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), tap, createWriteStream(path));
      return { sha256: hash.digest("hex"), bytes: size };
    });
    const method = init.method ?? "GET";
    if (got.bytes !== bytes) throw new Error(`${method} ${url}: ${got.bytes} bytes ≠ pinned ${bytes}`);
    if (sha256 !== null && got.sha256 !== sha256) throw new Error(`${method} ${url}: sha256 ${got.sha256} ≠ pinned ${sha256}`);
  } catch (error) {
    await rm(path, { force: true });
    throw error;
  }
}

// A file's sha256, streamed.
export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}
