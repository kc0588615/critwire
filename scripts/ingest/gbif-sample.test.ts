// DL4–DL7, DL15 (plan D6, D15): pnpm ingest gbif-sample's reuse path. Written before the code, seen failing first.
// Offline: a local GBIF stand-in on port 0 (download, its dataset listing, the zip, /dataset, /organization) and a zip
// built here (one deflated SIMPLE_CSV member, as GBIF ships it). Failure modes:
// DL4: a re-run reads a different zip under the same key → refuses on sha256; the committed files stay.
// DL5: the zip holds fewer or more rows than GBIF's totalRecords → refuses; nothing written.
// DL6: per-dataset rows differ from GBIF's listing → refuses naming the datasets; nothing written.
// DL7: an unknown dataset license, a dataset with no title or a publisher with no name → refuses naming each; nothing
//      written.
// DL15: the species come from derive's in-memory core, never species.json: a stale species.json still builds the request.
// Plus: not SUCCEEDED, another request (points to --new), a zip that isn't exactly <key>.csv, a record of no species.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";
import { assertDerivedFiles, deriveAll, readDeriveInputs } from "../derive/pipeline.ts";
import { downloadRequest, sameRequest } from "../learn/download.ts";
import { SAMPLE_RULES } from "../learn/sample-rules.ts";
import { SIMPLE_CSV_HEADER } from "../learn/simple-csv.ts";
import { ingestGbifSample, sampleSpecies, SAMPLE_FILES } from "./gbif-sample.ts";

const KEY = "0000001-260928105237408";
const D1 = "11111111-1111-1111-1111-111111111111";
const D2 = "22222222-2222-2222-2222-222222222222";
const D3 = "33333333-3333-3333-3333-333333333333";
const O1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const O2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CC0 = "http://creativecommons.org/publicdomain/zero/1.0/legalcode";
const BY = "http://creativecommons.org/licenses/by/4.0/legalcode";
const BY_NC = "http://creativecommons.org/licenses/by-nc/4.0/legalcode";
const SPECIES = [{ id: 1, gbif: 100 }, { id: 2, gbif: 200 }];

const BASE: Record<string, string> = {
  occurrenceStatus: "PRESENT", decimalLatitude: "-3.1", decimalLongitude: "35.5", coordinateUncertaintyInMeters: "1.0",
  countryCode: "TZ", month: "11", year: "2008", basisOfRecord: "HUMAN_OBSERVATION", license: "CC_BY_4_0",
};
const line = (fields: Record<string, string>) => SIMPLE_CSV_HEADER.map((h) => ({ ...BASE, ...fields })[h] ?? "").join("\t");
// 4 records: id 3 is dropped by its CC BY-NC dataset; id 7 reaches species 2 through its taxonKey (a synonym).
const ROWS = [
  line({ gbifID: "5", datasetKey: D1, speciesKey: "100", taxonKey: "100", license: "CC0_1_0" }),
  line({ gbifID: "3", datasetKey: D2, speciesKey: "200", taxonKey: "200" }),
  line({ gbifID: "9", datasetKey: D3, speciesKey: "", taxonKey: "100", license: "CC0_1_0", countryCode: "",
    coordinateUncertaintyInMeters: "", year: "", month: "", basisOfRecord: "PRESERVED_SPECIMEN" }),
  line({ gbifID: "7", datasetKey: D1, speciesKey: "999", taxonKey: "200", countryCode: "ZZ" }),
];
const csv = (rows = ROWS) => [SIMPLE_CSV_HEADER.join("\t"), ...rows].join("\n") + "\n";

// A zip of deflated members (local headers, central directory, end record): what unzip reads.
function zip(members: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(members)) {
    const data = Buffer.from(text);
    const packed = deflateRawSync(data);
    const n = Buffer.from(name);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(8, 8); head.writeUInt16LE(0x21, 12);
    head.writeUInt32LE(crc32(data), 14); head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(n.length, 26);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(8, 10); dir.writeUInt16LE(0x21, 14);
    dir.writeUInt32LE(crc32(data), 16); dir.writeUInt32LE(packed.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(n.length, 28);
    dir.writeUInt32LE(offset, 42);
    locals.push(head, n, packed);
    central.push(dir, n);
    offset += head.length + n.length + packed.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(members).length, 8); end.writeUInt16LE(Object.keys(members).length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

interface Gbif {
  meta: Record<string, unknown>;
  listing: Record<string, number>;
  zip: Buffer;
  datasets: Record<string, Record<string, unknown>>;
  orgs: Record<string, Record<string, unknown>>;
}

function gbif(change: (g: Gbif) => void = () => {}): Gbif {
  const body = zip({ [`${KEY}.csv`]: csv() });
  const g: Gbif = {
    meta: {
      key: KEY, status: "SUCCEEDED", doi: "10.15468/dl.test01", license: BY, created: "2026-10-23T05:57:06.532+00:00",
      modified: "2026-10-23T06:13:47.288+00:00", eraseAfter: "2027-04-23T05:57:06.443+00:00", totalRecords: 4, numberDatasets: 3,
      size: body.length, request: { ...downloadRequest([100, 200]), creator: "someone", type: "OCCURRENCE" },
    },
    listing: { [D1]: 2, [D2]: 1, [D3]: 1 },
    zip: body,
    datasets: {
      [D1]: { key: D1, title: "Dataset one", doi: "10.1/d1", license: BY, publishingOrganizationKey: O1 },
      [D2]: { key: D2, title: "Dataset two", doi: "10.1/d2", license: BY_NC, publishingOrganizationKey: O1 },
      [D3]: { key: D3, title: "Dataset three", doi: "10.1/d3", license: CC0, publishingOrganizationKey: O2, deleted: "2026-10-01T00:00:00.000+00:00" },
    },
    orgs: { [O1]: { key: O1, title: "Publisher one" }, [O2]: { key: O2, title: "Publisher two" } },
  };
  change(g);
  return g;
}

async function withGbif(g: Gbif, fn: (api: string) => Promise<void>): Promise<void> {
  let base = "";
  const json = (res: import("node:http").ServerResponse, v: unknown) => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(v));
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", base);
    const path = url.pathname;
    if (path === `/v1/occurrence/download/${KEY}`) return json(res, { ...g.meta, downloadLink: `${base}/zip/${KEY}.zip` });
    if (path === `/v1/occurrence/download/${KEY}/datasets`) {
      const all = Object.entries(g.listing).map(([datasetKey, numberRecords]) => ({ downloadKey: KEY, datasetKey, numberRecords }));
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const results = all.slice(offset, offset + limit);
      return json(res, { offset, limit, endOfRecords: offset + results.length >= all.length, count: all.length, results });
    }
    if (path === `/zip/${KEY}.zip`) return res.writeHead(200, { "content-type": "application/octet-stream" }).end(g.zip);
    const m = /^\/v1\/(dataset|organization)\/([0-9a-f-]+)$/.exec(path);
    const found = m && (m[1] === "dataset" ? g.datasets : g.orgs)[m[2]];
    if (found) return json(res, found);
    res.writeHead(404).end("not found");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await fn(`${base}/v1`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const tmp = () => mkdtempSync(join(tmpdir(), "critwire-gbif-sample-"));
const destOf = (dir: string) => pathToFileURL(`${dir}/`);
const files = (dir: string) => Object.fromEntries(readdirSync(dir).sort().map((f) => [f, readFileSync(join(dir, f), "utf8")]));
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

// Runs the ingest `times` times against one stand-in for `g`, into one fresh folder; returns the files after each run.
async function run(g: Gbif, times = 1): Promise<Record<string, string>[]> {
  const dir = tmp();
  const out: Record<string, string>[] = [];
  try {
    await withGbif(g, async (api) => {
      for (let i = 0; i < times; i++) {
        await ingestGbifSample({ api, dest: destOf(dir), key: KEY, species: SPECIES });
        out.push(files(dir));
      }
    });
    return out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Asserts the ingest refuses with `message` and leaves the folder exactly as seeded.
async function refuses(g: Gbif, message: RegExp, opts: { seed?: Record<string, string> } = {}): Promise<void> {
  const dir = tmp();
  try {
    for (const [f, text] of Object.entries(opts.seed ?? {})) writeFileSync(join(dir, f), text);
    await withGbif(g, (api) => assert.rejects(
      ingestGbifSample({ api, dest: destOf(dir), key: KEY, species: SPECIES }), (e: Error) => {
        assert.match(e.message, message);
        return true;
      }));
    assert.deepEqual(files(dir), opts.seed ?? {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a clean run writes exactly the three files: effective-open, capped sample by id, GBIF's echo without creator", async () => {
  const g = gbif();
  const [out, again] = await run(g, 2);
  assert.deepEqual(Object.keys(out), [...SAMPLE_FILES].sort());
  assert.equal(out["sample.csv"], [
    "id,species_id,dataset_key,license,basis_of_record,longitude,latitude,coordinate_uncertainty_m,country_code_gbif,year,month",
    `5,1,${D1},CC BY 4.0,HUMAN_OBSERVATION,35.5,-3.1,1.0,TZ,2008,11`,
    `7,2,${D1},CC BY 4.0,HUMAN_OBSERVATION,35.5,-3.1,1.0,ZZ,2008,11`,
    `9,1,${D3},CC0 1.0,PRESERVED_SPECIMEN,35.5,-3.1,,,,`,
  ].join("\n") + "\n");
  const download = JSON.parse(out["download.json"]);
  assert.deepEqual(Object.keys(download).sort(), ["created", "datasetCounts", "doi", "downloadLink", "eraseAfter", "key", "license",
    "numberDatasets", "request", "sampleRules", "totalRecords", "zip"]);
  assert.equal(download.key, KEY);
  assert.equal(download.totalRecords, 4);
  assert.deepEqual(download.zip, { bytes: g.zip.length, sha256: sha(g.zip) });
  assert.deepEqual(download.datasetCounts, { [D1]: 2, [D2]: 1, [D3]: 1 });
  assert.deepEqual(download.sampleRules, SAMPLE_RULES);
  assert.equal("creator" in download.request, false);
  assert.equal(download.request.type, "OCCURRENCE");
  const datasets = JSON.parse(out["datasets.json"]);
  assert.equal(datasets.downloadKey, KEY);
  assert.match(datasets.retrieved, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(datasets.datasets.map((d: { key: string }) => d.key), [D1, D2, D3]);
  assert.deepEqual(datasets.datasets[0], { key: D1, title: "Dataset one", publisher: "Publisher one", publishingOrganizationKey: O1,
    doi: "10.1/d1", license: "CC BY 4.0", licenseUrl: BY, records: 2, recordLicenses: { "CC BY 4.0": 1, "CC0 1.0": 1 } });
  assert.equal(datasets.datasets[1].license, "CC BY-NC 4.0");
  assert.equal(datasets.datasets[2].deleted, "2026-10-01T00:00:00.000+00:00");
  assert.equal("deleted" in datasets.datasets[0], false);
  // A re-run over the committed files reuses the download: same bytes.
  assert.deepEqual(again, out);
});

test("DL4 a re-run whose zip differs from download.json's sha256 refuses, and the committed files stay", async () => {
  const [committed] = await run(gbif());
  const other = zip({ [`${KEY}.csv`]: csv([...ROWS].reverse()) });
  await refuses(gbif((g) => { g.zip = other; g.meta.size = other.length; }), /sha256 [0-9a-f]{64} ≠ pinned [0-9a-f]{64}/, { seed: committed });
});

test("DL5 rows ≠ GBIF's totalRecords refuses; nothing written", async () => {
  await refuses(gbif((g) => { g.meta.totalRecords = 5; }), /4 rows.*totalRecords 5/);
});

test("DL6 per-dataset rows ≠ GBIF's listing refuses naming the datasets; nothing written", async () => {
  await refuses(gbif((g) => { g.listing = { [D1]: 1, [D2]: 1, [D3]: 2 }; }), new RegExp(`${D1}: 2 rows, listing 1.*${D3}: 1 rows, listing 2`));
});

test("DL7 an unknown license, no title or a nameless publisher refuses naming each; nothing written", async () => {
  await refuses(gbif((g) => {
    g.datasets[D2].license = "http://example.org/my-license";
    delete g.datasets[D3].title;
    g.orgs[O1].title = "";
  }), new RegExp(`${D1}: no publisher.*${D2}: unknown license "http://example.org/my-license".*${D2}: no publisher.*${D3}: no title`, "s"));
});

test("a download that isn't SUCCEEDED, or asks for something else, refuses before the zip; nothing written", async () => {
  await refuses(gbif((g) => { g.meta.status = "RUNNING"; }), new RegExp(`${KEY} is RUNNING`));
  await refuses(gbif((g) => { g.meta.request = { ...downloadRequest([100]), creator: "someone" }; }), /isn't today's request.*--new/);
});

test("a zip holding anything but <key>.csv refuses; nothing written", async () => {
  const two = zip({ [`${KEY}.csv`]: csv(), "extra.txt": "x" });
  await refuses(gbif((g) => { g.zip = two; g.meta.size = two.length; }), new RegExp(`lists ${KEY}.csv, extra.txt`));
  const wrong = zip({ "other.csv": csv() });
  await refuses(gbif((g) => { g.zip = wrong; g.meta.size = wrong.length; }), /lists other\.csv/);
});

test("a record whose speciesKey and taxonKey are no critwire species refuses; nothing written", async () => {
  const body = zip({ [`${KEY}.csv`]: csv([...ROWS.slice(0, 3), line({ gbifID: "7", datasetKey: D1, speciesKey: "998", taxonKey: "999" })]) });
  await refuses(gbif((g) => { g.zip = body; g.meta.size = body.length; }), /gbifID 7: neither speciesKey 998 nor taxonKey 999/);
});

test("DL15 the species come from derive's in-memory core: with species.json stale, the request is still built", async () => {
  const inputs = { ...await readDeriveInputs(), registration: null };
  await assert.rejects(assertDerivedFiles(deriveAll(inputs)), /species\.json is stale/);
  const species = sampleSpecies(inputs);
  const echo = JSON.parse(readFileSync(new URL("../fixtures/gbif-sample-request.json", import.meta.url), "utf8"));
  assert.equal(species.length, 73);
  assert.equal(sameRequest(echo, downloadRequest(species.map((s) => s.gbif))), true);
});
