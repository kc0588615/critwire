# 002: critwire Learn

critwire Learn is a set of pages on critwire.com where people aged 16 and up who are new to SQL learn relational databases and SQL by asking questions about critwire's animals. The SQL runs in the learner's browser (DuckDB-WASM), on tables the page builds from the public `/v1` files, and the answers come back as animal cards. This document is the design that mission B builds from: the engine, the learners' tables, the ERD, the lessons, a query cookbook, the new countries file, one small demo game, the site, the mission B briefs and the owner's choices. Research and measurements: `plans/2026-10-22-critwire-learn-design.md` (mission A1) and its spike.

Every ```` ```sql ```` block in this file was run in DuckDB-WASM by the spike's `run-queries.ts`, and the ```` ```text ```` block after it is the result it gave (row count, a hash of the whole result, the first rows). Each block's `-- status:` says what it ran against: `ran` (today's data) or `draft-table` (needs the countries file mission B publishes; it ran against the spike's draft of it).

## 1. Engine and interface

**Recommendation: DuckDB-WASM 1.33.1-dev65.0 (DuckDB v1.5.6), `eh` bundle only, in a Web Worker, every file self-hosted from critwire.com, with critwire's own `<textarea>` editor and cards.** It met every budget the design set except one (warm start on a slow laptop), and PGlite, the one real alternative, missed that one too and also missed the memory budget. The fix for the slow warm start is page design (one engine start per visit, below), not another engine.

Key numbers (medians of 5, live Caddy config; time to first result = page open → Brazil cards drawn):

| | DuckDB-WASM eh | PGlite 0.5.10 |
|---|---|---|
| first load on the wire | 9.02 MB (40.28 MB uncompressed) | 6.44 MB (19.39 MB) |
| first result, desktop: first visit / returning | 2.9 / 2.5 s | 4.0 / 2.4 s |
| first result, school Wi-Fi (4× slower CPU): first visit / returning | 27.1 / 15.1 s | 35.7 / 14.0 s |
| first result, slow 4G (6× slower CPU): first visit / returning | 64.2 / 22.0 s | 70.3 / 21.6 s |
| peak memory of the tab (renderer RSS) | 0.50–0.52 GB | 1.07–1.44 GB |
| longest freeze of the page while starting, desktop / 4× | 0 / 0.29 s | 2.8 / 20.3 s |

Sources: `spike/out/duckdb-live/`, `spike/out/pglite-live/`, `spike/out/pglite-live-duckdb-probe/` (DuckDB's freeze at 4×). `spike/` is the mission's scratch folder, `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike/`; each `out/<run>/summary.md` has every median and maximum, and `README.md` has the commands that reproduce it.

### How it was measured

- **Where:** Playwright 1.58.2's Chromium 145 (full browser, headless) on the 2-core ARM VPS, against the spike's copy of the live Caddy block on `127.0.0.1:3102`. The page is the Brazil lesson (lesson 9): boot, run `setup.sql`, run the join, draw 12 cards.
- **Profiles:** desktop (no limits); school Wi-Fi (CPU 4× slower, 5 / 1 Mbps, 100 ms); slow 4G (CPU 6× slower, 1.6 / 0.75 Mbps, 150 ms). Each cell: 5 first visits (new browser profile, empty cache) and 5 returning visits (reload, cache warm).
- **CPU throttling:** Chrome's own throttle (`Emulation.setCPUThrottlingRate`) slows the page 4.1× but the DuckDB worker only 1.01× (`spike/out/throttle-validation/`), so it can't emulate a slow laptop for a worker-based engine. Every throttled run instead ran the whole browser under a Linux CPU quota (`systemd-run --scope -p CPUQuota=25%` for 4×), which slows the worker 4.04×. Every engine was throttled the same way.
- **Network throttling:** Chrome's network emulation does reach the worker: the engine `.wasm` took 12.9 s at school Wi-Fi against 12.9 s expected from its size (ratio 1.00).
- **Bytes** from Caddy's access log (what left the server); **memory** from the renderer process's peak RSS (`VmHWM`, page + worker + WASM), the page's JS heap and the WASM linear memory; **times** from marks in the page.
- **Self-hosting proof:** every run fails any request to a host other than the spike's own and the two Wikimedia photo hosts, and lists it. Every list is empty.

### Q1. Can DuckDB-WASM reliably query critwire's Parquet files?

**Yes, on desktop Chromium and on an emulated low-end Chromebook.** 0 failures in 30 loads per bundle (eh and mvp, 3 profiles × 5 first visits + 5 returning visits) plus 15 extra eh runs (rebuild, Reset, runaway query), and in 30 loads under the proposed Caddy config (`spike/out/duckdb-live/`, `spike/out/duckdb-proposed/`).

What the spike learned on the way:
- **Parquet needs an extension.** duckdb-wasm statically links only `core_functions`; `parquet` is a loadable extension in this build and in 1.32.0 alike. The page loads it from critwire's own extension mirror at start (0.74 MB on the wire), with automatic extension downloads turned off. See Q3.
- **The file is read whole.** For a registered file duckdb-wasm makes one plain `GET` per fresh database (200, no `Range`): `species.parquet` is 32 KB, so that's right for v1. Range reads of large files are A2's question; with full-file reads disabled, duckdb-wasm's probe reached Caddy without a `Range` header and the open failed (`spike/out/boot/`).
- **Use `eh`, drop `mvp`.** `mvp` (for browsers without WebAssembly exception handling) loses every SQL error message: a learner would read `_setThrew is not defined` instead of DuckDB's error. It's also slower (first result 3.4 / 31.3 / 73.1 s against eh's 2.9 / 27.1 / 64.2 s) and 1.08 MB bigger. eh needs Chrome 95, Firefox 100 or Safari 15.2 (2021–2022); an older browser gets a plain "your browser is too old for Learn's database" notice instead (§8).
- **The threaded `coi` bundle doesn't work.** Its parquet extension imports non-shared memory and fails to link (`LinkError`), and its start hung past 60 s in 6 of 10 tries: no database in 10 of 10 (`spike/out/coi/`). It would also have needed `Cross-Origin-Embedder-Policy` on every page. A2 should check again only if DuckDB publishes shared-memory `wasm_threads` extensions.

What a 4 GB Chromebook means for this, in short: a Learn tab peaks at about 0.5 GB, which a 4 GB Chromebook can hold as one heavy tab. With many tabs open, ChromeOS may discard it in the background, and coming back costs a returning-visit start (15–22 s at 4–6×). See "What emulation proves" below.

### Q2. First-load size, start time and memory

All three engines side by side (medians of 5; MB = 10^6 bytes; times to the first result):

| | DuckDB-WASM eh | DuckDB-WASM mvp | PGlite 0.5.10 (PostgreSQL 18.6) | sql.js 1.15.1 (SQLite 3.54.0) |
|---|---|---|---|---|
| first load, wire (live: zstd on the fly) | 9.02 MB | 10.10 MB | 6.44 MB | 0.37 MB (files only) |
| first load, uncompressed | 40.28 MB | 45.58 MB | 19.39 MB | 0.73 MB |
| desktop: first visit / returning | 2.9 / 2.5 s | 3.4 / 2.9 s | 4.0 / 2.4 s | not run |
| school Wi-Fi 4×: first visit / returning | 27.1 / 15.1 s | 31.3 / 16.9 s | 35.7 / 14.0 s | not run |
| slow 4G 6×: first visit / returning | 64.2 / 22.0 s | 73.1 / 25.8 s | 70.3 / 21.6 s | not run |
| peak renderer memory (worst profile) | 518 MB | 529 MB | 1 440 MB | not run |
| WASM linear memory | 50 MB | 50 MB | 198 MB (+ 67 MB initdb) | |
| page JS heap | < 10 MB | < 10 MB | 19–32 MB | |
| where it runs | worker | worker | page's main thread | page's main thread |

Sources: `spike/out/duckdb-live/`, `spike/out/pglite-live/`, `spike/out/sqljs/`, `spike/out/bytes/`. The same 7 tables and view, the same 37 columns, the same row counts and the same 12 Brazil rows were checked in PGlite before it was timed (`spike/out/pglite-check/`).

- **Where DuckDB's time goes.** A returning visit downloads nothing (0 bytes), so its time is all CPU: at 6×, starting the worker and compiling the cached 36 MB module (with `LOAD parquet`) takes 17.8 s, the setup 3.4 s, the query and cards 0.8 s. On desktop the same steps take 2.0 / 0.4 / 0.1 s. Bytes matter only for the first visit.
- **Deploys don't cost returning learners the engine again.** The build gives every vendored engine file a fixed modification time, so Caddy's ETag stays the same across deploys: in 15 of 15 "rebuild, then reload" runs no engine file was downloaded again, only 0.10 MB of page and data files.
- **PGlite's real cost is a frozen page.** Postgres runs on the page's main thread, which froze for up to 2.8 s on desktop and 20.3 s at 4× while it started; the editor and buttons can't respond meanwhile. PGlite has a worker mode, which would stop the freezing but change neither its start time nor its memory.
- **sql.js** is SQLite compiled to WebAssembly, and at 0.37 MB it is about 24 times smaller than DuckDB's first load. It is still the wrong engine for Learn. It can't read Parquet or fetch files, so the page would build every table from the JSON itself and could never read a growing `/v1` file in place. SQLite's typing is loose (an `INTEGER` column accepts `'abc'` unless the table is `STRICT`) and foreign keys are off until `PRAGMA foreign_keys = ON`: the opposite of what the keys and normalization lessons teach. It has no `information_schema` (lesson 6) and no path to spatial queries (A2). A small download doesn't outweigh teaching non-standard behaviour.
- **The threaded `coi` bundle** never gave a database (Q1); its failed starts took 4.8 s on desktop and 37–42 s at 4×, longer than eh's whole start on the same page (2.3 / 14.7 s).

**The engine decision (A1 plan, Architecture §5).** DuckDB-WASM had to meet: 0 failures; a returning visit's first result at slow 4G within 8 s; a first visit's first result at school Wi-Fi within 40 s; peak memory within 700 MB. PGlite would replace it only if DuckDB missed a budget even with the proposed Caddy config, PGlite met every budget, and PGlite was at least 1.5× better on what DuckDB missed.

| budget | DuckDB eh, live | DuckDB eh, proposed Caddy | PGlite, live |
|---|---|---|---|
| 0 failures | met (0 of 30 + 15) | met (0 of 30) | met (0 of 30) |
| returning visit, slow 4G ≤ 8 s | **missed**: 22.0 s | **missed**: 23.9 s | **missed**: 21.6 s |
| first visit, school Wi-Fi ≤ 40 s | met: 27.1 s | met: 23.6 s | met: 35.7 s |
| peak memory ≤ 700 MB | met: 518 MB | met: 516 MB | **missed**: 1 440 MB |

PGlite misses two budgets and is only 1.02× faster (1.11× against the proposed config) on the one DuckDB misses, so DuckDB-WASM stays. Both engines need about 20 s of CPU to start on a 6× slower machine, so the answer is to start the engine rarely:
- **One engine start per Learn visit.** Every lesson has its own static page and URL, but with JavaScript on, moving between lessons, the schema page, the cookbook and the playground swaps the page's content in place and keeps the running database (§8). A learner pays the start once per visit, not once per lesson.
- **Readable before it's ready.** The lesson text and the editable SQL are plain HTML; only Run waits for the database, and it shows how much of the engine has loaded (§8).
- **Restarts only when needed:** Reset, Stop, and recovery from a crashed worker or a failed allocation (Q5). A restart costs a returning visit's start (2.4 s desktop, 14.2 s at 4×, 21.0 s at 6×).

What that leaves, for §10: on a low-end machine a learner waits about 15–24 s for the first result of each visit once the engine is cached, and about 24–64 s on the very first visit, depending on the network and the Caddy config.

### Q3. Can everything be self-hosted?

**Yes: the engine, its worker, its extensions and the application all come from critwire.com, and Caddy works unchanged.** No run in the spike made a request to any host other than critwire's own and the Wikimedia photo hosts.

- **Engine files** are copied from the pinned npm package into `/learn/assets/duckdb-1.33.1-dev65.0/` (`duckdb-eh.wasm`, `duckdb-browser-eh.worker.js`) and loaded by URL, never through duckdb-wasm's jsDelivr helper. Schools often block CDNs, and the brief requires critwire.com to work alone.
- **The application** (page code, duckdb-wasm's JS, Apache Arrow, the card and check code, `setup.sql` as text) is one esbuild bundle with a content hash in its name (§8).
- **The extension mirror works with signatures on.** DuckDB's own layout under critwire's origin, `/learn/assets/duckdb-ext/v1.5.6/wasm_eh/<name>.duckdb_extension.wasm`, with the files byte-identical to `extensions.duckdb.org`. The page sets `custom_extension_repository` to it and turns off automatic installs and loads, so a missing extension fails with an error naming critwire's own URL instead of fetching from DuckDB's servers. `INSTALL` fetches nothing in the browser; `LOAD` makes the one request. `parquet`, `inet` and `spatial` loaded and answered (`POINT (1 2)`, `192.168.1.5`) with `allow_unsigned_extensions` off, and a copy of `inet` with one changed byte was refused ("signature is either missing or invalid"), so self-hosting needs no unsigned mode (`spike/out/ext-mirror/`).
  - v1 needs only `parquet` (3.22 MB file, 0.74 MB on the wire). It isn't an npm package, so mission B's offline build needs the binary in the repo or a pinned download: §10.
  - For A2: `spatial` is 23.63 MB (6.33 MB on the wire live, 4.53 MB precompressed), about 6× the parquet extension, and took 1.5 s to install, load and answer on desktop. Load it in spatial lessons only, never at start.
- **What Caddy needs: nothing, to work.** It already serves `.wasm` (and `.duckdb_extension.wasm`) as `application/wasm`, everything is same-origin (no CORS), and mission B's fixed file times keep ETags stable across deploys (Q2). Two improvements are the control room's change and the owner's choice (§10), measured under `Caddyfile.proposed` (`spike/out/duckdb-proposed/`, `spike/out/bytes/`, `spike/out/classroom/`):

  | | live (zstd on the fly) | proposed (precompressed br + zstd, `immutable`) |
  |---|---|---|
  | first load on the wire | 9.02 MB (engine `.wasm` 7.98 MB) | 6.25 MB (engine `.wasm` 5.47 MB br) |
  | first visit: school Wi-Fi / slow 4G | 27.1 / 64.2 s | 23.6 / 51.4 s |
  | returning visit | unchanged (CPU-bound) | unchanged |
  | a class of 10 loading the engine at once: Caddy CPU (wall) | 3.47 s (1.89 s) | 0.05 s (0.09 s) |

  - **Precompression** (`file_server { precompressed br zstd gzip }`, with `.br` and `.zst` files the build writes next to each engine file) cuts the first load by 31 % and saves Caddy about 0.35 CPU seconds per learner's first load on this 2-core server. Its cost is build time: brotli at level 11 takes about 2 minutes for the shipped eh files, which the build can skip when the versioned file hasn't changed.
  - **`Cache-Control: public, max-age=31536000, immutable` on `/learn/assets/*`** saves the revalidation request on returning visits; safe because every engine and app file name carries its version or hash.
  - Under that config, returning visits made no request for the `/v1` files at all (Chromium's heuristic freshness: `/v1` has no `Cache-Control`), so a learner could see yesterday's data for a while; with the live config they get 304s. If the control room adds headers, `/v1/*` should get `Cache-Control: no-cache` in the same change (§8, §10).
  - `e2e/serving.spec.ts` fails when `e2e/Caddyfile` drifts from the live block, so any change goes into the ops Caddyfile first and the E2E copy after it.

### Q4. The DuckDB shell, or our own editor?

**Our own editor: a plain `<textarea>` with a Run button, everywhere (lessons, cookbook, game, playground).** The shell is cheap to embed but fails learners who most need help (`spike/out/shell/`).

- **It works on critwire's tables.** `@duckdb/duckdb-wasm-shell` (same version, self-hosted) embeds with `embed({ shellModule, container, resolveDatabase: async () => engine.db })` on the database the setup already built: `SELECT count(*) FROM species;` returned 76 at the first prompt, and tables created in the shell are visible to the page. Its URL hash runs queries when it opens, so a cookbook entry could link to it.
- **It costs little to download:** 0.39 MB `shell_bg.wasm` + 0.17 MB of page code on the wire, about 5 % on top of the engine, and 0.2–0.7 s to open after setup on desktop.
- **But it fails screen readers:** results are either pixels on a canvas (WebGL, its default) or hidden from assistive technology (`aria-hidden` rows); its options can't turn on xterm's screen-reader mode, so a screen reader hears only "Terminal input".
- **On-screen keyboards don't type in it:** it reads only raw key presses, so text from Android keyboards, input methods and dictation is dropped (Enter still arrives). Hardware keyboards work, and the layout fits 375 px.
- **Keys typed while a query runs are lost**, and if the GPU is blocklisted (WebGL2 advertised, no context), the shell doesn't open at all.
- **It can't do Learn's job:** a terminal can't draw cards or check exercises.
- **Maintenance:** a second package from Rust/WebAssembly we can't patch without a Rust toolchain, kept in lockstep with duckdb-wasm, and depending on `xterm` 5.3.0, which npm marks deprecated.

So the shell is at most an optional "open in the DuckDB shell" link on the playground for people who already know SQL, never the only way in (§10). Mission B doesn't build it.

### Q5. How query results drive the interface

The spike built this as the lesson 9 page (`spike/out/card-page/`: 20 checks, 0 failures; screenshots `brazil-1280.png`, `brazil-1280-dark.png`, `brazil-375.png`, `no-photo.png`). Mission B ports these modules; each is pure except the engine.

**The engine** (`engine.ts`) is the one way a database comes into being: for the first start, for Reset and for Stop.

```ts
// One fresh database: new worker, instantiate the self-hosted eh bundle, settings, then setup.sql.
async function fresh(bundle: DuckDBBundle): Promise<Live> {
  const worker = new Worker(bundle.mainWorker);
  const db = new AsyncDuckDB(new VoidLogger(), worker);
  // A worker that fails to load only fires `error`; instantiate alone would wait forever.
  await Promise.race([db.instantiate(bundle.mainModule, null, onProgress), workerError(worker)]);
  await db.open({ path: ":memory:" });
  for (const f of ["species.parquet", "countries.parquet"])
    await db.registerFileURL(f, `${location.origin}/v1/${f}`, DuckDBDataProtocol.HTTP, false);
  const conn = await db.connect();
  await runScript(conn, [
    "SET autoinstall_known_extensions = false",   // never fetch from extensions.duckdb.org
    "SET autoload_known_extensions = false",
    "SET memory_limit = '512MB'",                 // a runaway sort fails with DuckDB's own error, not a dead tab
    `SET custom_extension_repository = '${location.origin}/learn/assets/duckdb-ext'`,
    "LOAD parquet",
  ].join(";\n"));
  await runScript(conn, SETUP);                   // §2; esbuild imports setup.sql as text
  return { db, conn };
}
```

- **`runScript(text, params?)`** splits the text into statements (top-level `;`, outside quotes and comments), runs them in order and returns the last one's `{ columns, rows }` as plain values. A whole multi-statement string sent to DuckDB at once returns the *first* statement's result, which is why it splits. An error names its statement ("Error in statement 2 of 3: …") and keeps DuckDB's text. `params` bind to the last statement's `?`. `DATE` and `TIMESTAMP` cells come back as DuckDB writes them (`2026-10-20`, `2026-10-20 12:34:56`): Arrow hands them over as epoch milliseconds, which a learner would see as `1792454400000`.
- **Huge results are capped before they exist.** Running the 21-million-row join `SELECT * FROM species, species_countries, species_sources` the plain way made duckdb-wasm build the whole result: it failed with `malloc of size 2147483648 failed` after a 2.6 GB peak, and the worker kept 2.2 GB until a restart (`spike/out/duckdb-live/`). A 4 GB Chromebook would more likely crash the tab. Instead, the last statement is streamed (`conn.send(sql, true)`) and reading stops after 10 000 rows: the same join then took 0.14 s with a 387 MB peak, and the result kept the query's column names and row order exactly (`spike/out/cap/`). The page keeps at most 10 000 rows and draws at most 200 ("showing 200 of more than 10 000"). Statements before the last run as usual. Wrapping the learner's query in `SELECT * FROM (…) LIMIT …` also bounds memory, but it renames duplicate columns (`a, a` became `a, a_1`) and works only for queries, so it isn't used. A sort over the same join runs inside DuckDB's memory manager and stops at `memory_limit` with DuckDB's "Out of Memory Error"; the page explains that the query needed more memory than a browser tab gets.
- **Start failures are loud.** A worker that can't load fails at once ("DuckDB worker failed to load: <url>"). A missing engine `.wasm` makes duckdb-wasm wait forever without an error (seen in the spike), so mission B's engine first sends a `HEAD` for the `.wasm` and fails with its HTTP status. The page shows "The database couldn't start: <reason>", never an endless spinner.

**Results to cards.**
- **Only when the SQL says so:** a result shows as cards only if the SQL's first line is `-- show: cards`; everything else is a table. Nothing is guessed from columns, so `SELECT count(*) AS id FROM species` is a table and a large count. Lesson 1 explains the line; it travels with the SQL into the cookbook, the playground and copy-paste.
- **The card rule:** the key is the column `species_id` if the result has one, else `id`. Every value must be a whole number, appear once, and be a known species id; otherwise the page shows the table with one line saying why ("Cards need one row per animal, with its id in `id` or `species_id` (`id` 999 is not an animal's id)."). The query runner and mission B's E2E fail a `-- show: cards` query that breaks it.
- **What a card shows:** title, scientific name and photo come from a lookup the page builds after setup (`SELECT id, common_name, scientific_name, photo_url, photo_credit, photo_license, photo_page FROM species`), never from the row, so `SELECT id FROM species` still draws full cards. The row's other columns appear as small "column: value" lines, except columns the card already shows.
- **Credits:** always visible: "Photo: {credit}, {license linked to its deed}, via Wikimedia Commons" (linked to the file page). Deed URLs come from the repo's `LICENSE_URLS` (`scripts/build/sources.ts`), which the browser bundle imports; an unknown license fails the build, and public domain shows unlinked.
- **No photo:** a neutral "No photo yet" box with `role="img"` and a label, and no credit line (ids 19 and 47).
- **Photos** load straight from Wikimedia with `crossorigin="anonymous"`, `referrerpolicy="no-referrer"` and `loading="lazy"`. Wikimedia sends `access-control-allow-origin: *`, so `crossorigin` costs nothing and would keep working if a page ever became cross-origin isolated (checked: 12 of 12 load under COEP; without `crossorigin` they're blocked).
- **The Table tab** always shows the raw result as a real `<table>`; a one-row, one-number result also shows as a large count. A statement that changes data says "N rows changed" rather than "1 row".

**Exercise checks** run in the page against today's data, so they keep working as the data grows; nothing stores expected rows.
- `result`: the learner's result against the reference answer's, by position (column names ignored), as a multiset unless the exercise is ordered. Hints name the difference: column count, row count, row order ("check your ORDER BY"), column order, or "some rows differ".
- `error`: the learner's last statement must fail with a constraint error (lesson 7: two animals can't share an id).
- `schema`: a verify query on `information_schema` or `duckdb_constraints()` against expected rows written in the lesson, run on the learner's own tables (lesson 16).
- **Pristine references:** right after every setup (start, Reset, Stop), before any learner statement, the page runs every reference answer of the whole path inside `BEGIN … ROLLBACK` and keeps the rows in memory. With one engine start per visit, a learner's `DELETE` in lesson 7 can't change lesson 9's expected answer. In the spike, after deleting India's country rows, the India exercise reported "Your result has 0 rows; the answer has 6. Changed the tables? Reset database brings them back."; after Reset it passed again. Mission B measures this step (16 small queries) and keeps it under 10 % of the setup's time; if it can't, it computes a lesson's reference when the lesson opens while no learner statement has changed data, and otherwise asks for Reset.

**Reset and Stop both restart the engine** (terminate the worker, build a fresh database, setup, references), keeping the editor text.
- Reset is how a learner undoes their own tables: DuckDB can't drop a table another table references (§2), so re-running the setup can't reset anything. 2.4 s on desktop, 14.2 s at 4×.
- Stop: while a query runs, Stop is enabled. A single-threaded worker can't be interrupted mid-query, so Stop restarts it ("Stopped. The query couldn't be interrupted, so the database was restarted; your changes are gone."). A late result from the old worker is dropped, because the page counts restarts. In the spike, Stop took 3.2 s on desktop and the next query ran.
- A crashed worker, or a failed allocation (the WASM memory never shrinks), takes the same path and says why.

**Games** read results the same way (§5, §7): each cookbook query is a `.sql` file the bundle imports as text, so the cookbook page, the game and E2E share one source. The game binds its parameters (today's UTC date, a seed) to `?`, turns rows into game state with pure functions, and draws the same card component with each card as a button, passing species ids explicitly (games don't use `-- show: cards`).

### What emulation proves, and what only real devices can

**Proven here** (Chromium 145, ARM server, CPU quota and network emulation): that the engine starts and answers reliably at 4× and 6× slower CPU and on slow networks; how long each step takes there; how many bytes cross the network; and the peak memory Chromium needs for a Learn tab (about 0.5 GB). Screenshots at 375 px check the layout.

**Only real devices can show:**
- **A real Chromebook's memory pressure:** whether ChromeOS discards a 0.5 GB tab in the background at 4 GB, and where a tab is killed. A Chromebook's GPU, thermal throttling and Chrome build are also untested.
- **Phones:** Android Chrome, and how on-screen keyboards behave in the `<textarea>`.
- **iOS Safari:** WebKit's own limits on WASM memory, and whether the eh bundle starts (Safari 15.2 and later support it). Every browser on iOS uses WebKit.
- **Firefox:** not run. Playwright's Firefox for this ARM server needs GTK libraries, which means apt packages, outside this mission (`spike/out/firefox/`). Firefox 100 and later support the eh bundle.

§10 asks the owner for one check of about 15 minutes before mission B2's demo ships: a lesson and the demo on an iPhone, and on a Chromebook if one is at hand.

## 2. The learners' schema, first version

### How it's built

When a Learn page loads, it starts DuckDB-WASM on an empty in-memory database and runs one script, `setup.sql` (the `setup` block below), which builds every learners' table from two public files: `/v1/species.parquet` (exists today) and `/v1/countries.parquet` (new in mission B, §6). That script is the only way a learners' database comes into being. The Learn pages, the playground, the demo, mission B's E2E suite and this document's query runner all run the same text, so a lesson can't depend on a table that some other path built differently.

- **Learners never see the nested file.** `species.parquet` keeps critwire's nested record shape (structs such as `taxonomy` and `photo`, lists such as `range.countriesWithOpenRecords` and `sources`) and camelCase names. The setup flattens it into plain tables with snake_case names, and lessons use only standard SQL on those tables. The DuckDB-specific parts (`read_parquet`, `unnest`, struct access with `.`) appear only in the setup, and in lesson 14, which shows them labelled as DuckDB.
- **Order matters.** DuckDB declares foreign keys only inside `CREATE TABLE` (`ALTER TABLE … ADD FOREIGN KEY` is not implemented) and checks them statement by statement, so every table a key points at is created and filled first:
  1. `taxa`, one `INSERT` per rank, top down (class, order, family, genus): a single multi-row `INSERT` whose rows point at parents inserted by that same statement fails the foreign key check;
  2. `species` (its `genus` points at `taxa`);
  3. `sources`, then `species_sources`;
  4. `countries`, then `species_countries` (both keys);
  5. the view `species_taxonomy`.
- **Nothing is ever dropped.** DuckDB refuses to drop a table another table still references (`CASCADE` doesn't help), so re-running the setup can't reset a database. A fresh database comes only from restarting the engine (a new worker and a new in-memory database, then the setup again). That is what the page's Reset button does (§1, §8).
- **It fails loudly.** Bad data breaks a constraint instead of slipping through: a species country code missing from `countries` (foreign key), a source with two licenses or two dates (primary key of `sources`), a taxon name used at two ranks (primary key of `taxa`), a class with a parent or a genus without one (check). The page then shows DuckDB's error, and mission B's E2E suite runs this same setup, so a deploy can't ship a setup that fails.
- **What it costs.** The setup is 16 statements. The page loads DuckDB's `parquet` extension from critwire.com's own mirror before running it (§1). Each data file is fetched once per fresh database (about 32 KB for `species.parquet`).

### Tables

Names: entity tables are plural snake_case (`species`, `taxa`, `countries`, `sources`); a junction table is named after the two tables it joins (`species_countries`, `species_sources`); a foreign key column is named after what it points at (`species_id`, `country_code`, `source_name`, `parent_name`; `species.genus` keeps its everyday name). Scalar columns use the names the repo's own `db/schema.sql` already gives them (`scientific_name`, `common_name`, `range_status`, `photo_url`, `iucn_id`, …), and no column needs quoting in SQL: `order` and `range` are reserved words, so the view says `order_name` and `species` says `range_status`.

| Table | Columns and keys | Built from |
|---|---|---|
| `taxa` | `name` VARCHAR, primary key; `taxon_rank` VARCHAR NOT NULL, one of `class`, `order`, `family`, `genus`; `parent_name` VARCHAR, foreign key → `taxa.name`, NULL exactly for classes (a check) | the distinct `taxonomy.class`, `.order`, `.family` and `.genus` values, each with the rank above it as parent |
| `species` | `id` INTEGER, primary key; `slug` VARCHAR NOT NULL, unique; `scientific_name` VARCHAR NOT NULL, unique; `common_name` VARCHAR NOT NULL; `genus` VARCHAR NOT NULL, foreign key → `taxa.name`; `range_status` VARCHAR NOT NULL, one of `ok`, `no-open-records`, `identity-unsettled`; `photo_url`, `photo_credit`, `photo_license`, `photo_page` VARCHAR; `iucn_id` INTEGER, `gbif_id` BIGINT, `col_id` VARCHAR, `wikidata_id` VARCHAR, `inaturalist_id` INTEGER, `ncbi_id` INTEGER, each unique and nullable | one row per record: `id`, `slug`, `scientificName`, `commonName`, `taxonomy.genus`, `range.status`, the `photo` fields, the `ids` fields |
| `sources` | `name` VARCHAR, primary key; `license` VARCHAR NOT NULL; `retrieved` DATE (NULL for `critwire base`, critwire's own fields) | the distinct (`source`, `license`, `retrieved`) of every record's `sources` list |
| `species_sources` | `species_id` INTEGER NOT NULL, foreign key → `species.id`; `field` VARCHAR NOT NULL (a path in the record, such as `ids.col` or `taxonomy`); `source_name` VARCHAR NOT NULL, foreign key → `sources.name`; primary key (`species_id`, `field`) | each record's `sources` list, then each entry's `fields` list: which source supplied which field of which animal |
| `countries` | `code` VARCHAR, primary key (ISO 3166-1 alpha-2, plus `XK` for Kosovo, as GBIF uses it); `name` VARCHAR NOT NULL, unique; `continent`, `region`, `subregion` VARCHAR NOT NULL | `/v1/countries.parquet` (§6): Natural Earth admin-0 attributes, 250 rows |
| `species_countries` | `species_id` INTEGER NOT NULL, foreign key → `species.id`; `country_code` VARCHAR NOT NULL, foreign key → `countries.code`; primary key (`species_id`, `country_code`) | each record's `range.countriesWithOpenRecords` list, one row per code |
| view `species_taxonomy` | `species_id`, `class`, `order_name`, `family`, `genus` | `species` joined to `taxa` four times, genus up to class |

**What `species_countries` means.** A row says the animal has been *recorded in that country in open (CC0 or CC BY) occurrence records on GBIF*, after critwire's filters (§6 and the docs page). It is not the native range: open records include zoos, introductions and the odd stray. Every lesson that uses it says so, and the table keeps that one meaning for good; a native range, if critwire ever has one, would be a new table (for example `species_native_countries`), never a new meaning for this one. Four animals have no rows: three whose GBIF identity isn't settled yet (`range_status` `identity-unsettled`) and one with no open records left after filtering (`no-open-records`). Lessons 4 and 11 use them.

**Relationships** (§3 draws them):
- `taxa` → `taxa`: each taxon except a class has one parent; a taxon can have many children (one-to-many, the hierarchy).
- `taxa` → `species`: a genus has many species; each species has one genus (one-to-many).
- `species` ↔ `countries` through `species_countries`: many-to-many.
- `species` ↔ `sources` through `species_sources`: many-to-many; every species cites at least one source.

### The setup

The `setup` block must equal the spike's `src/setup.sql` byte for byte; `run-queries` refuses a plan where they differ. It has no result block, because it is what builds the database the other blocks run on.

```sql
-- q: setup
-- status: ran
-- critwire Learn: the learners' tables (schema v1), built on a fresh in-memory database
-- from /v1/species.parquet and /v1/countries.parquet. Every table a foreign key points at is
-- created first, and taxa go in one rank per INSERT, top down: DuckDB declares foreign keys
-- only in CREATE TABLE and checks them statement by statement. Nothing is ever dropped;
-- a fresh database comes from a restart.

CREATE TABLE taxa (
  name        VARCHAR PRIMARY KEY,
  taxon_rank  VARCHAR NOT NULL CHECK (taxon_rank IN ('class', 'order', 'family', 'genus')),
  parent_name VARCHAR REFERENCES taxa (name),
  CHECK ((taxon_rank = 'class') = (parent_name IS NULL))
);

INSERT INTO taxa
SELECT DISTINCT taxonomy.class, 'class', NULL FROM read_parquet('species.parquet');

INSERT INTO taxa
SELECT DISTINCT taxonomy."order", 'order', taxonomy.class FROM read_parquet('species.parquet');

INSERT INTO taxa
SELECT DISTINCT taxonomy.family, 'family', taxonomy."order" FROM read_parquet('species.parquet');

INSERT INTO taxa
SELECT DISTINCT taxonomy.genus, 'genus', taxonomy.family FROM read_parquet('species.parquet');

CREATE TABLE species (
  id              INTEGER PRIMARY KEY,
  slug            VARCHAR NOT NULL UNIQUE,
  scientific_name VARCHAR NOT NULL UNIQUE,
  common_name     VARCHAR NOT NULL,
  genus           VARCHAR NOT NULL REFERENCES taxa (name),
  range_status    VARCHAR NOT NULL CHECK (range_status IN ('ok', 'no-open-records', 'identity-unsettled')),
  photo_url       VARCHAR,
  photo_credit    VARCHAR,
  photo_license   VARCHAR,
  photo_page      VARCHAR,
  iucn_id         INTEGER UNIQUE,
  gbif_id         BIGINT UNIQUE,
  col_id          VARCHAR UNIQUE,
  wikidata_id     VARCHAR UNIQUE,
  inaturalist_id  INTEGER UNIQUE,
  ncbi_id         INTEGER UNIQUE
);

INSERT INTO species
SELECT id, slug, scientificName, commonName, taxonomy.genus, "range".status,
       photo.url, photo.credit, photo.license, photo.page,
       ids.iucn, ids.gbif, ids.col, ids.wikidata, ids.inaturalist, ids.ncbi
FROM read_parquet('species.parquet');

CREATE TABLE sources (
  name      VARCHAR PRIMARY KEY,
  license   VARCHAR NOT NULL,
  retrieved DATE
);

INSERT INTO sources
SELECT DISTINCT s.source, s.license, CAST(s.retrieved AS DATE)
FROM (SELECT unnest(sources) AS s FROM read_parquet('species.parquet'));

CREATE TABLE species_sources (
  species_id  INTEGER NOT NULL REFERENCES species (id),
  field       VARCHAR NOT NULL,
  source_name VARCHAR NOT NULL REFERENCES sources (name),
  PRIMARY KEY (species_id, field)
);

INSERT INTO species_sources
SELECT id, unnest(s.fields), s.source
FROM (SELECT id, unnest(sources) AS s FROM read_parquet('species.parquet'));

CREATE TABLE countries (
  code      VARCHAR PRIMARY KEY,
  name      VARCHAR NOT NULL UNIQUE,
  continent VARCHAR NOT NULL,
  region    VARCHAR NOT NULL,
  subregion VARCHAR NOT NULL
);

INSERT INTO countries
SELECT code, name, continent, region, subregion FROM read_parquet('countries.parquet');

-- Countries with open (CC0 / CC BY) occurrence records, not the native range.
CREATE TABLE species_countries (
  species_id   INTEGER NOT NULL REFERENCES species (id),
  country_code VARCHAR NOT NULL REFERENCES countries (code),
  PRIMARY KEY (species_id, country_code)
);

INSERT INTO species_countries
SELECT id, unnest("range".countriesWithOpenRecords) FROM read_parquet('species.parquet');

CREATE VIEW species_taxonomy AS
SELECT s.id AS species_id, c.name AS class, o.name AS order_name, f.name AS family, g.name AS genus
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
JOIN taxa AS f ON f.name = g.parent_name
JOIN taxa AS o ON o.name = f.parent_name
JOIN taxa AS c ON c.name = o.parent_name;
```

The row count of every table and of the view, today (`countries` is the spike's draft, so this block is `draft-table`):

```sql
-- q: setup-counts
-- status: draft-table
SELECT (SELECT count(*) FROM taxa)              AS taxa,
       (SELECT count(*) FROM species)           AS species,
       (SELECT count(*) FROM sources)           AS sources,
       (SELECT count(*) FROM species_sources)   AS species_sources,
       (SELECT count(*) FROM countries)         AS countries,
       (SELECT count(*) FROM species_countries) AS species_countries,
       (SELECT count(*) FROM species_taxonomy)  AS species_taxonomy;
```

```text
-- result: setup-counts · 1 row · sha256 a46604343811
taxa | species | sources | species_sources | countries | species_countries | species_taxonomy
143 | 76 | 5 | 591 | 250 | 472 | 76
```

### Limits the lessons state

- **A foreign key checks existence, nothing more.** `species.genus` points at `taxa.name`, but no constraint can make sure the row it points at is a *genus*: a check constraint sees only its own row. Lesson 12 says so, and that enforcing it would take a trigger (DuckDB has none) or one table per rank. Learners shouldn't assume a foreign key checks more than it does.
- **Taxon names are a natural key because of today's data, not a rule of nature.** No name is used at two ranks or under two parents today, so `taxa.name` can be the primary key. Nomenclature allows the same genus name in animals and plants, though. Mission B's `pnpm derive` refuses (as a blocking mismatch) a taxon name at two ranks or under two parents, so a collision stops the data build instead of breaking learners' browsers. Fixing one for real would be a schema change (a surrogate `taxa.id`), decided then.
- **No `DROP`, no `ALTER … ADD FOREIGN KEY`.** These are DuckDB limits (above). A learner who creates tables does it inside the page's database, and Reset (a restart) is how to start over.
- **Everything is in memory.** A learner's tables last until the page reloads or Reset; nothing is saved.

### Left out of v1

- `replacedBy`: null for every record today. When an id is first retired, a `species_replacements (species_id, replaced_by)` table joins on.
- Each source's query URL (`sources[].url`) and release details (`doi`, `release`): they describe how critwire fetched a field, not the animals, and they would turn `species_sources` into a wide table nobody queries in a lesson. The `/v1` files keep them.

### Room to grow (A2)

New data joins on with new tables and no renames:
- traits: `traits (name, unit, description)` + `species_traits (species_id, trait_name, value, source_name)` (the unit belongs to the trait, so it isn't repeated per value); lesson 16 has learners design this one;
- habitats: `habitats` + `species_habitats`;
- regions: `regions` + `country_regions`;
- occurrences: `occurrences (id, species_id, country_code, …)`;
- new taxonomic ranks: new `taxa` rows, with the rank check widened.

Each new table is created after the tables it points at, in the same `setup.sql`.

## 3. Entity relationship diagram

The ERD is the map of the learners' tables: every table is a box, every column a row in it, and every foreign key a line between two boxes. Lesson 6 teaches learners to read it, and every lesson can open it. Its source is plain text in the repo, `plans/002-learn-erd.mmd` (mission B moves it to `site/learn/schema.mmd`); the block below is the same text, and the spike's `run-queries --erd` fails if they differ.

```mermaid
%% critwire Learn: the learners' schema v1 (plans/002-learn.md §2, §3). Tables only; the view species_taxonomy is listed beside it.
%% Keys: PK primary key, FK foreign key, UK unique. Lines: || exactly one, |o zero or one, |{ one or more, o{ zero or more.
erDiagram
    taxa {
        VARCHAR name PK "Agalychnis, Phyllomedusidae, Anura, Amphibia"
        VARCHAR taxon_rank "class, order, family or genus"
        VARCHAR parent_name FK "the taxon one rank up; NULL for a class"
    }
    species {
        INTEGER id PK "critwire's own id, never reused"
        VARCHAR slug UK "red-eyed-tree-frog"
        VARCHAR scientific_name UK "Agalychnis callidryas"
        VARCHAR common_name "Red-eyed Tree Frog"
        VARCHAR genus FK "a taxa row of rank genus"
        VARCHAR range_status "ok, no-open-records or identity-unsettled"
        VARCHAR photo_url "NULL when there is no photo"
        VARCHAR photo_credit "who took the photo"
        VARCHAR photo_license "CC BY-SA 4.0, CC BY 2.0, CC0, Public domain"
        VARCHAR photo_page "the photo's Wikimedia Commons page"
        INTEGER iucn_id UK "IUCN Red List taxon id"
        BIGINT gbif_id UK "GBIF backbone taxon key"
        VARCHAR col_id UK "Catalogue of Life id"
        VARCHAR wikidata_id UK "Wikidata item"
        INTEGER inaturalist_id UK "iNaturalist taxon id"
        INTEGER ncbi_id UK "NCBI Taxonomy id"
    }
    countries {
        VARCHAR code PK "ISO 3166-1 alpha-2, plus XK"
        VARCHAR name UK "Brazil"
        VARCHAR continent "South America"
        VARCHAR region "Americas"
        VARCHAR subregion "South America"
    }
    species_countries {
        INTEGER species_id PK, FK "the animal"
        VARCHAR country_code PK, FK "recorded there in open records"
    }
    sources {
        VARCHAR name PK "Wikidata, Catalogue of Life, critwire base"
        VARCHAR license "the license of what critwire took"
        DATE retrieved "when critwire took it; NULL for critwire base"
    }
    species_sources {
        INTEGER species_id PK, FK "the animal"
        VARCHAR field PK "a path in the record, such as ids.col"
        VARCHAR source_name FK "who supplied that field"
    }

    taxa |o--o{ taxa : "parent of"
    taxa ||--o{ species : "genus of"
    species ||--o{ species_countries : "recorded in"
    countries ||--o{ species_countries : "has records of"
    species ||--o{ species_sources : "fields from"
    sources ||--|{ species_sources : "supplies"
```

GitHub draws the block above in the PR. The spike's offline render of it is `<spike>/erd/schema.svg` and `schema.png` (mission A1's state folder, `scripts/erd.ts`).

**The view, beside the diagram.** `species_taxonomy (species_id, class, order_name, family, genus)` is a view, not a table: it stores nothing, it's the query that joins `species` to `taxa` four times (genus up to class). The ERD draws tables only, so the view appears in the legend under the picture and in the data dictionary, marked "view".

**How to read it.**
- A box is a table (an entity); each row is a column (an attribute) with its type, its key marks and a short note.
- `PK` primary key: the column (or columns, as in both junction tables) that names exactly one row. `FK` foreign key: a value that must exist as a key in another table. `UK` unique: no two rows share it (the natural and outside ids).
- A line is a foreign key, drawn from the table it points at to the table that holds it. Its ends say how many: `||` exactly one, `|o` zero or one, `o{` zero or more, `|{` one or more. So `taxa ||--o{ species` reads "each species has exactly one genus in `taxa`; a genus has zero or more species", and `taxa |o--o{ taxa` reads "each taxon has zero or one parent (classes have none)".
- Many-to-many is two one-to-many lines into a junction table: `species ||--o{ species_countries` and `countries ||--o{ species_countries`.

**What the check holds.** `run-queries --erd` (failure modes RQE1–RQE5) builds the database exactly as a Learn page does, reads its catalog (`information_schema.tables`, `information_schema.columns`, `duckdb_constraints()`) and fails on any drift: a table on one side only (the view drawn as a table counts), a column missing, extra or of another type, a `PK`/`FK`/`UK` mark the constraints don't back (or a constraint with no mark), a line with no foreign key behind it (or a foreign key with no line), and a `||` end on a nullable foreign key or a `|o` end on a NOT NULL one. The "one or more" ends (`|{`) are facts about the data, not constraints: every source is cited at least once because `sources` is built from the citations. The parser accepts only this subset of Mermaid and names the line of anything else, so no line is skipped unchecked.

### Why Mermaid

| Format | Crow's feet and keys | Renders offline here | Owner reviews it in a PR | Cost |
|---|---|---|---|---|
| **Mermaid `erDiagram`** | yes: cardinality ends, `PK`/`FK`/`UK`, a note per column | yes: `mermaid`'s browser bundle in Playwright's Chromium, which the E2E suite already runs | yes: GitHub draws `mermaid` blocks in Markdown | one pinned devDependency (`mermaid` 12.2.0), no install script |
| DBML | keys and refs, yes | no renderer in the DBML project: `@dbml/core` parses and converts to SQL; pictures come from dbdiagram.io (hosted) or community renderers outside the project | no, shown as text | a hosted tool or an unofficial renderer |
| PlantUML | IE notation, yes | needs Java (and Graphviz for some layouts) on the build machine | no, shown as text | a JVM on the VPS |
| D2 | `sql_table` shape with constraints, crow's-foot arrowheads | a Go binary to pin and download for arm64 | no, shown as text | a binary outside npm |
| DOT (Graphviz) | `crow` arrowheads, but tables and keys are hand-built HTML labels with no meaning a check can read | needs the `graphviz` apt package (out of scope) or a WASM port | no, shown as text | apt, and a drift check on free-form labels |

Mermaid is the only one that is text with ER meaning, renders with what the VPS already has, and shows as a picture where the owner reviews. Rendering it in the learner's browser instead was rejected: `mermaid.min.js` is 5.5 MB (1.6 MB gzipped) to draw one static picture.

### How the site shows it

- **From every lesson:** a "Schema" button opens a `<dialog>` holding the SVG as an `<img>` (with alt text naming the six tables) and a link to `/learn/schema/`. A dialog keeps the learner's SQL in the editor; Escape closes it and focus returns to the button.
- **`/learn/schema/`:** the same SVG, a link to open it alone (pinch-zoom on a phone: it is 1901 × 1166 px), and the **data dictionary**: one table per entity (column, type, keys, note), the view, and each relationship in words ("each species has exactly one genus; a genus has zero or more species"). The dictionary is the accessible equivalent of the picture, generated at build time from the same `.mmd` with the parser above, so the two can't disagree.
- The SVG is drawn with `htmlLabels` off, so every label is SVG `<text>` and it renders inside `<img>` (HTML labels need `<foreignObject>`, which `<img>` won't draw). It is 142,522 bytes, 21,640 gzipped.

### How mission B builds it (offline, no mermaid-cli)

- **`pnpm erd`** (run by a person or agent after editing the `.mmd`, like `pnpm derive`): the spike's `scripts/erd.ts`, ported. It loads `mermaid`'s browser bundle into Playwright's Chromium with the route guard (any network request fails), runs Mermaid's parser (a syntax error fails with its message), renders, refuses `<foreignObject>` or a missing entity, sets the root `<svg>`'s `width`/`height` from its `viewBox` (so `<img>` needs no CSS) and `data-source-sha256` to the sha256 of the `.mmd`, and writes `site/learn/schema.svg` through a temp file and a rename (a failed run leaves the old SVG). The SVG is committed next to its source.
- **`pnpm build`** stays offline and browserless: it hashes `site/learn/schema.mmd`, compares with the SVG's `data-source-sha256`, and refuses a mismatch with `site/learn/schema.svg is stale: run pnpm erd`, as derive refuses stale data. It copies the SVG and writes `/learn/schema/` with the data dictionary.
- **E2E** `schema.spec.ts` runs the `--erd` drift check against the database the browser builds from the deployed files, and screenshots the dialog.
- **Why not `@mermaid-js/mermaid-cli`:** it drives Puppeteer, whose install script downloads Chrome; the repo's `allowBuilds` only lets esbuild's script run, and Chrome for Testing has no linux-arm64 build for this VPS (F9). `mermaid` itself has no install script, and Playwright's Chromium is already here.
- **Labels are measured where the SVG is made.** Mermaid sizes each box from the font in the rendering browser, so `pnpm erd` sets `Verdana, "DejaVu Sans", sans-serif`: DejaVu Sans (this VPS) and Verdana (most learners' machines) have close widths, so text fits on both.

## 4. Lessons: the core path

**Who it's for.** People aged 16 and up who have never written SQL. Each lesson asks one real question about critwire's animals, teaches the one idea needed to answer it, and ends with a "Your turn" exercise. Relational ideas (tables, keys, relationships, normalization) get lessons of their own, in the order the questions need them.

**How a lesson page works.** The page shows the lesson text and an editor that already holds the lesson's SQL. While the database loads, Run is disabled and shows its progress (§8). Run (or Ctrl+Enter, Cmd+Enter on a Mac) sends the editor's text to DuckDB in the browser, and the result appears under it. The learner can change the SQL and run it again as often as they like. "Your turn" has its own editor, a Check button, and "Show answer". "Reset database" brings back the tables as the page built them (§1). The "Schema" button opens the ERD (§3) from every lesson.

**Cards or a table.** A result shows as animal cards only when the SQL's first line is the comment `-- show: cards`. A line starting with `--` is a comment, a note DuckDB skips; Learn reads this one comment as "draw this result as cards". Without it, a result is a table. Lesson 1 says so, and the line travels with the SQL wherever it's pasted. Cards need one row per animal with the animal's `id` (or `species_id`) in it; the card takes the name and photo from `species`, and shows the row's other columns as small "column: value" lines.

**How each lesson is written below.** Concept and question; a plain explanation; the lesson's SQL with the result it gave on today's data (the `text` block: row count, a hash of the whole result, the first rows); **Shown as**; "Your turn" with its answer and result; **Check**, the kind of check the page runs on the learner's answer (§1):
- `result, any row order`: the learner's rows must equal the answer's, column by column, in any order;
- `result, in order`: the same, and the row order must match too;
- `error`: the learner's last statement must fail, with a constraint error.

The lesson text gives no counts of animals or rows: the data grows, and the result panel shows today's numbers. Lessons that use countries say what they mean: the animal was *recorded there in open records*, not that it lives there naturally.

### Lesson 1 · tables

**Concept:** tables, rows and columns; comments, and `-- show: cards`. **Question:** What does critwire know about an animal?

A database keeps its facts in **tables**. A table is a grid: each **row** is one thing (here, one animal), and each **column** is one kind of fact about it (its name, its genus, its photo). Every row of a table has the same columns. The table `species` has one row per animal.

You ask a database for data with a **query**. This one says: from the table `species`, give me every column (`*` means "all columns") of every row, sorted by `id`. A table has no order of its own; `ORDER BY` asks for one, and lesson 2 explains it. The `;` ends the statement.

The first line starts with `--`, so it's a **comment**: DuckDB skips it. Learn reads this particular comment as "show the result as animal cards". Delete it and run again: the same rows come back as a table.

```sql
-- q: l01
-- status: ran
-- show: cards
SELECT * FROM species ORDER BY id;
```

```text
-- result: l01 · 76 rows · sha256 4e2209b70375
id | slug | scientific_name | common_name | genus | range_status | photo_url | photo_credit | photo_license | photo_page | iucn_id | gbif_id | col_id | wikidata_id | inaturalist_id | ncbi_id
1 | blandings-turtle | Emydoidea blandingii | Blanding's Turtle | Emydoidea | ok | https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/Bla… | Andrew C | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Blanding%27s_turtle_… | 7709 | 2442885 | 39LSJ | Q185526 | 39885 | NULL
2 | spiny-softshell-turtle | Apalone spinifera | Spiny Softshell Turtle | Apalone | ok | https://thumb.wikimedia.org/wikipedia/commons/thumb/6/67/Spi… | U.S. Fish and Wildlife Service Headquarters | Public domain | https://commons.wikimedia.org/wiki/File:Spiny_softshell_turt… | 163451 | 2442680 | F6QR | Q650232 | 39556 | 55534
3 | darwin-frog | Rhinoderma darwinii | Darwin Frog | Rhinoderma | ok | https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Ran… | Ong ranita | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Ranita_de_Darwin_(Rh… | 19513 | 5217388 | 78TQQ | Q586567 | 26681 | 43563
4 | big-headed-turtle | Platysternon megacephalum | Big-headed Turtle | Platysternon | ok | https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Big… | Chetatata | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Big-headed_Turtle_HK… | 9605 | 2441884 | 4JZ39 | Q754035 | 39688 | 55544
5 | wallaces-flying-frog | Rhacophorus nigropalmatus | Wallace's Flying Frog | Rhacophorus | ok | https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Rha… | Rushenb | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Rhacophorus_nigropal… | 59008 | 5217285 | 6X5RD | Q1190196 | 26490 | 143446
… 71 more rows
```

**Shown as:** cards, one per row, with the row's other columns on each card; the Table tab shows the same rows as a grid.

**Your turn:** critwire also has a table called `sources`: who supplied critwire's facts, under which license, and when. Show every column of every row of `sources`, sorted by `name`.

```sql
-- q: l01-ex
-- status: ran
SELECT * FROM sources ORDER BY name;
```

```text
-- result: l01-ex · 5 rows · sha256 a3031e95b2d6
name | license | retrieved
Catalogue of Life | CC BY 4.0 | 2026-10-20
GBIF Backbone Taxonomy | CC BY 4.0 | 2026-10-21
GBIF.org occurrence search | CC BY 4.0 | 2026-10-21
Wikidata | CC0 1.0 | 2026-10-20
critwire base | CC BY 4.0 | NULL
```

**Check:** `result, any row order`.

### Lesson 2 · select

**Concept:** choosing columns with `SELECT`; `ORDER BY` and `LIMIT`. **Question:** Which animals come first from A to Z?

Instead of `*`, you can name the columns you want, separated by commas, in the order you want them. `ORDER BY common_name` sorts the rows by that column, A to Z (add `DESC`, for "descending", to sort Z to A, or largest first). `LIMIT 5` keeps only the first five rows of the sorted result. Without `ORDER BY`, "the first five" would mean whichever five the database happened to read first, which can change.

```sql
-- q: l02
-- status: ran
-- show: cards
SELECT id, common_name, scientific_name
FROM species
ORDER BY common_name
LIMIT 5;
```

```text
-- result: l02 · 5 rows · sha256 08ee0e8548f3
id | common_name | scientific_name
57 | Aardvark | Orycteropus afer
50 | Addax | Addax nasomaculatus
41 | African Forest Elephant | Loxodonta cyclotis
64 | African Savanna Elephant | Loxodonta africana
20 | African Spurred Tortoise | Centrochelys sulcata
```

**Shown as:** cards, in the query's order.

**Your turn:** critwire gives each new animal the next free `id`, so the highest ids are the animals added most recently. Show the `id` and `common_name` of the five animals with the highest ids, highest first.

```sql
-- q: l02-ex
-- status: ran
SELECT id, common_name
FROM species
ORDER BY id DESC
LIMIT 5;
```

```text
-- result: l02-ex · 5 rows · sha256 cc8c90f4c5bc
id | common_name
76 | Golden Poison Frog
75 | Hellbender
74 | Axolotl
73 | Giant Otter
72 | Maned Wolf
```

**Check:** `result, in order` (the order is the question).

### Lesson 3 · where

**Concept:** filtering rows with `WHERE`; `AND`, `OR`; `LIKE`. **Question:** Which animals are frogs?

`WHERE` keeps only the rows for which a condition is true. `genus = 'Panthera'` is true for rows whose genus is exactly `Panthera`; text values go in single quotes. Conditions combine: `a OR b` keeps rows where either is true, `a AND b` rows where both are.

`species` has no "is a frog" column. The common name is a start: `LIKE` compares text with a pattern, where `%` stands for any run of characters, so `'%Frog%'` matches any name with "Frog" in it. `LIKE` is case-sensitive: `'%frog%'` would miss "Darwin Frog".

```sql
-- q: l03
-- status: ran
-- show: cards
SELECT id, common_name, genus
FROM species
WHERE common_name LIKE '%Frog%'
ORDER BY common_name;
```

```text
-- result: l03 · 11 rows · sha256 0811f8f29737
id | common_name | genus
8 | Coastal Tailed Frog | Ascaphus
3 | Darwin Frog | Rhinoderma
14 | Desert Rain Frog | Breviceps
9 | Dyeing Poison Dart Frog | Dendrobates
76 | Golden Poison Frog | Phyllobates
… 6 more rows
```

A name isn't a classification, though: the Suriname Toad is a frog too (it belongs to the frog order, Anura), and no pattern on names would find it. Lesson 8 answers the question properly with the `taxa` table.

The big cats in the genus *Panthera*, and the cheetah, which has a genus of its own:

```sql
-- q: l03-or
-- status: ran
-- show: cards
SELECT id, common_name, genus
FROM species
WHERE genus = 'Panthera' OR genus = 'Acinonyx'
ORDER BY common_name;
```

```text
-- result: l03-or · 3 rows · sha256 4e05e42c705e
id | common_name | genus
58 | Cheetah | Acinonyx
51 | Jaguar | Panthera
25 | Tiger | Panthera
```

**Shown as:** cards.

**Your turn:** Which animals have "Turtle" or "Tortoise" in their common name? Show their `id` and `common_name`.

```sql
-- q: l03-ex
-- status: ran
-- show: cards
SELECT id, common_name
FROM species
WHERE common_name LIKE '%Turtle%' OR common_name LIKE '%Tortoise%'
ORDER BY common_name;
```

```text
-- result: l03-ex · 11 rows · sha256 1a31521ac0db
id | common_name
20 | African Spurred Tortoise
4 | Big-headed Turtle
1 | Blanding's Turtle
19 | Floreana Giant Tortoise
15 | Pancake Tortoise
… 6 more rows
```

**Check:** `result, any row order`.

### Lesson 4 · null

**Concept:** `NULL`, `IS NULL`; a missing value against a value that explains itself. **Question:** Which animals have no photo?

Some animals have no photo yet, so their `photo_url` has no value at all. SQL calls a missing value **`NULL`**. `NULL` isn't zero and isn't empty text; it means "unknown". You test for it with `IS NULL` (or `IS NOT NULL`):

```sql
-- q: l04
-- status: ran
-- show: cards
SELECT id, common_name, photo_url
FROM species
WHERE photo_url IS NULL
ORDER BY id;
```

```text
-- result: l04 · 2 rows · sha256 cb073c536764
id | common_name | photo_url
19 | Floreana Giant Tortoise | NULL
47 | Ili Pika | NULL
```

The cards show what Learn does when there's no photo: a plain "No photo yet" box, and no credit line, because there's no photo to credit.

Why not `photo_url = NULL`? Comparing anything with an unknown value gives "unknown", never true, so `WHERE` keeps no rows at all. This count is always zero:

```sql
-- q: l04-equals
-- status: ran
SELECT count(*) AS animals
FROM species
WHERE photo_url = NULL;
```

```text
-- result: l04-equals · 1 row · sha256 5b42c9c5b42a
animals
0
```

Some facts aren't left `NULL` when they're missing; critwire says *why* instead. `range_status` tells whether critwire has a list of countries for an animal: `ok` (it has one), `no-open-records` (after critwire's filters, no country with open records is left), or `identity-unsettled` (critwire isn't yet sure which GBIF taxon is this animal, so it doesn't count its records). It's never `NULL`. `<>` means "is not equal to":

```sql
-- q: l04-status
-- status: ran
-- show: cards
SELECT id, common_name, range_status
FROM species
WHERE range_status <> 'ok'
ORDER BY id;
```

```text
-- result: l04-status · 4 rows · sha256 f5fd7b6feb3f
id | common_name | range_status
9 | Dyeing Poison Dart Frog | identity-unsettled
19 | Floreana Giant Tortoise | identity-unsettled
27 | Western Long-beaked Echidna | identity-unsettled
47 | Ili Pika | no-open-records
```

These animals will matter again in lesson 11, where some joins leave them out.

**Shown as:** cards, including the no-photo state; the `= NULL` query as a large count.

**Your turn:** `inaturalist_id` is the animal's id on iNaturalist, a website where people share sightings. Which animals have no iNaturalist id? Show their `id`, `common_name` and `inaturalist_id`.

```sql
-- q: l04-ex
-- status: ran
-- show: cards
SELECT id, common_name, inaturalist_id
FROM species
WHERE inaturalist_id IS NULL
ORDER BY id;
```

```text
-- result: l04-ex · 2 rows · sha256 cc5f58385a95
id | common_name | inaturalist_id
35 | Red Panda | NULL
40 | Sumatran Orangutan | NULL
```

**Check:** `result, any row order`.

### Lesson 5 · counting

**Concept:** `count`, `GROUP BY`; `AS` names a result column. **Question:** How many animals have each range status?

`count(*)` counts rows. `count(photo_url)` counts only the rows where `photo_url` isn't `NULL`, so the two numbers below differ by the animals with no photo. `AS animals` names the result column.

```sql
-- q: l05-total
-- status: ran
SELECT count(*) AS animals, count(photo_url) AS with_photo
FROM species;
```

```text
-- result: l05-total · 1 row · sha256 30251f2f3e29
animals | with_photo
76 | 74
```

`GROUP BY range_status` puts the rows into groups, one per distinct value of `range_status`, and `count(*)` then counts each group. Every column in the `SELECT` must either be in the `GROUP BY` or be counted (or summed, averaged, …), because each group becomes one row.

```sql
-- q: l05
-- status: ran
SELECT range_status, count(*) AS animals
FROM species
GROUP BY range_status
ORDER BY animals DESC, range_status;
```

```text
-- result: l05 · 3 rows · sha256 985a7cf2aef8
range_status | animals
ok | 72
identity-unsettled | 3
no-open-records | 1
```

The second sort column, `range_status`, settles ties: two groups of the same size always come out in the same order.

**Shown as:** a table; the first query as two large counts.

**Your turn:** How many animals have each photo license? Show `photo_license` and the count as `animals`, largest first. (Animals with no photo form a group of their own, with `NULL` as the license.)

```sql
-- q: l05-ex
-- status: ran
SELECT photo_license, count(*) AS animals
FROM species
GROUP BY photo_license
ORDER BY animals DESC, photo_license;
```

```text
-- result: l05-ex · 11 rows · sha256 61eae971ec13
photo_license | animals
CC BY-SA 4.0 | 24
CC BY-SA 3.0 | 18
CC BY 2.0 | 9
Public domain | 8
CC BY 4.0 | 5
… 6 more rows
```

**Check:** `result, any row order`.

### Lesson 6 · erd

**Concept:** entities and attributes; reading the ERD; the database describes itself. **Question:** Where is each fact stored?

A database is designed around **entities**, the things it keeps facts about (animals, taxa, countries, sources), and their **attributes**, the facts themselves (a name, a rank, a license). Each entity becomes a table; each attribute a column. The **entity relationship diagram** (ERD, the "Schema" button) draws the whole design on one page: a box per table, a line per column with its type, and lines between the boxes for how tables connect. §3 explains every mark; this lesson needs three: `PK` (the column that names a row, lesson 7), `FK` (a column that points at a row of another table, lessons 7 and 8) and the lines.

A database also describes itself, in tables of its own. `information_schema` is a standard set of them, the same in most SQL databases. `information_schema.tables` lists the tables:

```sql
-- q: l06
-- status: ran
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'main'
ORDER BY table_name;
```

```text
-- result: l06 · 7 rows · sha256 3e337557efab
table_name | table_type
countries | BASE TABLE
sources | BASE TABLE
species | BASE TABLE
species_countries | BASE TABLE
species_sources | BASE TABLE
… 2 more rows
```

`BASE TABLE` is a table that stores rows; `VIEW` is a saved query that looks like a table (lesson 13). `information_schema.columns` lists every column, with its data type: `INTEGER` for whole numbers, `BIGINT` for very large ones, `VARCHAR` for text. `ordinal_position` is the column's place in its table:

```sql
-- q: l06-columns
-- status: ran
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'species'
ORDER BY ordinal_position;
```

```text
-- result: l06-columns · 16 rows · sha256 c5d5829a06dd
column_name | data_type
id | INTEGER
slug | VARCHAR
scientific_name | VARCHAR
common_name | VARCHAR
genus | VARCHAR
… 11 more rows
```

**Shown as:** the ERD dialog open beside a table.

**Your turn:** Find on the ERD every table that has a column named `species_id`, then check it with a query on `information_schema.columns`: show `table_name`.

```sql
-- q: l06-ex
-- status: ran
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'species_id'
ORDER BY table_name;
```

```text
-- result: l06-ex · 3 rows · sha256 ee953b2b48fa
table_name
species_countries
species_sources
species_taxonomy
```

**Check:** `result, any row order`. (The view counts: the ERD lists it beside the picture.)

### Lesson 7 · keys

**Concept:** primary key; alternate (natural) keys; foreign keys; constraints. **Question:** Can two animals share an id?

A **key** is a column (or set of columns) whose value picks out exactly one row.
- The **primary key** is the key a table picks as its main one. In `species` it's `id`, critwire's own number for an animal: it never changes and is never reused, even if an animal's name does.
- **Alternate keys** are other columns that are just as unique: `slug` (the short name in critwire's URLs, such as `red-eyed-tree-frog`), `scientific_name`, and the animal's ids on other websites (`gbif_id`, `wikidata_id`, …). `slug` and `scientific_name` are also **natural keys**: they mean something to people, which is also why they can change.
- A **foreign key** is a column whose value must exist as a key in another table. `species.genus` must be the `name` of a row in `taxa`.

The rules a database enforces are called **constraints**. The standard table `information_schema.table_constraints` lists them (DuckDB also lists each `NOT NULL` rule, as a `CHECK`; this query leaves those out):

```sql
-- q: l07
-- status: ran
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'species'
  AND constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
ORDER BY constraint_type, constraint_name;
```

```text
-- result: l07 · 10 rows · sha256 e6eae9d8d6bb
constraint_name | constraint_type
species_genus_name_fkey | FOREIGN KEY
species_id_pkey | PRIMARY KEY
species_col_id_key | UNIQUE
species_gbif_id_key | UNIQUE
species_inaturalist_id_key | UNIQUE
… 5 more rows
```

Any key finds its one animal. By slug:

```sql
-- q: l07-slug
-- status: ran
-- show: cards
SELECT id, slug
FROM species
WHERE slug = 'axolotl';
```

```text
-- result: l07-slug · 1 row · sha256 c1509d22926c
id | slug
74 | axolotl
```

So, can two animals share an id? Try to add a second animal with the tiger's id, 25. `INSERT INTO` adds a row; the columns are listed in brackets, then their values in the same order. The database refuses, and nothing is added:

```sql
-- q: l07-same-id
-- status: ran
-- expect: error violates primary key constraint
INSERT INTO species (id, slug, scientific_name, common_name, genus, range_status)
VALUES (25, 'siberian-tiger', 'Panthera tigris altaica', 'Siberian Tiger', 'Panthera', 'ok');
```

```text
-- result: l07-same-id · error: statement 1 of 1: Constraint Error: Duplicate key "id: 25" violates primary key constraint.
```

**Shown as:** a table; the slug lookup as a card; the refused `INSERT` as the database's error, which Learn shows as the expected outcome.

**Your turn:** Try to add an animal in a genus critwire doesn't have: id 1000, slug `dracula-ant`, scientific name `Dracula ant`, common name `Dracula Ant`, genus `Dracula`, range status `ok`. Which constraint stops it?

```sql
-- q: l07-ex
-- status: ran
-- expect: error Violates foreign key constraint
INSERT INTO species (id, slug, scientific_name, common_name, genus, range_status)
VALUES (1000, 'dracula-ant', 'Dracula ant', 'Dracula Ant', 'Dracula', 'ok');
```

```text
-- result: l07-ex · error: statement 1 of 1: Constraint Error: Violates foreign key constraint because key "name: Dracula" does not exist in the referenced table
```

**Check:** `error` (the foreign key on `genus`: `Dracula` isn't a `name` in `taxa`).

### Lesson 8 · one-to-many

**Concept:** one-to-many relationships; inner join; table aliases. **Question:** Which genus and family is the jaguar in?

`taxa` holds the classification of critwire's animals: every class, order, family and genus, one row each, with its `taxon_rank` and its `parent_name`, the taxon one rank up. Each animal's `genus` points at one row of `taxa`, and one genus can have many animals: a **one-to-many** relationship. On the ERD it's the line `taxa ||--o{ species`: exactly one genus at the `taxa` end, zero or more animals at the `species` end. The family isn't stored in `species` at all; it's in the genus's row, as its `parent_name`.

A **join** puts rows of two tables side by side wherever a condition is true. `JOIN taxa AS g ON g.name = s.genus` pairs each animal with the `taxa` row of its genus. `AS s` and `AS g` are short names (aliases) for the tables, so `s.genus` means "the `genus` column of `species`". A plain `JOIN` (an **inner join**) keeps only rows that found a partner.

```sql
-- q: l08
-- status: ran
-- show: cards
SELECT s.id, s.genus, g.parent_name AS family
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
WHERE s.slug = 'jaguar';
```

```text
-- result: l08 · 1 row · sha256 d23c7fc76384
id | genus | family
51 | Panthera | Felidae
```

Now lesson 3's question, properly. Frogs are the order Anura. The order is two steps up from the genus, so the query joins `taxa` twice: once for the genus's row, once more for the family's row, whose `parent_name` is the order.

```sql
-- q: l08-frogs
-- status: ran
-- show: cards
SELECT s.id, s.common_name, g.parent_name AS family
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
JOIN taxa AS f ON f.name = g.parent_name
WHERE f.parent_name = 'Anura'
ORDER BY s.common_name;
```

```text
-- result: l08-frogs · 12 rows · sha256 dcba99d91d6e
id | common_name | family
8 | Coastal Tailed Frog | Ascaphidae
3 | Darwin Frog | Rhinodermatidae
14 | Desert Rain Frog | Brevicipitidae
9 | Dyeing Poison Dart Frog | Dendrobatidae
76 | Golden Poison Frog | Dendrobatidae
… 7 more rows
```

The Suriname Toad is in this list; the name pattern in lesson 3 missed it.

**Shown as:** cards, with the family on each card.

**Your turn:** Tortoises are the family Testudinidae. Which animals are tortoises? Show their `id` and `common_name`.

```sql
-- q: l08-ex
-- status: ran
-- show: cards
SELECT s.id, s.common_name
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
WHERE g.parent_name = 'Testudinidae'
ORDER BY s.common_name;
```

```text
-- result: l08-ex · 5 rows · sha256 ba1fde517c7d
id | common_name
20 | African Spurred Tortoise
19 | Floreana Giant Tortoise
15 | Pancake Tortoise
22 | Pinta Island Tortoise
21 | Radiated Tortoise
```

**Check:** `result, any row order`.

### Lesson 9 · many-to-many

**Concept:** many-to-many relationships; junction tables; joining through one. **Question:** Which animals have been recorded in Brazil?

One animal has been recorded in many countries, and one country has records of many animals: a **many-to-many** relationship. Neither table can hold it in one column. A `countries` column on `species` would need a list in a single cell (lesson 14 says why that's a problem), and an `animals` column on `countries` would too. So the pairs get a table of their own, a **junction table**: each row of `species_countries` links one animal to one country. Its primary key is the pair (`species_id`, `country_code`), so the same pair can't be listed twice. On the ERD it's two one-to-many lines meeting at `species_countries`.

These are the jaguar's rows (`BR` is Brazil's two-letter country code):

```sql
-- q: l09-pairs
-- status: ran
SELECT species_id, country_code
FROM species_countries
WHERE species_id = 51
ORDER BY country_code;
```

```text
-- result: l09-pairs · 20 rows · sha256 fac5baecc53a
species_id | country_code
51 | AR
51 | BO
51 | BR
51 | BZ
51 | CO
… 15 more rows
```

To get from Brazil to animals, join through the junction table: keep its rows for `BR`, and pair each with its row in `species`.

```sql
-- q: l09
-- status: ran
-- show: cards
SELECT s.id, s.common_name, s.scientific_name
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
WHERE sc.country_code = 'BR'
ORDER BY s.common_name;
```

```text
-- result: l09 · 12 rows · sha256 6eaf98efd284
id | common_name | scientific_name
65 | African Wild Dog | Lycaon pictus
54 | Brown-throated Sloth | Bradypus variegatus
56 | Chimpanzee | Pan troglodytes
52 | Giant Anteater | Myrmecophaga tridactyla
36 | Giant Armadillo | Priodontes maximus
… 7 more rows
```

Look at the cards: the Tiger, the Chimpanzee and the African Wild Dog don't live wild in South America. A row in `species_countries` means the animal *has been recorded in that country in open records* (observations and specimens shared under CC0 or CC BY on GBIF, the Global Biodiversity Information Facility, after critwire's filters). Records of kept or introduced animals, and the odd stray, can count too. It is not the animal's native range, and Learn never calls it that.

**Shown as:** cards, with a note under them that these are open records, not the native range.

**Your turn:** Which animals have been recorded in India (country code `IN`)? Show each animal's `id` and `common_name`.

```sql
-- q: l09-ex
-- status: ran
-- show: cards
SELECT s.id, s.common_name
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
WHERE sc.country_code = 'IN'
ORDER BY s.common_name;
```

```text
-- result: l09-ex · 6 rows · sha256 81a618928f75
id | common_name
28 | Asian Elephant
59 | Indian Pangolin
16 | Purple Frog
35 | Red Panda
24 | Sunda Pangolin
… 1 more row
```

**Check:** `result, any row order`.

### Lesson 10 · countries

**Concept:** lookup tables; codes against names. **Question:** In which countries has the jaguar been recorded?

`species_countries` stores a country as a two-letter code, `BR`, not as "Brazil". The code is short, never changes its spelling, and is the same in every language. Everything else about a country (its name, continent, region and subregion) is stored once, in the **lookup table** `countries`, whose primary key is `code`. One join turns codes into names:

```sql
-- q: l10
-- status: draft-table
SELECT c.code, c.name, c.continent
FROM species_countries AS sc
JOIN countries AS c ON c.code = sc.country_code
WHERE sc.species_id = 51
ORDER BY c.name;
```

```text
-- result: l10 · 20 rows · sha256 2884cb4f7b3b
code | name | continent
AR | Argentina | South America
BZ | Belize | North America
BO | Bolivia | South America
BR | Brazil | South America
CO | Colombia | South America
… 15 more rows
```

If a country's name changed, one row of `countries` would change, and every animal's list would show the new name. Had each animal stored the name itself, every copy would have to change, and a missed one would disagree with the rest.

As in lesson 9, this is where the jaguar has been *recorded in open records*: the list can include countries where a record exists for another reason than a wild population.

**Shown as:** a table (it's about countries, not animals).

**Your turn:** On which continents has the Tiger (id 25) been recorded, and in how many countries on each? Show `continent` and the count as `recorded_in`, largest first. (The answer shows open records at work: zoos and introductions count.)

```sql
-- q: l10-ex
-- status: draft-table
SELECT c.continent, count(*) AS recorded_in
FROM species_countries AS sc
JOIN countries AS c ON c.code = sc.country_code
WHERE sc.species_id = 25
GROUP BY c.continent
ORDER BY recorded_in DESC, c.continent;
```

```text
-- result: l10-ex · 5 rows · sha256 1ff0bb972489
continent | recorded_in
Asia | 11
Europe | 2
Africa | 1
North America | 1
South America | 1
```

**Check:** `result, any row order`.

### Lesson 11 · left-join

**Concept:** `LEFT JOIN`; `NULL` from a missing partner. **Question:** Which animals have no country records, and why?

A plain `JOIN` keeps only rows that found a partner, so an animal with no rows in `species_countries` drops out of every query in lessons 9 and 10 without a word. A **left join** keeps every row of the table on its left (the one before `LEFT JOIN`), partner or not. Where there's no partner, the right table's columns come back as `NULL`. So `WHERE sc.species_id IS NULL` keeps exactly the animals with no country rows:

```sql
-- q: l11
-- status: ran
-- show: cards
SELECT s.id, s.common_name, s.range_status
FROM species AS s
LEFT JOIN species_countries AS sc ON sc.species_id = s.id
WHERE sc.species_id IS NULL
ORDER BY s.id;
```

```text
-- result: l11 · 4 rows · sha256 f5fd7b6feb3f
id | common_name | range_status
9 | Dyeing Poison Dart Frog | identity-unsettled
19 | Floreana Giant Tortoise | identity-unsettled
27 | Western Long-beaked Echidna | identity-unsettled
47 | Ili Pika | no-open-records
```

These are lesson 4's animals, and `range_status` says why each has no list: critwire isn't yet sure which GBIF taxon is the animal (`identity-unsettled`), or no country with open records was left after critwire's filters (`no-open-records`). Neither means "lives nowhere".

`count(sc.country_code)` counts only rows with a partner, so with a left join, animals without any get 0 instead of vanishing:

```sql
-- q: l11-count
-- status: ran
-- show: cards
SELECT s.id, s.common_name, count(sc.country_code) AS recorded_in
FROM species AS s
LEFT JOIN species_countries AS sc ON sc.species_id = s.id
GROUP BY s.id, s.common_name
ORDER BY recorded_in, s.id
LIMIT 6;
```

```text
-- result: l11-count · 6 rows · sha256 805e3ccfb46f
id | common_name | recorded_in
9 | Dyeing Poison Dart Frog | 0
19 | Floreana Giant Tortoise | 0
27 | Western Long-beaked Echidna | 0
47 | Ili Pika | 0
13 | Madagascar Tomato Frog | 1
… 1 more row
```

**Shown as:** cards, with `range_status` or `recorded_in` on each.

**Your turn:** Turn it around. Which countries in Africa have no animal recorded in critwire's open records yet? Show `code` and `name`. (Put `countries` on the left.)

```sql
-- q: l11-ex
-- status: draft-table
SELECT c.code, c.name
FROM countries AS c
LEFT JOIN species_countries AS sc ON sc.country_code = c.code
WHERE c.continent = 'Africa' AND sc.country_code IS NULL
ORDER BY c.name;
```

```text
-- result: l11-ex · 8 rows · sha256 1895951860be
code | name
BI | Burundi
CV | Cape Verde
DJ | Djibouti
ER | Eritrea
LS | Lesotho
… 3 more rows
```

**Check:** `result, any row order`.

### Lesson 12 · hierarchy

**Concept:** a table that points at itself; trees; self-joins; what a foreign key can't check. **Question:** How many mammals, amphibians and reptiles does critwire have?

Each row of `taxa` has a `parent_name`, and that column is a foreign key to `taxa` itself: a genus points at its family, a family at its order, an order at its class, and a class at nothing (`NULL`). Rows pointing at rows of their own table form a **tree**. On the ERD it's the line from `taxa` back to `taxa`. One step down the tree, the families in the order Carnivora:

```sql
-- q: l12-tree
-- status: ran
SELECT name, taxon_rank
FROM taxa
WHERE parent_name = 'Carnivora'
ORDER BY name;
```

```text
-- result: l12-tree · 5 rows · sha256 a6b677895a4f
name | taxon_rank
Ailuridae | family
Canidae | family
Felidae | family
Mustelidae | family
Ursidae | family
```

To climb from an animal's genus to its class takes one join per step, each on `taxa` again under a new alias (`g`, `f`, `o`, `c`). Joining a table to itself is a **self-join**; lesson 8 already did one.

```sql
-- q: l12
-- status: ran
SELECT c.name AS class, count(*) AS animals
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
JOIN taxa AS f ON f.name = g.parent_name
JOIN taxa AS o ON o.name = f.parent_name
JOIN taxa AS c ON c.name = o.parent_name
GROUP BY c.name
ORDER BY c.name;
```

```text
-- result: l12 · 3 rows · sha256 f695fe57da4f
class | animals
Amphibia | 15
Mammalia | 50
Reptilia | 11
```

**What the foreign key can't check.** `species.genus` must name a row of `taxa`, but nothing makes sure that row is a *genus*. Here a test animal goes in with a family, Felidae, as its genus, and the database accepts it (in the lesson this runs and is rolled back; on the page, Reset removes it):

```sql
-- q: l12-limit
-- status: ran
INSERT INTO species (id, slug, scientific_name, common_name, genus, range_status)
VALUES (1001, 'test-cat', 'Testcat testus', 'Test Cat', 'Felidae', 'ok');
SELECT s.id, s.genus, t.taxon_rank
FROM species AS s
JOIN taxa AS t ON t.name = s.genus
WHERE s.id = 1001;
```

```text
-- result: l12-limit · 1 row · sha256 ae4f2f0c9a55
id | genus | taxon_rank
1001 | Felidae | family
```

A foreign key checks that the value exists, nothing more. A check constraint can't help, because it sees only its own row, not the `taxa` row the genus points at. Enforcing it would take a trigger (code the database runs on every insert; DuckDB has none) or one table per rank, so critwire's data build checks it instead. That animal would now drop out of the class count above, because its "genus" is two steps from a class instead of three.

**Shown as:** a table.

**Your turn:** How many orders does each class have? Join `taxa` to itself once: each order's `parent_name` is its class. Show `class` and the count as `orders`.

```sql
-- q: l12-ex
-- status: ran
SELECT c.name AS class, count(*) AS orders
FROM taxa AS o
JOIN taxa AS c ON c.name = o.parent_name
WHERE o.taxon_rank = 'order'
GROUP BY c.name
ORDER BY c.name;
```

```text
-- result: l12-ex · 3 rows · sha256 0e9921e3a16c
class | orders
Amphibia | 2
Mammalia | 19
Reptilia | 1
```

**Check:** `result, any row order`.

### Lesson 13 · views

**Concept:** `CREATE VIEW`: a saved query that works like a table. **Question:** Can "animals with their class" be saved, so the four joins aren't typed every time?

A **view** is a query with a name. `CREATE VIEW name AS SELECT …` stores the query, not its rows; every time you read the view, the database runs the query again, so a view never goes out of date. You read it like a table:

```sql
-- q: l13
-- status: ran
CREATE VIEW animal_classes AS
SELECT s.id, s.common_name, c.name AS class
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
JOIN taxa AS f ON f.name = g.parent_name
JOIN taxa AS o ON o.name = f.parent_name
JOIN taxa AS c ON c.name = o.parent_name;

SELECT id, common_name
FROM animal_classes
WHERE class = 'Reptilia'
ORDER BY common_name;
```

```text
-- result: l13 · 11 rows · sha256 1a31521ac0db
id | common_name
20 | African Spurred Tortoise
4 | Big-headed Turtle
1 | Blanding's Turtle
19 | Floreana Giant Tortoise
15 | Pancake Tortoise
… 6 more rows
```

critwire's setup already made one view: `species_taxonomy` (lesson 6 listed it as a `VIEW`) holds each animal's `class`, `order_name`, `family` and `genus`, so later queries can join it instead of climbing the tree. On the page, a view you create lasts until Reset; creating it a second time fails, because the name is taken.

**Shown as:** a table.

**Your turn:** Create a view `country_counts` with each animal's `id`, `common_name`, and the number of countries it has been recorded in, as `recorded_in` (animals with none count 0: lesson 11). Then show the five rows with the highest `recorded_in`, highest first, ties by `id`.

```sql
-- q: l13-ex
-- status: ran
CREATE VIEW country_counts AS
SELECT s.id, s.common_name, count(sc.country_code) AS recorded_in
FROM species AS s
LEFT JOIN species_countries AS sc ON sc.species_id = s.id
GROUP BY s.id, s.common_name;

SELECT id, common_name, recorded_in
FROM country_counts
ORDER BY recorded_in DESC, id
LIMIT 5;
```

```text
-- result: l13-ex · 5 rows · sha256 899c27b1d994
id | common_name | recorded_in
64 | African Savanna Elephant | 32
56 | Chimpanzee | 27
58 | Cheetah | 22
57 | Aardvark | 21
51 | Jaguar | 20
```

**Check:** `result, in order` (on the last statement's rows).

### Lesson 14 · normalization

**Concept:** normalization (first, second and third normal form); from a nested file to flat tables. **Question:** How does a record with a list of countries become rows?

critwire publishes each animal as one record (`/v1/species.parquet`), with lists inside it: the countries, the sources. The learners' tables have no lists. Turning one into the other follows a set of rules called **normalization**. Each rule, or **normal form**, removes one way a table can contradict itself.

The next two queries read critwire's file directly. They use DuckDB's own SQL, not standard SQL: `read_parquet` opens a file, `"range".countriesWithOpenRecords` reaches into the record, and `unnest` turns a list into rows. Learn's setup uses exactly these to build the tables. Here is the jaguar's record, with its countries as one list in one cell:

```sql
-- q: l14-list
-- status: ran
-- DuckDB only: reads the published file, not a learners' table
SELECT id, slug, "range".countriesWithOpenRecords AS country_codes
FROM read_parquet('species.parquet')
WHERE slug = 'jaguar';
```

```text
-- result: l14-list · 1 row · sha256 2aac6d391e87
id | slug | country_codes
51 | jaguar | [AR, BO, BR, BZ, CO, CR, EC, GF, GT, GY, HN, MX, NI, PA, PE,…
```

- **First normal form (1NF): one value per cell.** A list in a cell can't be joined, counted or checked against `countries` with a foreign key. `unnest` gives each list item its own row, which is how `species_countries` is filled:

```sql
-- q: l14-unnest
-- status: ran
-- DuckDB only: unnest turns a list into rows
SELECT id, unnest("range".countriesWithOpenRecords) AS country_code
FROM read_parquet('species.parquet')
WHERE slug = 'jaguar'
ORDER BY country_code;
```

```text
-- result: l14-unnest · 20 rows · sha256 b463f81200a2
id | country_code
51 | AR
51 | BO
51 | BR
51 | BZ
51 | CO
… 15 more rows
```

- **Second normal form (2NF): every column depends on the whole key.** The key of `species_countries` is (`species_id`, `country_code`). A country's name depends on `country_code` alone, so a `country_name` column there would repeat "Brazil" once per animal recorded in Brazil. It lives in `countries` (lesson 10).
- **Third normal form (3NF): no column depends on another non-key column.** An animal's family depends on its genus, not on the animal: every *Panthera* is in Felidae. So `species` stores only the genus, and the family is in the genus's `taxa` row (lesson 8). A flat table with a `family` column would repeat each family once per animal, and one mistyped copy would put an animal in two families. These families would be repeated (`HAVING` filters groups after `GROUP BY`, as `WHERE` filters rows before it):

```sql
-- q: l14-repeat
-- status: ran
SELECT g.parent_name AS family, count(*) AS animals
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
GROUP BY g.parent_name
HAVING count(*) > 1
ORDER BY animals DESC, family;
```

```text
-- result: l14-repeat · 16 rows · sha256 edbe3098db04
family | animals
Testudinidae | 5
Bovidae | 4
Manidae | 4
Canidae | 3
Elephantidae | 3
… 11 more rows
```

Normalizing has a cost: answers need joins. Views (lesson 13) give the joins a name, so the data stays stored once and is still easy to read.

**Shown as:** a table; the list cell shown as `[AR, BO, …]`.

**Your turn:** Using `unnest` on the file, list the Tiger's (id 25) country codes, sorted, as `country_code`. Then compare with `SELECT country_code FROM species_countries WHERE species_id = 25`: it's the same list, because the setup built the table this way.

```sql
-- q: l14-ex
-- status: ran
SELECT unnest("range".countriesWithOpenRecords) AS country_code
FROM read_parquet('species.parquet')
WHERE id = 25
ORDER BY country_code;
```

```text
-- result: l14-ex · 16 rows · sha256 786dc3ee478e
country_code
BD
BR
BT
CN
DE
… 11 more rows
```

**Check:** `result, any row order` (the query on `species_countries` passes too).

### Lesson 15 · sources

**Concept:** provenance (where each fact came from); licenses; share-alike. **Question:** Who filled in the jaguar's facts, and which photos are share-alike?

critwire's facts come from other open projects, and each one's license says how it may be reused. `species_sources` records, for every animal, which source supplied which field (`field` is a path in critwire's record: `taxonomy`, `ids.col`, `range.countriesWithOpenRecords`, …), and `sources` holds each source's license and the date critwire retrieved it. `critwire base` marks critwire's own fields.

```sql
-- q: l15
-- status: ran
SELECT ss.field, ss.source_name, so.license, so.retrieved
FROM species_sources AS ss
JOIN sources AS so ON so.name = ss.source_name
WHERE ss.species_id = 51
ORDER BY ss.field;
```

```text
-- result: l15 · 8 rows · sha256 bc64a29cc0b4
field | source_name | license | retrieved
ids.col | Catalogue of Life | CC BY 4.0 | 2026-10-20
ids.gbif | GBIF Backbone Taxonomy | CC BY 4.0 | 2026-10-21
ids.inaturalist | Wikidata | CC0 1.0 | 2026-10-20
ids.iucn | critwire base | CC BY 4.0 | NULL
ids.ncbi | Wikidata | CC0 1.0 | 2026-10-20
… 3 more rows
```

Read it as provenance: the taxonomy is from the Catalogue of Life, the outside ids from Wikidata and GBIF, and the country list from GBIF's occurrence search, counting only open (CC0 and CC BY) records, which is why lessons 9–11 say "recorded in open records". `ids.iucn` is critwire's own: critwire stores only the animal's id at the IUCN Red List, never the Red List's data, because the Red List's terms of use don't allow critwire to republish it.

Photos carry their own license. CC0 and public domain photos can be reused freely; CC BY needs the credit; **CC BY-SA** ("share-alike") also requires that anything made from the photo be shared under the same license. That's why every card shows its photo's credit and license, linked to the license's text.

```sql
-- q: l15-sa
-- status: ran
SELECT photo_license, count(*) AS photos
FROM species
WHERE photo_license LIKE 'CC BY-SA%'
GROUP BY photo_license
ORDER BY photo_license;
```

```text
-- result: l15-sa · 5 rows · sha256 56e8889fea9a
photo_license | photos
CC BY-SA 2.0 | 3
CC BY-SA 2.0 de | 2
CC BY-SA 2.5 | 2
CC BY-SA 3.0 | 18
CC BY-SA 4.0 | 24
```

**Shown as:** a table.

**Your turn:** For which animals did the taxonomy come from `critwire base` instead of the Catalogue of Life (because the Catalogue's match for them isn't settled)? Show `id` and `common_name`.

```sql
-- q: l15-ex
-- status: ran
SELECT s.id, s.common_name
FROM species AS s
JOIN species_sources AS ss ON ss.species_id = s.id
WHERE ss.field = 'taxonomy' AND ss.source_name = 'critwire base'
ORDER BY s.id;
```

```text
-- result: l15-ex · 7 rows · sha256 603b3b920537
id | common_name
7 | Hairy Frog
9 | Dyeing Poison Dart Frog
22 | Pinta Island Tortoise
27 | Western Long-beaked Echidna
59 | Indian Pangolin
… 2 more rows
```

**Check:** `result, any row order`.

### Lesson 16 · design

**Concept:** designing tables for new data; `CREATE TABLE` with keys. **Question:** How would critwire store body mass and diet?

critwire will grow, and traits such as body mass and diet are likely next. Designing their tables uses everything so far:
- **One column per trait on `species`** (`body_mass_kg`, `diet`) is simple, but every new trait changes `species`, most cells stay `NULL`, and there's nowhere to say which source gave each value.
- **A table of traits, and a junction table of values.** `traits` lists each trait once, with its unit (a trait's unit depends on the trait, not on the animal: 3NF). `species_traits` holds one row per animal and trait, with the value and the source that supplied it (lesson 15). A new trait is a new row, not a new column. The cost: one `value` column holds every trait, so it's text, and sorting by body mass needs `CAST(value AS DOUBLE)`.

The second design fits critwire's other tables. Its primary key (`species_id`, `trait_name`) allows one value per trait per animal; a trait with several values per animal (an animal that eats both fruit and insects) would need `value` in the key too. These are the questions a design answers before any data goes in. The traits table first (names and units, not facts about animals):

```sql
-- q: l16
-- status: ran
CREATE TABLE traits (
  name        VARCHAR PRIMARY KEY,
  unit        VARCHAR,
  description VARCHAR NOT NULL
);

INSERT INTO traits VALUES
  ('body_mass', 'kg', 'average adult body mass'),
  ('diet', NULL, 'what the animal mainly eats');

SELECT name, unit, description FROM traits ORDER BY name;
```

```text
-- result: l16 · 2 rows · sha256 a7fe21fb63b8
name | unit | description
body_mass | kg | average adult body mass
diet | NULL | what the animal mainly eats
```

The ERD gains a table and three lines (the same notation as §3):

```text
traits ||--o{ species_traits : "values of"
species ||--o{ species_traits : "has traits"
sources ||--o{ species_traits : "supplies"
```

**Shown as:** the ERD with the new lines drawn in, and a table.

**Your turn:** Run the lesson's SQL first, so `traits` exists. Then create `species_traits`: `species_id` (whole number, points at `species`), `trait_name` (text, points at `traits`), `value` (text, required), `source_name` (text, required, points at `sources`), with the primary key (`species_id`, `trait_name`).

```sql
-- q: l16-ex
-- status: ran
-- the lesson's table, run first on the page
CREATE TABLE traits (
  name        VARCHAR PRIMARY KEY,
  unit        VARCHAR,
  description VARCHAR NOT NULL
);

-- the answer
CREATE TABLE species_traits (
  species_id  INTEGER REFERENCES species (id),
  trait_name  VARCHAR REFERENCES traits (name),
  value       VARCHAR NOT NULL,
  source_name VARCHAR NOT NULL REFERENCES sources (name),
  PRIMARY KEY (species_id, trait_name)
);

-- the check's verify query
SELECT 'column' AS kind,
       column_name || ' ' || data_type || CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END AS detail
FROM information_schema.columns
WHERE table_name = 'species_traits'
UNION ALL
SELECT 'key', constraint_text
FROM duckdb_constraints()
WHERE table_name = 'species_traits' AND constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
ORDER BY kind, detail;
```

```text
-- result: l16-ex · 8 rows · sha256 cec372f2d16e
kind | detail
column | source_name VARCHAR NOT NULL
column | species_id INTEGER NOT NULL
column | trait_name VARCHAR NOT NULL
column | value VARCHAR NOT NULL
key | FOREIGN KEY (source_name) REFERENCES sources("name")
… 3 more rows
```

**Check:** `schema`. After the learner's SQL, the page runs the verify query (the last statement above) on the learner's database and compares its rows, in any order, with the expected rows: `l16-ex`'s result block. It reads the standard `information_schema.columns` and DuckDB's `duckdb_constraints()`, whose `constraint_text` is written by DuckDB, not copied from the learner, so `TEXT` for `VARCHAR`, `REFERENCES species` without `(id)`, or `NOT NULL` on a key column all pass. A missing key or a wrong column type fails, with the differing rows as the hint. The expected rows in full (the result block shows five; its hash covers all eight, so `run-queries` proves this list):

| kind | detail |
|---|---|
| column | `source_name VARCHAR NOT NULL` |
| column | `species_id INTEGER NOT NULL` |
| column | `trait_name VARCHAR NOT NULL` |
| column | `value VARCHAR NOT NULL` |
| key | `FOREIGN KEY (source_name) REFERENCES sources("name")` |
| key | `FOREIGN KEY (species_id) REFERENCES species(id)` |
| key | `FOREIGN KEY (trait_name) REFERENCES traits("name")` |
| key | `PRIMARY KEY(species_id, trait_name)` |

### After lesson 16: where the advanced track attaches

Mission A2 designs the spatial and raster lessons; they come after lesson 16 and need nothing in lessons 1–16 to change.
- **They join on the keys that exist:** `species.id` (an occurrence or a habitat value belongs to an animal) and `countries.code` (a country's outline, from the same Natural Earth release as §6, as a geometry column in a new table keyed by `code`).
- **New tables, same rules:** for example `occurrences (id, species_id, country_code, …)` (§2 Room to grow), created after the tables they point at, in the same `setup.sql`.
- **DuckDB's `spatial` extension** loads from critwire's own extension mirror (§1, Q3), so the advanced lessons stay self-hosted. Their SQL is DuckDB's, labelled as in lesson 14; whether they also teach PostGIS's spellings is A2's call.
- **Open records stay open records:** a point in `occurrences` is a record, not a range, as in lessons 9–11.

## 5. Cookbook

Queries a game or an app can run on the learners' tables as they are. Each entry says what a game uses it for, then gives the SQL and its result on today's data. They are standard SQL, with a few tools the lessons don't teach: `WITH` (a named sub-query, a "common table expression"), window functions (`row_number() OVER (…)`) and `WITH RECURSIVE`. No lesson depends on them, so a learner can read the cookbook after lesson 13 (views) or not at all.

**Parameters.** A game passes its own values (an animal's id, a country code, a date, a seed) through `?` placeholders, which the engine binds in order (`engine.runScript(text, params)`, §1). A value is never pasted into the SQL text, so nothing a player types can change the query. In this document each query's example values sit on its `-- params:` line, and run-queries binds them. A query that needs more than one value, or one value twice, binds each once in a first `WITH p AS (SELECT CAST(? AS …) AS …)` and uses it by name; the `CAST` fixes the type, since a JavaScript number arrives as a `DOUBLE`.

**The same for everyone.** A game's "random" pick has to be the same for every player on the same day or seed, and the same every time the query runs, so nothing calls `random()`. A **shuffle key** mixes an animal's id with a seed by plain arithmetic instead:

`(id * 619 + seed * 211) % 1009`

1009 is a prime and 619 isn't a multiple of it, so every id below 1009 gets a different key: sorting by it never ties, and gives a shuffled deck that's the same everywhere (once ids pass 1009, ties are broken by `id`). Another seed starts the deck at another place. A date comes in as a parameter (the player's date in UTC), never as `current_date`, so a result depends only on its inputs and the data. When the data grows, the picks change too: a new animal joins every deck.

**How a game loads one.** Mission B2 keeps each query in its own file, `site/learn/cookbook/<id>.sql` (`c01.sql`, …), which the page bundle imports as text. The cookbook page, the game and the E2E suite run that same file. The `-- params:` line exists only in this document: the cookbook page shows the example values in small inputs above the editor, and a game passes its own. Pure functions turn the rows into game state, and cards are drawn by the same card component the lessons use, with the species ids passed in explicitly.

Countries mean what they mean in lessons 9–11: the animal was *recorded there in open records*. Games that use them say "recorded in", never "lives in".

### c01 · Animal of the day

**Game use:** a daily card on the Learn home page or in the demo, the same for everyone on the same UTC date; the next day brings the next animal, and every animal gets its day before any repeats.

The deck is every animal sorted by its shuffle key (seed 0), numbered from 0. The day number (days since 2000-01-01) modulo the deck's size says which card is today's.

```sql
-- q: c01
-- status: ran
-- params: ["2026-10-22"]
-- show: cards
WITH p AS (SELECT CAST(? AS DATE) - DATE '2000-01-01' AS day_number),
deck AS (
  SELECT id, common_name, scientific_name,
         row_number() OVER (ORDER BY (id * 619) % 1009, id) - 1 AS position,
         count(*) OVER () AS deck_size
  FROM species
)
SELECT d.id, d.common_name, d.scientific_name
FROM deck AS d CROSS JOIN p
WHERE d.position = p.day_number % d.deck_size;
```

```text
-- result: c01 · 1 row · sha256 b44e31f2e1f7
id | common_name | scientific_name
47 | Ili Pika | Ochotona iliensis
```

On the example date the pick has no photo, so its card shows the "No photo yet" state.

### c02 · Name that animal

**Game use:** a quiz round: the game shows the answer's photo and four names as buttons. The three wrong names come from the same class as the answer (a mammal among mammals), so the round can't be won by spotting the only frog. The game draws the answer from c09's photo deck and uses the round number as the seed.

```sql
-- q: c02
-- status: ran
-- params: [51, 3]
WITH p AS (SELECT CAST(? AS INTEGER) AS answer_id, CAST(? AS INTEGER) AS seed),
answer AS (
  SELECT t.species_id, t.class
  FROM species_taxonomy AS t JOIN p ON t.species_id = p.answer_id
),
decoys AS (
  SELECT t.species_id
  FROM species_taxonomy AS t
  JOIN answer AS a ON t.class = a.class AND t.species_id <> a.species_id
  CROSS JOIN p
  ORDER BY (t.species_id * 619 + p.seed * 211) % 1009, t.species_id
  LIMIT 3
),
choices AS (
  SELECT species_id, true AS is_answer FROM answer
  UNION ALL
  SELECT species_id, false FROM decoys
)
SELECT s.id, s.common_name, c.is_answer
FROM choices AS c
JOIN species AS s ON s.id = c.species_id
CROSS JOIN p
ORDER BY (s.id * 619 + p.seed * 211) % 1009, s.id;
```

```text
-- result: c02 · 4 rows · sha256 3a0ca512ed1d
id | common_name | is_answer
43 | Goodfellow's Tree-kangaroo | false
30 | Pygmy Three-toed Sloth | false
61 | Indri | false
51 | Jaguar | true
```

The last `ORDER BY` shuffles the buttons too, so the answer isn't always first.

### c03 · Who's been recorded here?

**Game use:** "pick a country": a map or a list of countries, and the animals recorded there as cards. An app can use it for "animals recorded where I live".

```sql
-- q: c03
-- status: ran
-- params: ["MX"]
-- show: cards
SELECT s.id, s.common_name, s.scientific_name
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
WHERE sc.country_code = ?
ORDER BY s.common_name;
```

```text
-- result: c03 · 10 rows · sha256 4e5ac7dfa4cd
id | common_name | scientific_name
50 | Addax | Addax nasomaculatus
20 | African Spurred Tortoise | Centrochelys sulcata
74 | Axolotl | Ambystoma mexicanum
70 | Baird's Tapir | Tapirus bairdii
26 | Black-footed Ferret | Mustela nigripes
… 5 more rows
```

### c04 · Neighbours

**Game use:** "who else is around?": after a player picks an animal, the animals recorded in the most of the same countries, as cards to collect next.

The junction table joined to itself: one copy holds the chosen animal's countries, the other every other animal recorded in those countries.

```sql
-- q: c04
-- status: ran
-- params: [51]
-- show: cards
SELECT other.species_id AS id, s.common_name, count(*) AS shared_countries
FROM species_countries AS mine
JOIN species_countries AS other
  ON other.country_code = mine.country_code AND other.species_id <> mine.species_id
JOIN species AS s ON s.id = other.species_id
WHERE mine.species_id = ?
GROUP BY other.species_id, s.common_name
ORDER BY shared_countries DESC, s.common_name
LIMIT 5;
```

```text
-- result: c04 · 5 rows · sha256 d1a3b03022f2
id | common_name | shared_countries
52 | Giant Anteater | 14
54 | Brown-throated Sloth | 12
53 | Lowland Tapir | 12
73 | Giant Otter | 11
36 | Giant Armadillo | 10
```

### c05 · Family tree

**Game use:** the "family tree" panel on an animal's card, from class down to genus; a game can reveal it one rank at a time as hints.

`WITH RECURSIVE` walks the hierarchy that lesson 12 joined by hand: start at the animal's genus, then repeatedly add the parent of the last row, until a class (which has no parent) ends the walk. It works whatever the number of ranks, so it keeps working if critwire adds ranks such as subfamily.

```sql
-- q: c05
-- status: ran
-- params: [51]
WITH RECURSIVE lineage AS (
  SELECT t.name, t.taxon_rank, t.parent_name, 1 AS depth
  FROM species AS s JOIN taxa AS t ON t.name = s.genus
  WHERE s.id = ?
  UNION ALL
  SELECT t.name, t.taxon_rank, t.parent_name, l.depth + 1
  FROM lineage AS l JOIN taxa AS t ON t.name = l.parent_name
)
SELECT taxon_rank, name
FROM lineage
ORDER BY depth DESC;
```

```text
-- result: c05 · 4 rows · sha256 5b4fa2cc93c6
taxon_rank | name
class | Mammalia
order | Carnivora
family | Felidae
genus | Panthera
```

### c06 · Odd one out

**Game use:** four cards, three from one family and one from another family of the same class; the player finds the odd one. The seed picks the family (one with at least three animals) and the cards.

```sql
-- q: c06
-- status: ran
-- params: [5]
-- show: cards
WITH p AS (SELECT CAST(? AS INTEGER) AS seed),
families AS (
  SELECT family, class,
         row_number() OVER (ORDER BY family) - 1 AS position,
         count(*) OVER () AS family_count
  FROM species_taxonomy
  GROUP BY family, class
  HAVING count(*) >= 3
),
pick AS (
  SELECT f.family, f.class FROM families AS f CROSS JOIN p
  WHERE f.position = p.seed % f.family_count
),
trio AS (
  SELECT t.species_id, false AS is_odd
  FROM species_taxonomy AS t JOIN pick ON t.family = pick.family CROSS JOIN p
  ORDER BY (t.species_id * 619 + p.seed * 211) % 1009, t.species_id
  LIMIT 3
),
odd AS (
  SELECT t.species_id, true AS is_odd
  FROM species_taxonomy AS t JOIN pick ON t.class = pick.class AND t.family <> pick.family CROSS JOIN p
  ORDER BY (t.species_id * 619 + p.seed * 211) % 1009, t.species_id
  LIMIT 1
),
choices AS (
  SELECT * FROM trio
  UNION ALL
  SELECT * FROM odd
)
SELECT s.id, s.common_name, t.family, c.is_odd
FROM choices AS c
JOIN species AS s ON s.id = c.species_id
JOIN species_taxonomy AS t ON t.species_id = s.id
CROSS JOIN p
ORDER BY (s.id * 619 + p.seed * 211) % 1009, s.id;
```

```text
-- result: c06 · 4 rows · sha256 428125ba9cf2
id | common_name | family | is_odd
18 | Yangtze Giant Softshell Turtle | Trionychidae | true
15 | Pancake Tortoise | Testudinidae | false
20 | African Spurred Tortoise | Testudinidae | false
22 | Pinta Island Tortoise | Testudinidae | false
```

The game hides `family` and `is_odd` until the player has chosen; here they show what the round contains.

### c07 · Countries with the most animals

**Game use:** a leaderboard of countries, and the list a "pick a country" screen (c03) starts from.

```sql
-- q: c07
-- status: draft-table
SELECT c.code, c.name, count(*) AS animals
FROM species_countries AS sc
JOIN countries AS c ON c.code = sc.country_code
GROUP BY c.code, c.name
ORDER BY animals DESC, c.name
LIMIT 10;
```

```text
-- result: c07 · 10 rows · sha256 aa6f262a5ae4
code | name | animals
US | United States of America | 30
KE | Kenya | 15
BR | Brazil | 12
CO | Colombia | 10
MX | Mexico | 10
… 5 more rows
```

### c08 · A team of five

**Game use:** a seeded team for a card battle or a collection challenge: five animals, no two from the same family. Every player with the same seed gets the same team.

Each family's animals are numbered by shuffle key, and only each family's first one stays; the five lowest keys among those make the team.

```sql
-- q: c08
-- status: ran
-- params: [42]
-- show: cards
WITH p AS (SELECT CAST(? AS INTEGER) AS seed),
keyed AS (
  SELECT t.species_id, t.family, (t.species_id * 619 + p.seed * 211) % 1009 AS shuffle
  FROM species_taxonomy AS t CROSS JOIN p
),
ranked AS (
  SELECT species_id, family, shuffle,
         row_number() OVER (PARTITION BY family ORDER BY shuffle, species_id) AS nth
  FROM keyed
)
SELECT s.id, s.common_name, r.family
FROM ranked AS r
JOIN species AS s ON s.id = r.species_id
WHERE r.nth = 1
ORDER BY r.shuffle, s.id
LIMIT 5;
```

```text
-- result: c08 · 5 rows · sha256 1036432de040
id | common_name | family
46 | Golden-rumped Sengi | Macroscelididae
2 | Spiny Softshell Turtle | Trionychidae
33 | Ethiopian Wolf | Canidae
64 | African Savanna Elephant | Elephantidae
20 | African Spurred Tortoise | Testudinidae
```

### c09 · The photo deck

**Game use:** the deck for every round that shows a photo (c02's answers, a memory game): animals without a photo are left out, so no round asks a player to recognise a placeholder.

```sql
-- q: c09
-- status: ran
-- show: cards
SELECT id, common_name
FROM species
WHERE photo_url IS NOT NULL
ORDER BY id;
```

```text
-- result: c09 · 74 rows · sha256 ca363718a2ab
id | common_name
1 | Blanding's Turtle
2 | Spiny Softshell Turtle
3 | Darwin Frog
4 | Big-headed Turtle
5 | Wallace's Flying Frog
… 69 more rows
```

### c10 · Twenty questions

**Game use:** a guessing game that reveals clues one at a time, from the vaguest (class) to the most telling (genus), with the number of countries the animal was recorded in as an extra clue. Fewer clues used, more points.

`LEFT JOIN` keeps an animal with no country records, with a count of 0 (lesson 11).

```sql
-- q: c10
-- status: ran
-- params: [74]
SELECT t.class, t.order_name, t.family, t.genus, count(sc.country_code) AS countries_recorded
FROM species_taxonomy AS t
LEFT JOIN species_countries AS sc ON sc.species_id = t.species_id
WHERE t.species_id = ?
GROUP BY t.class, t.order_name, t.family, t.genus;
```

```text
-- result: c10 · 1 row · sha256 a39c38325d74
class | order_name | family | genus | countries_recorded
Amphibia | Caudata | Ambystomatidae | Ambystoma | 4
```

### c11 · Close cousins

**Game use:** "match the cousins": pairs of animals in the same genus, for a matching or memory game where each pair is two cards.

`species` joined to itself on `genus`; `b.id > a.id` keeps each pair once (not the Tiger with itself, and not both Tiger–Jaguar and Jaguar–Tiger).

```sql
-- q: c11
-- status: ran
SELECT a.genus, a.id AS first_id, a.common_name AS first_name, b.id AS second_id, b.common_name AS second_name
FROM species AS a
JOIN species AS b ON b.genus = a.genus AND b.id > a.id
ORDER BY a.genus, a.id, b.id;
```

```text
-- result: c11 · 8 rows · sha256 7e768cbe50bb
genus | first_id | first_name | second_id | second_name
Bradypus | 30 | Pygmy Three-toed Sloth | 54 | Brown-throated Sloth
Chelonoidis | 19 | Floreana Giant Tortoise | 22 | Pinta Island Tortoise
Loxodonta | 41 | African Forest Elephant | 64 | African Savanna Elephant
Manis | 24 | Sunda Pangolin | 59 | Indian Pangolin
Panthera | 25 | Tiger | 51 | Jaguar
… 3 more rows
```

### c12 · Could they meet?

**Game use:** the player picks two animals and guesses whether they've ever been recorded in the same country; the answer lists the countries. No rows means never.

```sql
-- q: c12
-- status: ran
-- params: [25, 28]
SELECT a.country_code
FROM species_countries AS a
JOIN species_countries AS b ON b.country_code = a.country_code
WHERE a.species_id = ? AND b.species_id = ?
ORDER BY a.country_code;
```

```text
-- result: c12 · 13 rows · sha256 5d7501ceb7c8
country_code
BD
BT
CN
DE
ID
… 8 more rows
```

The Tiger and the Asian Elephant share countries in Asia, and some outside it, such as Germany (`DE`): animals kept in zoos have open records too.

### c13 · Search box

**Game use:** the search box of the playground or a game's "pick an animal" screen: animals whose common or scientific name contains what the player typed, in any mix of capitals.

`lower` on both sides makes the match ignore capitals; `||` joins strings, so the pattern is `%` + the text + `%` (`%` matches any run of characters, lesson 3). A `%` the player types also acts as a wildcard, and so does `_` (any one character); a search box can live with that.

```sql
-- q: c13
-- status: ran
-- params: ["PANG"]
-- show: cards
WITH p AS (SELECT '%' || lower(CAST(? AS VARCHAR)) || '%' AS pattern)
SELECT s.id, s.common_name, s.scientific_name
FROM species AS s CROSS JOIN p
WHERE lower(s.common_name) LIKE p.pattern OR lower(s.scientific_name) LIKE p.pattern
ORDER BY s.common_name;
```

```text
-- result: c13 · 4 rows · sha256 34ad113aeaa0
id | common_name | scientific_name
55 | Giant Pangolin | Smutsia gigantea
59 | Indian Pangolin | Manis crassicaudata
24 | Sunda Pangolin | Manis javanica
63 | Temminck's Pangolin | Smutsia temminckii
```

### c14 · Higher or lower

**Game use:** two cards side by side; the player guesses which animal has been recorded in more countries. The winner stays for the next round, and a tie counts for either guess. The game draws both animals from those with `range_status = 'ok'`, since for the others a count of 0 means "not settled", not "nowhere" (lesson 11).

```sql
-- q: c14
-- status: ran
-- params: [25, 74]
-- show: cards
WITH p AS (SELECT CAST(? AS INTEGER) AS first_id, CAST(? AS INTEGER) AS second_id)
SELECT s.id, s.common_name, count(sc.country_code) AS countries_recorded
FROM species AS s
CROSS JOIN p
LEFT JOIN species_countries AS sc ON sc.species_id = s.id
WHERE s.id IN (p.first_id, p.second_id)
GROUP BY s.id, s.common_name, p.first_id
ORDER BY s.id <> p.first_id;
```

```text
-- result: c14 · 2 rows · sha256 ea9a494e640f
id | common_name | countries_recorded
25 | Tiger | 16
74 | Axolotl | 4
```

`ORDER BY s.id <> p.first_id` sorts by a true/false value (false first), so the first card the game passed in comes first. The game hides `countries_recorded` until the player has guessed.

### c15 · Guess the class

**Game use:** one card and a button per class (amphibian, mammal, reptile); the player picks the class. The buttons come from `taxa`, so a class critwire adds later gets its own button without a code change.

```sql
-- q: c15
-- status: ran
-- params: [74]
WITH p AS (SELECT CAST(? AS INTEGER) AS answer_id)
SELECT c.name AS class, c.name = t.class AS is_answer
FROM taxa AS c
CROSS JOIN p
JOIN species_taxonomy AS t ON t.species_id = p.answer_id
WHERE c.taxon_rank = 'class'
ORDER BY c.name;
```

```text
-- result: c15 · 3 rows · sha256 6b81753df071
class | is_answer
Amphibia | true
Mammalia | false
Reptilia | false
```

### c16 · Family pairs

**Game use:** a memory game: eight face-down photo cards, and a pair is two animals from the same family (two bears, two pangolins), so a player learns the families while matching. The seed deals a different board.

Each family's photo animals are numbered by shuffle key; a family plays when it has two, and the four families whose first card comes earliest make the board. The rows come out in deal order.

```sql
-- q: c16
-- status: ran
-- params: [7]
-- show: cards
WITH p AS (SELECT CAST(? AS INTEGER) AS seed),
photo_deck AS (
  SELECT t.species_id, t.family, (t.species_id * 619 + p.seed * 211) % 1009 AS shuffle
  FROM species_taxonomy AS t
  JOIN species AS s ON s.id = t.species_id
  CROSS JOIN p
  WHERE s.photo_url IS NOT NULL
),
ranked AS (
  SELECT species_id, family, shuffle,
         row_number() OVER (PARTITION BY family ORDER BY shuffle, species_id) AS nth
  FROM photo_deck
),
board AS (
  SELECT family, min(shuffle) AS first_card
  FROM ranked
  WHERE nth <= 2
  GROUP BY family
  HAVING count(*) = 2
  ORDER BY first_card, family
  LIMIT 4
)
SELECT s.id, s.common_name, r.family
FROM ranked AS r
JOIN board AS b ON b.family = r.family
JOIN species AS s ON s.id = r.species_id
WHERE r.nth <= 2
ORDER BY r.shuffle, s.id;
```

```text
-- result: c16 · 8 rows · sha256 96127d3a42ba
id | common_name | family
40 | Sumatran Orangutan | Hominidae
71 | Andean Bear | Ursidae
27 | Western Long-beaked Echidna | Tachyglossidae
58 | Cheetah | Felidae
60 | Giant Panda | Ursidae
… 3 more rows
```

The game keeps `family` to check a pair and shows it only once the pair is found.

### c17 · Only here

**Game use:** "where am I?": cards for animals recorded in just one country; the player places each on a map. They make easy first rounds, with one right answer each.

`HAVING count(*) = 1` keeps the animals with one country row, and `min` reads that one code out of the group (any aggregate would do, since there's only one).

```sql
-- q: c17
-- status: ran
-- show: cards
SELECT s.id, s.common_name, min(sc.country_code) AS country_code
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
GROUP BY s.id, s.common_name
HAVING count(*) = 1
ORDER BY s.common_name;
```

```text
-- result: c17 · 18 rows · sha256 15e84112611d
id | common_name | country_code
23 | Aye-aye | MG
62 | Chinese Giant Salamander | CN
32 | De Winton's Golden Mole | ZA
67 | Eastern Long-beaked Echidna | PG
33 | Ethiopian Wolf | ET
… 13 more rows
```

One country in open records doesn't mean the animal lives nowhere else: it's where open records put it (lessons 9–11).

### c18 · Globetrotters

**Game use:** a "most travelled" badge row: the animals recorded on the most continents.

Natural Earth's `continent` is one value per country, so `count(DISTINCT c.continent)` counts continents, not countries.

```sql
-- q: c18
-- status: draft-table
-- show: cards
SELECT s.id, s.common_name, count(DISTINCT c.continent) AS continents
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
JOIN countries AS c ON c.code = sc.country_code
GROUP BY s.id, s.common_name
ORDER BY continents DESC, s.common_name
LIMIT 5;
```

```text
-- result: c18 · 5 rows · sha256 8823593d0198
id | common_name | continents
58 | Cheetah | 5
56 | Chimpanzee | 5
25 | Tiger | 5
64 | African Savanna Elephant | 3
20 | African Spurred Tortoise | 3
```

Animals kept in zoos far from home have open records too (c12), which is how an animal can reach continents it doesn't live on: a good moment for the game to say what "recorded in" means.

### c19 · Animals per continent

**Game use:** the continent buttons of a "pick a place" screen, each with its number of animals; tapping one lists its countries (c07, c03).

```sql
-- q: c19
-- status: draft-table
SELECT c.continent, count(DISTINCT sc.species_id) AS animals
FROM species_countries AS sc
JOIN countries AS c ON c.code = sc.country_code
GROUP BY c.continent
ORDER BY animals DESC, c.continent;
```

```text
-- result: c19 · 7 rows · sha256 bda515e00328
continent | animals
North America | 36
Africa | 28
Asia | 20
South America | 17
Europe | 11
… 2 more rows
```

An animal recorded on two continents counts on both, so the column adds up to more than the number of animals. `Seven seas (open ocean)` is Natural Earth's continent for islands far from any continent, such as Mauritius.

### c20 · Where it's been recorded

**Game use:** the "recorded in" panel on an animal's card, and the answer screen after c17 or c12: the countries by name, grouped by continent.

```sql
-- q: c20
-- status: draft-table
-- params: [74]
SELECT c.continent, c.name
FROM species_countries AS sc
JOIN countries AS c ON c.code = sc.country_code
WHERE sc.species_id = ?
ORDER BY c.continent, c.name;
```

```text
-- result: c20 · 4 rows · sha256 faa818e9083d
continent | name
Europe | Germany
North America | Canada
North America | Mexico
Oceania | New Zealand
```

### c21 · Biggest families

**Game use:** the shelves of a collection book, biggest family first; also which families can host an odd-one-out round (c06 needs three animals).

```sql
-- q: c21
-- status: ran
SELECT class, family, count(*) AS animals
FROM species_taxonomy
GROUP BY class, family
ORDER BY animals DESC, family
LIMIT 5;
```

```text
-- result: c21 · 5 rows · sha256 f0a780935226
class | family | animals
Reptilia | Testudinidae | 5
Mammalia | Bovidae | 4
Mammalia | Manidae | 4
Mammalia | Canidae | 3
Mammalia | Elephantidae | 3
```

### c22 · Collection book

**Game use:** progress in a collection game: per class, how many animals the player has collected out of all of them. The game keeps the player's collection itself (in the browser's storage) and passes it in as one parameter, the ids joined by commas.

`string_split` cuts the text into a list, `CAST(… AS INTEGER[])` makes it a list of numbers, and `list_contains` tests whether an id is in it: these three are DuckDB's own (other databases have their own list functions). `count(*) FILTER (WHERE …)` is standard SQL: it counts only the rows that pass the filter, beside a plain `count(*)` of the whole group.

```sql
-- q: c22
-- status: ran
-- params: ["25,51,74,3,60"]
WITH p AS (SELECT CAST(string_split(CAST(? AS VARCHAR), ',') AS INTEGER[]) AS ids)
SELECT t.class,
       count(*) FILTER (WHERE list_contains(p.ids, t.species_id)) AS collected,
       count(*) AS total
FROM species_taxonomy AS t
CROSS JOIN p
GROUP BY t.class
ORDER BY t.class;
```

```text
-- result: c22 · 3 rows · sha256 9d0074e7db0f
class | collected | total
Amphibia | 2 | 15
Mammalia | 3 | 50
Reptilia | 0 | 11
```

### c23 · Next and previous

**Game use:** the arrows of a card viewer that pages through every animal A to Z; the first card has no previous one and the last has no next (`NULL`).

`lag` and `lead` read the row before and after in the window's order. They run in a `WITH` first and the filter comes after: a `WHERE s.id = ?` in the same `SELECT` would leave one row, with no neighbours to read.

```sql
-- q: c23
-- status: ran
-- params: [51]
WITH p AS (SELECT CAST(? AS INTEGER) AS current_id),
ordered AS (
  SELECT id, common_name,
         lag(id) OVER (ORDER BY common_name, id) AS previous_id,
         lead(id) OVER (ORDER BY common_name, id) AS next_id
  FROM species
)
SELECT o.id, o.common_name, o.previous_id, o.next_id
FROM ordered AS o
JOIN p ON o.id = p.current_id;
```

```text
-- result: c23 · 1 row · sha256 c7c358dbb306
id | common_name | previous_id | next_id
51 | Jaguar | 61 | 44
```

### c24 · Where this card's facts come from

**Game use:** the "about this card" panel: each field of the card, the source it came from and that source's license, so a player can see where the facts come from (lesson 15).

```sql
-- q: c24
-- status: ran
-- params: [51]
SELECT ss.field, so.name AS source, so.license
FROM species_sources AS ss
JOIN sources AS so ON so.name = ss.source_name
WHERE ss.species_id = ?
ORDER BY ss.field;
```

```text
-- result: c24 · 8 rows · sha256 de983ba8d355
field | source | license
ids.col | Catalogue of Life | CC BY 4.0
ids.gbif | GBIF Backbone Taxonomy | CC BY 4.0
ids.inaturalist | Wikidata | CC0 1.0
ids.iucn | critwire base | CC BY 4.0
ids.ncbi | Wikidata | CC0 1.0
… 3 more rows
```

`ids.iucn` comes from critwire itself: critwire keeps only the IUCN id, never IUCN's data (lesson 15).

### c25 · Photo licenses

**Game use:** the credits page of a game or app: how many of its photos come under each license, and which are share-alike (BY-SA), whose reuse must carry the same license.

`photo_license LIKE 'CC BY-SA%'` is true or false for each license, and `NULL` for the animals with no photo (lesson 4).

```sql
-- q: c25
-- status: ran
SELECT coalesce(photo_license, 'no photo') AS license,
       photo_license LIKE 'CC BY-SA%' AS share_alike,
       count(*) AS animals
FROM species
GROUP BY photo_license
ORDER BY animals DESC, license;
```

```text
-- result: c25 · 11 rows · sha256 4770c953a1d4
license | share_alike | animals
CC BY-SA 4.0 | true | 24
CC BY-SA 3.0 | true | 18
CC BY 2.0 | false | 9
Public domain | false | 8
CC BY 4.0 | false | 5
… 6 more rows
```

### c26 · Photos wanted

**Game use:** a "help wanted" list on the Learn or docs page: the animals that still have no photo, with their Wikidata id, so a contributor can look for an openly licensed one. Games use the other side of it, c09.

```sql
-- q: c26
-- status: ran
SELECT id, common_name, scientific_name, wikidata_id
FROM species
WHERE photo_url IS NULL
ORDER BY id;
```

```text
-- result: c26 · 2 rows · sha256 ed7ab9c972e0
id | common_name | scientific_name | wikidata_id
19 | Floreana Giant Tortoise | Chelonoidis niger | Q486672
47 | Ili Pika | Ochotona iliensis | Q1508891
```

## 6. The countries file

`/v1/countries.{parquet,csv,json}` is critwire's first new data since the species files: one row per country code, with the country's name, continent, UN region and UN subregion. It is reference data about places and says nothing about animals. Learners need it for the `countries` table (§2): without it a country is just a two-letter code, and lessons 10 and 11, the continent cookbook entries and the demo can't name a place or group countries by continent. Mission B1 publishes it before any Learn page goes live (§9).

### Fields

Every column is text and never empty. Rows are sorted by `code`, and every format holds the same rows.

| Field | Type | Meaning | Natural Earth field |
|---|---|---|---|
| `code` | VARCHAR, unique | ISO 3166-1 alpha-2, plus `XK` for Kosovo (the code GBIF uses); the same codes as `range.countriesWithOpenRecords` in the species files | `ISO_A2_EH`, else `ISO_A2` (matching rule below) |
| `name` | VARCHAR, unique | the everyday English name, such as Russia, Laos, Ivory Coast | `NAME_EN` |
| `continent` | VARCHAR | Natural Earth's continent, such as `Africa`, `South America`; islands far from any continent have `Seven seas (open ocean)` | `CONTINENT` |
| `region` | VARCHAR | the UN geoscheme region: `Africa`, `Americas`, `Asia`, `Europe`, `Oceania` (and `Antarctica`) | `REGION_UN` |
| `subregion` | VARCHAR | the UN geoscheme subregion, such as `Middle Africa`, `Caribbean` | `SUBREGION` |

- **Parquet and CSV:** flat, the five columns in this order, CSV with a header row.
- **JSON:** an array of objects with exactly these five keys, like `species.json` is an array of records.
- **Not in the file:** geometry (Natural Earth's shapes stay out: the file stays a few KB, and maps are A2's question), Natural Earth's other attributes, and anything from GBIF.
- Names and continents are published as Natural Earth has them, unedited. Some read differently from other lists: `CN` is "People's Republic of China", `CC` is "Cocos", `TW` is "Taiwan", `TZ` is "Tanzania"; Mauritius, Réunion, the Seychelles and the Maldives are in `Seven seas (open ocean)`, Martinique in `North America`. The docs page says the names follow Natural Earth.

### Source: Natural Earth, with GBIF's list as a check

| | Natural Earth admin-0 | GBIF country enumeration |
|---|---|---|
| What | attributes of every admin-0 unit: ISO codes, names, continent, UN region and subregion | `https://api.gbif.org/v1/enumeration/country`: ISO codes, a title and GBIF's own region per country |
| License | public domain (quote below) | none stated: the response has no license field or header, and `https://www.gbif.org/terms` answered 403 to the VPS (2026-10-22) |
| Can critwire host it? | yes | no: unclear terms mean not hostable (the brief's decision rules) |
| Use | every published field | a check of the code set only, never published |

Natural Earth's `LICENSE.md` at the pinned commit (`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/f1890d9f152c896d250a77557a5751a93d494776/LICENSE.md`), verbatim:

> # Everything here is public domain.
>
> All versions of Natural Earth raster + vector map data found on this website are in the public domain. You may use the maps in any manner, including modifying the content and design, electronic dissemination, and offset printing. The primary authors, _Tom Patterson_ and _Nathaniel Vaughn Kelso_, and all other contributors renounce all financial claim to the maps and invites you to use them for personal, educational, and commercial purposes.
>
> # Credits
>
> No permission is needed to use Natural Earth. Crediting the authors is unnecessary.
>
> However, if you wish to cite the map data, simply use one of the following.
>
>     Short text: Made with Natural Earth.
>
>     Long text: Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.

Its terms page (`https://www.naturalearthdata.com/about/terms-of-use/`) carries the same text, plus: "The authors provide Natural Earth as a public service and are not responsible for any problems relating to accuracy, content, design, and how it is used." The third-party releases listed there (Washington Post; EC JRC IES rivers and lakes for Europe; XNR roads for North America) license Natural Earth "for the sole purpose of creating a world base map"; none covers the admin-0 attribute fields critwire uses.

GBIF's enumeration already reaches critwire for another job: `pnpm ingest gbif` stores it in `data/raw/gbif/snapshot.json`, and derive's countries rule reads its `gbifRegion` to spot captive and stray records. That stays as it is. The countries file doesn't change that rule, and the rule's regions are never published.

### Release and scale

- **Release:** `nvkelso/natural-earth-vector` tag `v5.1.2` (2022-05-13), commit `f1890d9f152c896d250a77557a5751a93d494776`; files `geojson/ne_10m_admin_0_countries.geojson` and `geojson/ne_10m_admin_0_map_units.geojson` (about 13 MB each, almost all geometry). sha256: countries `239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255`, map units `57da82be755f4afccd8f3b14251bb2752f5df1395f47d2d86f817470c4a48862`.
- **Scale 1:10m**, because it is the only one that covers the codes:
  - 1:110m lacks HK, SG, MU, SC and KM, which species use today;
  - 1:50m covers today's codes but lacks GI, BV and UM;
  - 1:10m gives 250 codes, exactly GBIF's 250, so an animal recorded later in a small territory still matches.

### Matching rule

The spike's `countries-draft.ts` applies it and its tests CD1–CD11 cover it; B1 ports both (below).
1. **Code:** `ISO_A2_EH` if it is two capital letters, else `ISO_A2` if it is. `ISO_A2` is `-99` for France, Norway and Kosovo and `CN-TW` for Taiwan; `ISO_A2_EH` fixes all four.
2. **Rows come from the `countries` layer.** The `map_units` layer adds only codes with no `countries` row: BQ, BV, CC, CX, GF, GP, MQ, RE, SJ, TK, YT (France's overseas regions, Norway's Svalbard and Bouvet, Australia's islands, the Caribbean Netherlands, Tokelau). For a code with a `countries` row, that row wins.
3. **One code, several `countries` rows:** keep the row whose `ADM0_A3` equals its `ISO_A3_EH` (the code's own unit), and fail unless exactly one does. Today: France (drops Clipperton Island), Kazakhstan (Baykonur Cosmodrome), Brazil (Brazilian Island), Australia (Indian Ocean Territories, Coral Sea Islands, Ashmore and Cartier Islands). Two `map_units` rows with one code fail.
4. **Map units of `TYPE` `Overlay` are dropped:** UNDOF (code `XD`) and the two halves of the Korean Demilitarized Zone, which overlap real countries.
5. Units with no code drop out (Somaliland, Northern Cyprus, the sovereign base areas, Bir Tawil, a few reefs and disputed areas). No species code needs one.
6. `name`, `continent`, `region` and `subregion` must be non-empty and `name` unique; any failure stops the run and names the rows.

If a future species code has no row, the fix is the narrowest new rule on Natural Earth's own fields that matches it, recorded with its reason, never a hand-made row.

Against GBIF's enumeration: the same 250 codes both ways. 41 names differ, all spelling or official-name choices (for example `BO` Bolivia vs "Bolivia (Plurinational State of)", `CI` Ivory Coast vs "Côte d’Ivoire", `TW` Taiwan vs "Chinese Taipei"); the published name is Natural Earth's. The spike's `out/countries-match.md` lists all 41.

### The codes the species use today

Every code in today's `range.countriesWithOpenRecords`, with the layer and field that matched it and its `name` (2026-10-21 data). `XK` (Kosovo, `countries` layer, `ISO_A2_EH`) is in the file too but no species uses it yet; it's checked because GBIF uses it.

| code | layer | field | name |
|---|---|---|---|
| AO | countries | ISO_A2 | Angola |
| AR | countries | ISO_A2 | Argentina |
| AU | countries | ISO_A2 | Australia |
| BD | countries | ISO_A2 | Bangladesh |
| BE | countries | ISO_A2 | Belgium |
| BF | countries | ISO_A2 | Burkina Faso |
| BJ | countries | ISO_A2 | Benin |
| BN | countries | ISO_A2 | Brunei |
| BO | countries | ISO_A2 | Bolivia |
| BR | countries | ISO_A2 | Brazil |
| BT | countries | ISO_A2 | Bhutan |
| BW | countries | ISO_A2 | Botswana |
| BZ | countries | ISO_A2 | Belize |
| CA | countries | ISO_A2 | Canada |
| CD | countries | ISO_A2 | Democratic Republic of the Congo |
| CF | countries | ISO_A2 | Central African Republic |
| CG | countries | ISO_A2 | Republic of the Congo |
| CI | countries | ISO_A2 | Ivory Coast |
| CL | countries | ISO_A2 | Chile |
| CM | countries | ISO_A2 | Cameroon |
| CN | countries | ISO_A2 | People's Republic of China |
| CO | countries | ISO_A2 | Colombia |
| CR | countries | ISO_A2 | Costa Rica |
| DE | countries | ISO_A2 | Germany |
| DK | countries | ISO_A2 | Denmark |
| DO | countries | ISO_A2 | Dominican Republic |
| DZ | countries | ISO_A2 | Algeria |
| EC | countries | ISO_A2 | Ecuador |
| EG | countries | ISO_A2 | Egypt |
| ES | countries | ISO_A2 | Spain |
| ET | countries | ISO_A2 | Ethiopia |
| FR | countries | ISO_A2_EH | France |
| GA | countries | ISO_A2 | Gabon |
| GF | map_units | ISO_A2_EH | French Guiana |
| GH | countries | ISO_A2 | Ghana |
| GM | countries | ISO_A2 | The Gambia |
| GN | countries | ISO_A2 | Guinea |
| GQ | countries | ISO_A2 | Equatorial Guinea |
| GT | countries | ISO_A2 | Guatemala |
| GW | countries | ISO_A2 | Guinea-Bissau |
| GY | countries | ISO_A2 | Guyana |
| HK | countries | ISO_A2 | Hong Kong |
| HN | countries | ISO_A2 | Honduras |
| HT | countries | ISO_A2 | Haiti |
| ID | countries | ISO_A2 | Indonesia |
| IN | countries | ISO_A2 | India |
| IR | countries | ISO_A2 | Iran |
| JP | countries | ISO_A2 | Japan |
| KE | countries | ISO_A2 | Kenya |
| KH | countries | ISO_A2 | Cambodia |
| KM | countries | ISO_A2 | Comoros |
| LA | countries | ISO_A2 | Laos |
| LK | countries | ISO_A2 | Sri Lanka |
| LR | countries | ISO_A2 | Liberia |
| LY | countries | ISO_A2 | Libya |
| MA | countries | ISO_A2 | Morocco |
| MG | countries | ISO_A2 | Madagascar |
| ML | countries | ISO_A2 | Mali |
| MM | countries | ISO_A2 | Myanmar |
| MQ | map_units | ISO_A2_EH | Martinique |
| MR | countries | ISO_A2 | Mauritania |
| MU | countries | ISO_A2 | Mauritius |
| MW | countries | ISO_A2 | Malawi |
| MX | countries | ISO_A2 | Mexico |
| MY | countries | ISO_A2 | Malaysia |
| MZ | countries | ISO_A2 | Mozambique |
| NA | countries | ISO_A2 | Namibia |
| NE | countries | ISO_A2 | Niger |
| NG | countries | ISO_A2 | Nigeria |
| NI | countries | ISO_A2 | Nicaragua |
| NL | countries | ISO_A2 | Netherlands |
| NP | countries | ISO_A2 | Nepal |
| NZ | countries | ISO_A2 | New Zealand |
| PA | countries | ISO_A2 | Panama |
| PE | countries | ISO_A2 | Peru |
| PG | countries | ISO_A2 | Papua New Guinea |
| PH | countries | ISO_A2 | Philippines |
| PK | countries | ISO_A2 | Pakistan |
| PL | countries | ISO_A2 | Poland |
| PY | countries | ISO_A2 | Paraguay |
| RE | map_units | ISO_A2_EH | Réunion |
| RU | countries | ISO_A2 | Russia |
| RW | countries | ISO_A2 | Rwanda |
| SC | countries | ISO_A2 | Seychelles |
| SD | countries | ISO_A2 | Sudan |
| SE | countries | ISO_A2 | Sweden |
| SG | countries | ISO_A2 | Singapore |
| SL | countries | ISO_A2 | Sierra Leone |
| SN | countries | ISO_A2 | Senegal |
| SO | countries | ISO_A2 | Somalia |
| SR | countries | ISO_A2 | Suriname |
| SS | countries | ISO_A2 | South Sudan |
| SZ | countries | ISO_A2 | Eswatini |
| TD | countries | ISO_A2 | Chad |
| TG | countries | ISO_A2 | Togo |
| TH | countries | ISO_A2 | Thailand |
| TN | countries | ISO_A2 | Tunisia |
| TT | countries | ISO_A2 | Trinidad and Tobago |
| TZ | countries | ISO_A2 | Tanzania |
| UG | countries | ISO_A2 | Uganda |
| US | countries | ISO_A2 | United States of America |
| UY | countries | ISO_A2 | Uruguay |
| VE | countries | ISO_A2 | Venezuela |
| VN | countries | ISO_A2 | Vietnam |
| ZA | countries | ISO_A2 | South Africa |
| ZM | countries | ISO_A2 | Zambia |
| ZW | countries | ISO_A2 | Zimbabwe |

### How mission B1 builds it

The same pipeline as the species data (AGENTS.md "Data"): snapshot committed, derive offline, build from `data/`.
1. **`pnpm ingest naturalearth`** fetches the two 1:10m files above from `raw.githubusercontent.com` at the pinned commit (2 requests), refuses either unless its sha256 matches the pinned value, and writes `data/raw/naturalearth/snapshot.json`: per layer, each unit's properties only, cut to the fields the rule reads (`ADMIN` or `GEOUNIT`, `ADM0_A3`, `ISO_A2`, `ISO_A2_EH`, `ISO_A3_EH`, `TYPE`, `NAME_EN`, `CONTINENT`, `REGION_UN`, `SUBREGION`), keys sorted, plus `release`, `commit` and one UTC `retrieved`. Geometry is never written, so the snapshot stays small and its diffs readable. All or nothing, like the other ingests.
2. **`pnpm derive`** gains `scripts/derive/naturalearth.ts` (the pure matcher, ported from `countries-draft.ts` with CD1–CD10 as its `node:test` tests; CD11's sha256 check moves into the ingest). It writes `data/countries.json`: a `source` block (name, license, release, `retrieved`, URL) and the rows. It refuses:
   - a species code with no row, listing every such code (`data/countries.json: no Natural Earth row for XX, YY`);
   - a snapshot whose `release` differs from the pinned one (`data/raw/naturalearth is stale: run pnpm ingest naturalearth`), the same message the other sources' stale checks give;
   - every failure in the matching rule.
   Derive stays pure (no network, no clock), and the `pnpm build` re-check of derived files covers `data/countries.json` like the others.
3. **`pnpm build`** writes `/v1/countries.json`, `/v1/countries.parquet` and `/v1/countries.csv` through DuckDB from `data/countries.json`, every column read as VARCHAR (so `NA` stays text), sorted by `code`, with the species tables' fixed writer options so the bytes are the same every build. `db/schema.sql` doesn't change: nothing reads a Postgres copy of the countries.
4. **Docs and E2E:** the docs page lists the three files with this section's field table; `e2e/countries.spec.ts` checks their shape and that every species code joins (§8); `e2e/duckdb.spec.ts`, which pins the set of `/v1` files the curl examples cover, gains the countries files.

### Credit

Natural Earth needs no credit; critwire gives it anyway, the same way it credits every source.
- `attribution.json` gets one new entry in its `sources` array with only the keys entries already have: `source` "Natural Earth", `url` `https://www.naturalearthdata.com/`, `license` "Public domain" (already in `LICENSE_URLS`, with no license URL), `release` "v5.1.2", `retrieved`, `citation` "Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com." (the long text the license suggests).
- Its `fields` are file-qualified (`countries.name`, `countries.continent`, `countries.region`, `countries.subregion`) so no one reads them as species fields; its `records` is the number of country rows; its `notes` says both.
- Today `buildAttribution` makes one entry per source a species record cites and throws on a registered source no record cites. B1 passes `data/countries.json` to it, merges the entry built from its `source` block into the sorted list, and counts that file as citing Natural Earth.
- The docs page's "Used for N records" line says "Used for N countries" for this entry, and `e2e/docs.spec.ts` checks it.

### The `/v1` rule: only additions

The docs promise "Inside v1 we only add things". The countries file is three new files; no existing file changes shape or meaning.
- `species.{json,parquet,csv}` and every `species/<id>.json` and `species/<slug>.json` keep their exact bytes. The evidence is the Baseline hash list (`spike/baseline/dist.sha256`, equal to the live site's on 2026-10-22): B1's `dist/` hashes must match it for every species file.
- `attribution.json` gains one array entry; every existing entry stays the same JSON value (B1 checks it with `jq`).
- `index.html` (the docs page) changes. Its "Every file holds the same {{species}} records" line stops being true and is reworded.
- The species files don't point at the countries file and don't need it: `range.countriesWithOpenRecords` stays a list of codes.

### Reading the CSV: `NA` is Namibia

Namibia's code is `NA`, and some CSV readers treat that text as a missing value by default:
- pandas `read_csv` turns it into `NaN`; pass `keep_default_na=False`;
- R's `read.csv` turns it into `NA`; pass `na.strings = character(0)`.

DuckDB's `read_csv` keeps it as the text `NA` (checked in the spike), as do the Parquet and JSON files. The docs page puts this note next to `countries.csv`. `species.csv` is unaffected: its countries cell is a `;`-joined list such as `NA;ZA`.

### Until it's published

The spike built a draft of this file with the same rule (`draft/v1/countries.parquet`, 250 rows), and every 002 block that reads `countries` ran against it and says `-- status: draft-table`. When B1 publishes the file, it relabels those blocks `ran`, re-runs them against the published file (results must be unchanged, since the rows are the same), and the runner's "a `ran` block reads `countries`" check is dropped with the label.

### Check: every species code has a row

Run after loading, this is the countries file's acceptance query: no code the species use is missing. The setup's foreign key from `species_countries` already refuses a missing code, so in a learner's database it can't fail; it's the query B1's `countries.spec.ts` runs against the published file, and lesson 11's left join is the same idea.

```sql
-- q: k01
-- status: draft-table
SELECT count(*) AS codes_used,
       count(c.code) AS with_a_row,
       count(*) - count(c.code) AS unmatched
FROM (SELECT DISTINCT country_code FROM species_countries) AS used
LEFT JOIN countries AS c ON c.code = used.country_code;
```

```text
-- result: k01 · 1 row · sha256 6035c905e2ad
codes_used | with_a_row | unmatched
107 | 107 | 0
```

## 7. Demo

Written in step S20.

## 8. Site

Written in step S20.

## 9. Mission B

Written in step S21.

## 10. For the owner

Written in step S22.
