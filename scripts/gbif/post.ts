// The one never-retried POST to GBIF (gbif:register's derived dataset, ingest gbif-sample's download request): its own
// fetch (getJson retries), one log line like getJson's. classifyPost (register.ts) reads its outcome.
import { fetchFailure, logRequest, USER_AGENT } from "../http.ts";
import type { PostOutcome } from "./register.ts";

const POST_TIMEOUT_MS = 60_000;

// POSTs `body` as JSON with Basic auth; a thrown fetch becomes { error }, never a throw.
export async function postOnce(url: string, body: unknown, { authorization, accept = "application/json" }: { authorization: string; accept?: string }): Promise<PostOutcome> {
  const start = Date.now();
  let outcome: PostOutcome;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: authorization, "User-Agent": USER_AGENT, Accept: accept, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
    });
    outcome = { status: res.status, body: await res.text() };
  } catch (error) {
    outcome = { error: fetchFailure(error) };
  }
  logRequest(start, "error" in outcome ? outcome.error : outcome.status, 1, "POST", url);
  return outcome;
}

// The Authorization header for GBIF's Basic auth.
export const basicAuth = (user: string, password: string) => `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
