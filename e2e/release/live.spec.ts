// The release smoke (plan S26, Verification "Release smoke"), against RELEASE_ORIGIN, never run by the default config:
// every dist/ file is served with dist's bytes (each page at its folder URL), the .wasm files as application/wasm, and
// f3's first browser block shows its recorded result; and (L4) the origin's s4.py, run in .venv-learn after the origin's
// loader, prints s4's recorded lesson outputs; and (L5 T8) each star file hashes as the served star manifest says, and
// c1's served feed is valid against its served schema and credits as the served data manifest and datasets.csv say.
// dist/ must be the build of the released commit.
// Run: RELEASE_ORIGIN=https://critwire.com E2E_ARTIFACTS=<dir> pnpm exec playwright test -c playwright.release.config.ts
import { expect, test } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { promisify } from "node:util";
import { loadEnv } from "../../scripts/env.ts";
import { assembleDownloads } from "../../scripts/learn/assemble.ts";
import { CHECKED_DIR, PY_CONNECT_ID } from "../../scripts/learn/blocks.ts";
import { FEED, feedAttributionErrors } from "../../scripts/learn/feed.ts";
import type { StarManifest } from "../../scripts/learn/star-check.ts";
import { takeLabLock } from "../../scripts/learn/cleanup.ts";
import { readCourse } from "../../scripts/learn/course-files.ts";
import { learnObjects } from "../../scripts/learn/leaks.ts";
import { childEnv, LAB_ROLE, labTarget, pgConnect, psqlArgs } from "../../scripts/learn/pg.ts";
import { pythonApp, pythonEnv, pythonFailure, runPython } from "../../scripts/learn/python.ts";
import { VENV_PYTHON } from "../../scripts/venv.ts";
import { distPath, feedSchemaErrors, firstBrowserBlock, openDuckDB, rendered, repoPath, runBlock, servedFeedAttribution, sha256, waitReady } from "../helpers.ts";

// Every file under dist/, as its URL path: an index.html as its folder.
async function distFiles(): Promise<{ file: string; url: string }[]> {
  const files = (await readdir(distPath(""), { recursive: true, withFileTypes: true })).filter((d) => d.isFile());
  return files.map((d) => {
    const file = relative(distPath(""), join(d.parentPath, d.name));
    return { file, url: `/${file.replace(/(^|\/)index\.html$/, "$1")}` };
  }).sort((a, b) => a.file.localeCompare(b.file));
}

test("every dist/ file is served with dist's bytes; a page at its folder URL", async ({ request }) => {
  test.setTimeout(600_000);
  const files = await distFiles();
  expect(files.some((f) => f.url === "/learn/")).toBe(true);
  const differ: string[] = [];
  for (const { file, url } of files) {
    const res = await request.get(url);
    if (res.status() !== 200) differ.push(`${url}: ${res.status()}`);
    else if (sha256(await res.body()) !== sha256(await readFile(distPath(file)))) differ.push(`${url}: bytes differ from dist/${file}`);
  }
  expect(differ).toEqual([]);
});

test("the .wasm files are served as application/wasm", async ({ request }) => {
  const wasm = (await distFiles()).filter((f) => f.url.startsWith("/learn/assets/") && f.url.endsWith(".wasm"));
  expect(wasm.length).toBeGreaterThan(0);
  for (const { url } of wasm) {
    const res = await request.head(url);
    expect(res.status(), url).toBe(200);
    expect(res.headers()["content-type"], url).toBe("application/wasm");
  }
});

test("f3's first browser block shows its recorded result", async ({ page }) => {
  const { id, url } = await firstBrowserBlock("f3");
  await page.goto(url);
  await waitReady(page);
  await runBlock(page.locator(`#q-${id}`));
  expect(await rendered(page, id)).toMatchSnapshot(`${id}.txt`);
});

test("each /learn/data/star/ file hashes as the served star manifest says", async ({ request }) => {
  const res = await request.get("/learn/data/star/manifest.json");
  expect(res.status()).toBe(200);
  const { files } = (await res.json()) as StarManifest;
  expect(Object.keys(files)).toHaveLength(8);
  const differ: string[] = [];
  for (const [name, f] of Object.entries(files)) {
    const file = await request.get(`/learn/data/star/${name}`);
    if (file.status() !== 200) differ.push(`${name}: ${file.status()}`);
    else if (sha256(await file.body()) !== f.sha256) differ.push(`${name}: sha256 isn't the manifest's`);
  }
  expect(differ).toEqual([]);
});

test("c1's served feed is valid against its served schema", async ({ request }) => {
  const [feed, schema] = await Promise.all([`/learn/${FEED.input}`, "/learn/labs/c1-feed.schema.json"].map((u) => request.get(u)));
  expect(feed!.status()).toBe(200);
  expect(schema!.status()).toBe(200);
  expect(feedSchemaErrors(await feed!.json(), (await schema!.json()) as object)).toEqual([]);
});

test("c1's served feed credits as the served data manifest and datasets.csv say", async ({ request, baseURL }) => {
  const feed: unknown = await (await request.get(`/learn/${FEED.input}`)).json();
  const db = await openDuckDB();
  try {
    expect(feedAttributionErrors(feed, await servedFeedAttribution(db, baseURL!))).toEqual([]);
  } finally {
    db.close();
  }
});

// The download a learner runs (plan L4 S26): the origin's loader into LEARN_PG_URL's database as the lab role, under the
// lab lock, then the origin's s4.py as learn:check runs a download (python -I, empty folder, pythonEnv, no GBIF_*),
// LEARN_BASE the origin. Its stdout holds, in page order, the recorded result of each s4 Python block that runs after
// py-connect alone; nothing learn_ is left after.
test("the origin's s4.py, after the origin's loader, runs in .venv-learn and prints s4's recorded lesson outputs", async ({ request, baseURL }) => {
  test.setTimeout(600_000);
  loadEnv(repoPath(".env"));
  const lab = labTarget(process.env);
  const { pages } = await readCourse();
  const s4 = assembleDownloads(pages).find((d) => d.name === "s4.py")!;
  const lessons = pages.find((p) => p.page.id === "s4")!.blocks
    .filter((b) => b.engine === "python" && b.status === "ran" && b.after.length === 1 && b.after[0] === PY_CONNECT_ID);
  expect(lessons.map((b) => b.id)).toEqual(expect.arrayContaining(["s4-moran-pysal", "s4-permutations", "s4-agree"]));
  const app = pythonApp();
  const sql = pgConnect(lab);
  const lock = await takeLabLock(lab, lab.database, { app });
  const tmp = await mkdtemp(join(tmpdir(), "critwire-release-s4-"));
  try {
    const [who] = await sql<{ user: string; superuser: boolean }[]>`select current_user as user, rolsuper as superuser from pg_roles where rolname = current_user`;
    expect(who, "LEARN_PG_URL's role").toEqual({ user: LAB_ROLE, superuser: false });
    const loader = await request.get("/learn/data/postgis/learn_curriculum.sql");
    expect(loader.status()).toBe(200);
    await writeFile(join(tmp, "loader.sql"), await loader.body());
    await promisify(execFile)("psql", ["-q", ...psqlArgs(join(tmp, "loader.sql"))], { env: childEnv(lab), maxBuffer: 64 << 20 });
    const file = await request.get("/learn/labs/s4.py");
    expect(file.status()).toBe(200);
    const mplConfig = join(tmp, "mpl");
    await mkdir(mplConfig);
    const r = await runPython(await file.text(), { python: VENV_PYTHON, env: pythonEnv(lab, { learnBase: baseURL!, app, mplConfig }), timeoutMs: s4.timeoutMs! });
    expect(pythonFailure(r, s4.timeoutMs! / 1000)).toBeUndefined();
    let at = 0;
    for (const b of lessons) {
      const recorded = (await readFile(repoPath(`${CHECKED_DIR}/${b.id}.txt`), "utf8")).split("\n").slice(1).join("\n").replace(/\n+$/, "");
      const found = r.stdout.indexOf(`${recorded}\n`, at);
      expect(found, `${b.id}'s recorded output, after the blocks before it`).toBeGreaterThanOrEqual(0);
      at = found + recorded.length;
    }
    expect(await learnObjects(sql), "the leak query").toEqual([]);
  } finally {
    await rm(tmp, { recursive: true, force: true });
    await sql.end();
    await lock.release();
  }
});
