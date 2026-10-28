// The network entry point for reads (ingest, gbif:register). Sequential, paced (≤ 2 req/s), retried with backoff, one
// stderr line per attempt. gbif:register's single POST uses fetch itself (never retried) with USER_AGENT and logRequest.
import { createHash } from "node:crypto";

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

// One paced, retried request; returns the 200 body. Retries network errors, timeouts, 429 and 5xx (5 attempts, backoff
// 1, 2, 4, 8 s); any other status throws at once.
async function getOk(url: string, accept: string, { timeoutMs = DEFAULT_TIMEOUT_MS, ...init }: GetJsonInit): Promise<Uint8Array> {
  const method = init.method ?? "GET";
  const headers = { "User-Agent": USER_AGENT, Accept: accept, ...(init.headers as Record<string, string>) };
  const text = (body: Uint8Array) => new TextDecoder().decode(body).slice(0, 300);
  for (let attempt = 1; ; attempt++) {
    await sleep(Math.max(0, lastStart + MIN_GAP_MS - Date.now()));
    lastStart = Date.now();
    let status: number | string;
    let retryAfter: number | null = null;
    let body = new Uint8Array();
    try {
      const res = await fetch(url, { ...init, method, headers, signal: AbortSignal.timeout(timeoutMs) });
      status = res.status;
      body = new Uint8Array(await res.arrayBuffer());
      retryAfter = retryAfterMs(res.headers.get("retry-after"));
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
    if (status !== 200) throw new Error(`${method} ${url}: HTTP ${status}: ${text(body)}`);
    return body;
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
