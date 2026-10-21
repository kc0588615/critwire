// Serving (plan §9 serving): Range, CORS preflight and cross-origin fetches against the local copy of the live
// Caddy block, and a drift check of that copy against the ops Caddyfile.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { accessLog, distPath, repoPath, SECOND_ORIGIN, tag } from "./helpers.ts";

const OPS_CADDYFILE = "/srv/critter-ai/ops/config/etc/caddy/Caddyfile";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "Range",
  "access-control-expose-headers": "Content-Range, Content-Length, Accept-Ranges",
};

// A site block's directives, trimmed, without comments and the lines the E2E copy changes (root, the log block).
function siteBlock(caddyfile: string, address: string): string[] {
  const lines = caddyfile.split("\n");
  const start = lines.indexOf(`${address} {`);
  if (start < 0) throw new Error(`no "${address} {" block`);
  const out: string[] = [];
  let inLog = false;
  for (const raw of lines.slice(start + 1, lines.indexOf("}", start))) {
    const line = raw.trim();
    if (inLog) { inLog = line !== "}"; continue; }
    if (line === "log {") { inLog = true; continue; }
    if (line && !line.startsWith("#") && !line.startsWith("root ")) out.push(line);
  }
  return out;
}

test("the E2E block is a copy of the live critwire.com block", async () => {
  const ops = await readFile(OPS_CADDYFILE, "utf8").catch(() => null);
  test.skip(ops === null, `${OPS_CADDYFILE} is not readable here (only on the VPS)`);
  const e2e = await readFile(repoPath("e2e/Caddyfile"), "utf8");
  expect(siteBlock(e2e, "http://127.0.0.1:3100")).toEqual(siteBlock(ops!, "critwire.com"));
});

for (const file of ["species.parquet", "species.csv"]) {
  test(`Range on ${file}: 206, exact Content-Range and bytes, not encoded`, async ({ request }) => {
    const bytes = await readFile(distPath(`v1/${file}`));
    const res = await request.get(`/v1/${file}`, { headers: { Range: "bytes=100-199", "Accept-Encoding": "zstd, gzip" } });
    expect(res.status()).toBe(206);
    expect(res.headers()["content-range"]).toBe(`bytes 100-199/${bytes.length}`);
    expect(res.headers()["content-encoding"]).toBeUndefined();
    expect((await res.body()).equals(bytes.subarray(100, 200))).toBe(true);
  });
}

test("OPTIONS preflight: 204 with every CORS header", async ({ request }) => {
  const res = await request.fetch("/v1/species.parquet", {
    method: "OPTIONS",
    headers: { Origin: SECOND_ORIGIN, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "range" },
  });
  expect(res.status()).toBe(204);
  expect(res.headers()).toMatchObject(CORS);
});

test("cross-origin fetch with a preflight: suffix Range from a second origin", async ({ page }) => {
  const size = (await readFile(distPath("v1/species.parquet"))).length;
  const uri = `/v1/species.parquet?${tag()}`;
  await page.goto(`${SECOND_ORIGIN}/`);
  // bytes=-8 is not a CORS-safelisted Range, so Chromium preflights it.
  const got = await page.evaluate(async (url) => {
    const res = await fetch(url, { headers: { Range: "bytes=-8" } });
    const body = new Uint8Array(await res.arrayBuffer());
    return {
      status: res.status,
      length: body.length,
      tail: String.fromCharCode(...body.slice(-4)),
      contentRange: res.headers.get("content-range"),
      contentLength: res.headers.get("content-length"),
      acceptRanges: res.headers.get("accept-ranges"),
    };
  }, `http://127.0.0.1:3100${uri}`);
  expect(got).toEqual({
    status: 206, length: 8, tail: "PAR1",
    contentRange: `bytes ${size - 8}-${size - 1}/${size}`, contentLength: "8", acceptRanges: "bytes",
  });
  await expect.poll(async () => (await accessLog()).filter((e) => e.request.uri === uri).map((e) =>
    [e.request.method, e.status, e.request.headers.Origin?.[0]])).toEqual([["OPTIONS", 204, SECOND_ORIGIN], ["GET", 206, SECOND_ORIGIN]]);
});

test("cross-origin fetch without a preflight: species.json parses", async ({ page }) => {
  await page.goto(`${SECOND_ORIGIN}/`);
  const length = await page.evaluate(async () => (await (await fetch("http://127.0.0.1:3100/v1/species.json")).json()).length);
  const data = JSON.parse(await readFile(distPath("v1/species.json"), "utf8"));
  expect(length).toBe(data.length);
});
