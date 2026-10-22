// The network entry point for reads (ingest, gbif:register). Sequential, paced (≤ 2 req/s), retried with backoff, one
// stderr line per attempt. gbif:register's single POST uses fetch itself (never retried) with USER_AGENT and logRequest.
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

// Fetches JSON. Retries network errors, timeouts, 429 and 5xx (5 attempts, backoff 1, 2, 4, 8 s);
// any other status or a non-JSON body throws at once.
export async function getJson(url: string, { timeoutMs = DEFAULT_TIMEOUT_MS, ...init }: GetJsonInit = {}): Promise<unknown> {
  const method = init.method ?? "GET";
  const headers = { "User-Agent": USER_AGENT, Accept: "application/json", ...(init.headers as Record<string, string>) };
  for (let attempt = 1; ; attempt++) {
    await sleep(Math.max(0, lastStart + MIN_GAP_MS - Date.now()));
    lastStart = Date.now();
    let status: number | string;
    let retryAfter: number | null = null;
    let body = "";
    try {
      const res = await fetch(url, { ...init, method, headers, signal: AbortSignal.timeout(timeoutMs) });
      status = res.status;
      body = await res.text();
      retryAfter = retryAfterMs(res.headers.get("retry-after"));
    } catch (error) {
      status = fetchFailure(error);
    }
    logRequest(lastStart, status, attempt, method, url);
    const retryable = typeof status === "string" || status === 429 || status >= 500;
    if (retryable) {
      if (attempt >= MAX_ATTEMPTS) throw new Error(`${method} ${url}: ${status} after ${attempt} attempts: ${body.slice(0, 300)}`);
      await sleep(retryAfter ?? 1000 * 2 ** (attempt - 1));
      continue;
    }
    if (status !== 200) throw new Error(`${method} ${url}: HTTP ${status}: ${body.slice(0, 300)}`);
    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`${method} ${url}: HTTP ${status}, body is not JSON: ${body.slice(0, 300)}`);
    }
  }
}
