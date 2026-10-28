// H1 (plan D14 SC3): Retry-After. Written before the code, seen failing first. Offline: a local server on port 0.
// Failure modes: a Retry-After above 60 s (seconds or an HTTP date) is silently shortened and retried early, burning
// attempts against the provider's request; one at or under 60 s is ignored in favour of the backoff.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type OutgoingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { getJson } from "./http.ts";

// Serves `replies` in order (the last one repeats); fn gets the URL and a hit counter.
async function withServer(replies: { status: number; headers?: OutgoingHttpHeaders; body?: string }[],
  fn: (url: string, hits: () => number) => Promise<void>): Promise<void> {
  let n = 0;
  const server = createServer((_req, res) => {
    const r = replies[Math.min(n++, replies.length - 1)];
    res.writeHead(r.status, { "content-type": "application/json", ...r.headers }).end(r.body ?? "{}");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}/x`, () => n);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("H1 a Retry-After above 60 s stops at once, saying how long and to re-run later", async () => {
  await withServer([{ status: 429, headers: { "retry-after": "120" } }], async (url, hits) => {
    await assert.rejects(getJson(url), /429: asked to wait 120 s, more than 60 s: re-run later/);
    assert.equal(hits(), 1);
  });
  const date = new Date(Date.now() + 3_600_000).toUTCString();
  await withServer([{ status: 503, headers: { "retry-after": date } }], async (url, hits) => {
    await assert.rejects(getJson(url), /503: asked to wait 3[56]\d\d s, more than 60 s: re-run later/);
    assert.equal(hits(), 1);
  });
});

test("H1 a Retry-After at or under 60 s is honoured, then the request succeeds", async () => {
  await withServer([{ status: 429, headers: { "retry-after": "2" } }, { status: 200, body: '{"ok":true}' }], async (url, hits) => {
    const start = Date.now();
    assert.deepEqual(await getJson(url), { ok: true });
    assert.ok(Date.now() - start >= 1900, "waited the 2 s asked, not the 1 s backoff");
    assert.equal(hits(), 2);
  });
});
