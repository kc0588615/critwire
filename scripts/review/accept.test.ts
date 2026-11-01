// Accept core tests (mission plan 2026-11-01-critwire-review-presort, Q5). Failure modes first:
// A1: no selector, both selectors, a repeated selector, an unknown flag, a stray argument, a bad level, or an empty or
//     malformed id list → UsageError (the CLI exits 2).
// A2: --ids with a key the evidence doesn't hold, or one without a recommendation → throws.
// A3: --ids with a non-country key → throws "not an override; its fix is in 005".
// A4: a selection left empty (nothing at that level, or --confirm-only dropped everything) → throws.
// A7: a selected pair the overrides file holds with the other action → throws, naming both actions.
// A8: sameFlag false when kind, severity, country, records, region or core moved; true when only speciesRecords or reason did.
// A11: a selected pair the overrides file holds with the same action → skipped, not added (a rerun adds nothing).
// Plus: --confidence medium = medium + high; --confirm-only drops output-changing proposals; the owner's entries keep
// order and text, new ones appended sorted; countryChanges lists per species what a merge adds and removes.
// A14: the backup is already there at the claim → refused naming Undo and Finish, its bytes unchanged, no temp file left.
// A15: the overrides differ from the bytes this run read → refused, this run's backup removed, overrides unchanged.
// The CLI, on a self-contained throwaway copy (real paths from import.meta.url, real pnpm derive; never the repo's review state):
// A1: a malformed command line → exit 2, nothing written.
// A5: a hand-edited proposal, or a recommendation edited to low with the proposal untouched → refused, nothing written.
// A6: derived files stale before the run → refused, nothing written.
// A7: a conflict with an override already in the file → refused, nothing written.
// A8: the flag moved since the evidence was gathered → refused, nothing written; a moved species total only warns.
// A10: derive fails after the write → the error names Undo and Finish, the backup holds the exact pre-run bytes.
// A11: a rerun → exit 0, nothing written.
// A12: any file other than the overrides, derive's outputs and the backup touched → every case compares the copy's hashes.
// A13: the backup exists → refused, naming Undo and Finish, nothing written. Undo gives back every pre-run byte.
// A16: two runs at once with different --ids → at least one exits 0, the file holds exactly the exit-0 runs' keys, no
//      backup or temp file left, derived files match it.
// Plus: the real repo's data/ is untouched.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, cp, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gbifTaxonKey, type GbifSnapshot } from "../raw.ts";
import type { CountryOverride, Mismatch, Species } from "../species.ts";
import { countryChanges, mergeOverrides, parseAcceptArgs, selectProposals, UsageError } from "./accept.ts";
import { claimBackup } from "./io.ts";
import { isCountryEntry, entryKey, proposalOf, sameFlag, statusQuo, type Evidence, type Recommendation } from "./presort.ts";

const entry = (speciesId: number, country: string, kind: Mismatch["kind"], severity: Mismatch["severity"]): Mismatch => ({
  speciesId, scientificName: `Species ${speciesId}`, field: "range.countriesWithOpenRecords", kind, severity, country,
  values: { gbif: { records: 1, region: "EUROPE", speciesRecords: 4174, coreRegions: ["AMERICAS"] } },
  reason: `${country} flagged.`,
});
const stray = entry(2, "PT", "country-captive-suspect", "blocking");
const kept = entry(2, "DE", "country-captive-suspect", "review");
const borderline = entry(3, "AR", "country-borderline", "review");
const lowStray = entry(5, "FR", "country-captive-suspect", "blocking");
const iucnId: Mismatch = {
  speciesId: 4, scientificName: "Species 4", field: "ids.iucn", kind: "iucn-id", severity: "blocking",
  values: { base: 9605, wikidata: ["17585"] }, reason: "Differs.",
};
const FIX_KEY = "4:ids.iucn:iucn-id";
const evidence = {
  entries: [
    { key: "2:PT", entry: stray, gbif: null },
    { key: "2:DE", entry: kept, gbif: null },
    { key: "3:AR", entry: borderline, gbif: null },
    { key: "5:FR", entry: lowStray, gbif: null },
    { key: "6:ES", entry: entry(6, "ES", "country-borderline", "review"), gbif: null },
    { key: FIX_KEY, entry: iucnId, gbif: null },
  ],
};
const rec = (key: string, recommendation: string, confidence: Recommendation["confidence"]): Recommendation => ({
  key, recommendation, confidence, reason: `${key} reason.`, cite: ["entry"],
});
const recs: Recommendation[] = [
  rec("3:AR", "remove", "high"), // output-changing (kept → removed)
  rec("2:PT", "remove", "high"), // confirming (stays excluded)
  rec("2:DE", "keep", "medium"), // confirming (stays kept)
  rec("5:FR", "remove", "low"), // confirming (stays excluded)
  rec(FIX_KEY, "Fix the Wikidata statement.", "high"),
];
const pairs = (list: readonly CountryOverride[]) => list.map((o) => `${o.speciesId}:${o.country}:${o.action}`);
const override = (speciesId: number, country: string, action: CountryOverride["action"], reason = "owner's words"): CountryOverride => ({ speciesId, country, action, reason });
const throwsWith = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e: Error) => re.test(e.message));

test("parseAcceptArgs: one selector, with or without --confirm-only", () => {
  assert.deepEqual(parseAcceptArgs(["--confidence", "high"]), { confidence: "high", confirmOnly: false });
  assert.deepEqual(parseAcceptArgs(["--confidence", "low", "--confirm-only"]), { confidence: "low", confirmOnly: true });
  assert.deepEqual(parseAcceptArgs(["--ids", "25:DE,25:RU"]), { ids: ["25:DE", "25:RU"], confirmOnly: false });
  assert.deepEqual(parseAcceptArgs(["--confirm-only", "--ids", "25:DE,25:DE"]), { ids: ["25:DE"], confirmOnly: true });
});

test("A1: every malformed command line is a UsageError naming the usage", () => {
  const bad = [
    [],
    ["--confirm-only"],
    ["--confidence", "high", "--ids", "25:DE"],
    ["--confidence", "high", "--confidence", "low"],
    ["--ids", "25:DE", "--ids", "25:RU"],
    ["--confidence", "certain"],
    ["--confidence"],
    ["--ids", ""],
    ["--ids", "25:DE,"],
    ["--ids", " 25:DE"],
    ["--force"],
    ["high"],
    ["--confidence", "high", "extra"],
  ];
  for (const args of bad) {
    assert.throws(() => parseAcceptArgs(args), (e: Error) => e instanceof UsageError && /^usage: pnpm review:accept/m.test(e.message), JSON.stringify(args));
  }
});

test("selectProposals: --confidence is that level or higher, countries only, as sorted overrides", () => {
  const high = selectProposals({ confidence: "high", confirmOnly: false }, recs, evidence);
  assert.deepEqual(high, [
    { speciesId: 2, country: "PT", action: "remove", reason: "2:PT reason." },
    { speciesId: 3, country: "AR", action: "remove", reason: "3:AR reason." },
  ]);
  assert.deepEqual(pairs(selectProposals({ confidence: "medium", confirmOnly: false }, recs, evidence)), ["2:DE:keep", "2:PT:remove", "3:AR:remove"]);
  assert.deepEqual(pairs(selectProposals({ confidence: "low", confirmOnly: false }, recs, evidence)), ["2:DE:keep", "2:PT:remove", "3:AR:remove", "5:FR:remove"]);
});

test("selectProposals: --ids selects only what it names, whatever its confidence", () => {
  assert.deepEqual(pairs(selectProposals({ ids: ["5:FR", "2:DE"], confirmOnly: false }, recs, evidence)), ["2:DE:keep", "5:FR:remove"]);
});

test("selectProposals: --confirm-only drops output-changing proposals", () => {
  assert.deepEqual(pairs(selectProposals({ confidence: "high", confirmOnly: true }, recs, evidence)), ["2:PT:remove"]);
  assert.deepEqual(pairs(selectProposals({ ids: ["2:PT", "3:AR"], confirmOnly: true }, recs, evidence)), ["2:PT:remove"]);
});

test("A2: an unknown key, or one with no recommendation, throws", () => {
  throwsWith(() => selectProposals({ ids: ["2:PT", "9:XX"], confirmOnly: false }, recs, evidence), /9:XX is not in the evidence/);
  throwsWith(() => selectProposals({ ids: ["6:ES"], confirmOnly: false }, recs, evidence), /6:ES has no recommendation/);
});

test("A3: a non-country key throws, even beside valid ones", () => {
  throwsWith(() => selectProposals({ ids: ["2:PT", FIX_KEY], confirmOnly: false }, recs, evidence), /4:ids\.iucn:iucn-id is not an override; its fix is in 005/);
});

test("A4: an empty selection throws", () => {
  const noHigh = recs.filter((r) => r.confidence !== "high");
  throwsWith(() => selectProposals({ confidence: "high", confirmOnly: false }, noHigh, evidence), /nothing selected/);
  throwsWith(() => selectProposals({ ids: ["3:AR"], confirmOnly: true }, recs, evidence), /nothing selected/);
});

test("mergeOverrides: the owner's entries keep order and text, new ones are appended sorted", () => {
  const current = [override(9, "ZA", "keep", "zoo checked"), override(1, "BR", "remove", "my call")];
  const selected = [override(3, "AR", "remove"), override(2, "PT", "remove"), override(2, "DE", "keep")];
  const { merged, added, skipped } = mergeOverrides(current, selected);
  assert.deepEqual(merged, [current[0], current[1], selected[2], selected[1], selected[0]]);
  assert.deepEqual(pairs(added), ["2:DE:keep", "2:PT:remove", "3:AR:remove"]);
  assert.deepEqual(skipped, []);
  assert.deepEqual(current.length, 2);
});

test("A11: a pair already held with the same action is skipped; the owner's reason stays", () => {
  const current = [override(2, "PT", "remove", "my call")];
  const { merged, added, skipped } = mergeOverrides(current, [override(2, "PT", "remove", "proposal's words"), override(3, "AR", "remove")]);
  assert.deepEqual(merged, [current[0], override(3, "AR", "remove")]);
  assert.deepEqual(pairs(added), ["3:AR:remove"]);
  assert.deepEqual(pairs(skipped), ["2:PT:remove"]);
  const rerun = mergeOverrides(merged, [override(2, "PT", "remove"), override(3, "AR", "remove")]);
  assert.deepEqual(rerun.merged, merged);
  assert.deepEqual(rerun.added, []);
});

test("A7: a pair held with the other action throws, naming both", () => {
  throwsWith(() => mergeOverrides([override(2, "PT", "keep")], [override(2, "PT", "remove")]), /2:PT: .*keep.*remove/);
});

test("A8: sameFlag ignores reason and speciesRecords, and is false on anything else that moved", () => {
  const moved = (change: (e: Mismatch & { values: { gbif: Record<string, unknown> } }) => void) => {
    const copy = structuredClone(stray) as Mismatch & { values: { gbif: Record<string, unknown> } };
    change(copy);
    return copy;
  };
  assert.equal(sameFlag(stray, structuredClone(stray)), true);
  assert.equal(sameFlag(stray, moved((e) => { e.reason = "Reworded."; })), true);
  assert.equal(sameFlag(stray, moved((e) => { e.values.gbif["speciesRecords"] = 5000; })), true);
  assert.equal(sameFlag(stray, moved((e) => { e.kind = "country-borderline"; })), false);
  assert.equal(sameFlag(stray, moved((e) => { e.severity = "review"; })), false);
  assert.equal(sameFlag(stray, moved((e) => { e.country = "ES"; })), false);
  assert.equal(sameFlag(stray, moved((e) => { e.values.gbif["records"] = 2; })), false);
  assert.equal(sameFlag(stray, moved((e) => { e.values.gbif["region"] = "ASIA"; })), false);
  assert.equal(sameFlag(stray, moved((e) => { e.values.gbif["coreRegions"] = ["EUROPE"]; })), false);
});

test("countryChanges: per species, what was added and removed; a species losing its last country counts; unchanged ones don't", () => {
  const species = (id: number, list: string[] | null) => ({
    id, range: { countriesWithOpenRecords: list, status: list ? "ok" : "no-open-records" },
  }) as unknown as Species;
  const before = [species(1, ["AR", "BR"]), species(2, ["DE"]), species(3, ["FR"]), species(4, null)];
  const after = [species(1, ["BR", "CL"]), species(2, ["DE"]), species(3, null), species(4, ["KE"])];
  assert.deepEqual(countryChanges(before, after), [
    { speciesId: 1, added: ["CL"], removed: ["AR"] },
    { speciesId: 3, added: [], removed: ["FR"] },
    { speciesId: 4, added: ["KE"], removed: [] },
  ]);
  throwsWith(() => countryChanges(before, after.slice(1)), /species 1/);
});

describe("claimBackup", () => {
  // Runs a claim in an empty folder holding the target; returns what's left there.
  const claiming = async (body: (backup: URL, target: URL) => Promise<void>) => {
    const dir = await mkdtemp(join(tmpdir(), "critwire-claim-"));
    try {
      const target = pathToFileURL(join(dir, "overrides"));
      await writeFile(target, "current");
      await body(pathToFileURL(join(dir, "overrides.pre-accept")), target);
      return new Map(await Promise.all((await readdir(dir)).map(async (f) => [f, await readFile(join(dir, f), "utf8")] as const)));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };

  test("a free claim holds the exact bytes and leaves no temp file", async () => {
    const left = await claiming((backup, target) => claimBackup(backup, target, "current"));
    assert.deepEqual([...left].sort(), [["overrides", "current"], ["overrides.pre-accept", "current"]]);
  });

  test("A14: a backup already there is refused, naming both ways out, its bytes unchanged", async () => {
    const left = await claiming(async (backup, target) => {
      await writeFile(backup, "earlier");
      await assert.rejects(claimBackup(backup, target, "current"), /didn't finish[^]*Undo: [^]*Finish: /);
    });
    assert.deepEqual([...left].sort(), [["overrides", "current"], ["overrides.pre-accept", "earlier"]]);
  });

  test("A15: overrides that moved since this run read them are refused, its backup removed", async () => {
    const left = await claiming((backup, target) => assert.rejects(claimBackup(backup, target, "read earlier"), /changed since this run read it/));
    assert.deepEqual([...left], [["overrides", "current"]]);
  });
});

describe("review:accept on a throwaway copy", () => {
  const REPO = fileURLToPath(new URL("../../", import.meta.url));
  const COPIED = ["scripts", "data", "package.json", "tsconfig.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];
  const OVERRIDES = "data/review/country-overrides.json";
  const BACKUP = `${OVERRIDES}.pre-accept`;
  const SPECIES = "data/species.json";
  const QUEUE = "data/review/mismatches.json";
  const EVIDENCE = "data/review/presort/evidence.json";
  const RECOMMENDATIONS = "data/review/presort/recommendations.json";
  const PROPOSAL = "data/review/country-overrides.proposed.json";
  const LAST_DERIVE_DIR = "data/gbif-learn-sample";
  // Not formatJson's bytes, so a byte-exact backup and a reformatting one differ.
  const HAND_FORMATTED = "[ ]";
  const DATASET = "dddddddd-0000-0000-0000-000000000001";
  const UNDO = `mv ${BACKUP} ${OVERRIDES} && pnpm derive`;
  const FINISH = `pnpm derive && rm ${BACKUP}`;

  let copy = "";
  let realData = new Map<string, string>();
  let k1: Mismatch;
  let k2: Mismatch;
  let k1Key = "";
  let k2Key = "";
  let recs: Recommendation[] = [];

  const hashes = async (dir: string) => {
    const files = await readdir(dir, { recursive: true, withFileTypes: true });
    const pairs = await Promise.all(files.filter((f) => f.isFile()).map(async (f) => {
      const path = join(f.parentPath, f.name);
      return [relative(dir, path), createHash("sha256").update(await readFile(path)).digest("hex")] as const;
    }));
    return new Map(pairs);
  };
  const changed = (a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>) =>
    [...new Set([...a.keys(), ...b.keys()])].filter((f) => a.get(f) !== b.get(f)).sort();
  const read = (file: string) => readFile(join(copy, file), "utf8");
  const write = (file: string, text: string) => writeFile(join(copy, file), text);
  const shell = (command: string) => spawnSync("sh", ["-c", command], { cwd: copy, encoding: "utf8" });
  const pnpm = (...args: string[]) => spawnSync("pnpm", args, { cwd: copy, encoding: "utf8" });
  const pnpmAtOnce = (...args: string[]) => new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("pnpm", args, { cwd: copy });
    let [stdout, stderr] = ["", ""];
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
  const output = (r: { stdout: string; stderr: string }) => r.stdout + r.stderr;
  const succeeds = (r: { status: number | null; stdout: string; stderr: string }) => assert.equal(r.status, 0, output(r));
  // Back to no overrides, derived files to match; every case starts here.
  const reset = async () => {
    await write(OVERRIDES, HAND_FORMATTED);
    succeeds(pnpm("derive"));
  };
  // Runs accept, which must refuse with `message` and leave every file as it was.
  const refuses = async (args: string[], message: RegExp, status = 1) => {
    const start = await hashes(copy);
    const r = pnpm("review:accept", ...args);
    assert.equal(r.status, status, output(r));
    assert.match(output(r), message);
    assert.deepEqual(changed(start, await hashes(copy)), []);
    return r;
  };
  const tampered = async (file: string, edit: (text: string) => string, body: () => Promise<unknown>) => {
    const text = await read(file);
    await write(file, edit(text));
    try {
      await body();
    } finally {
      await write(file, text);
    }
  };
  const editJson = <T>(edit: (value: T) => void) => (text: string) => {
    const value = JSON.parse(text) as T;
    edit(value);
    return JSON.stringify(value, null, 2) + "\n";
  };

  before(async () => {
    if (process.getuid?.() === 0) throw new Error("run as a normal user: chmod doesn't block root, so the interrupted derive case would pass vacuously");
    realData = await hashes(join(REPO, "data"));
    copy = await mkdtemp(join(tmpdir(), "critwire-accept-"));
    await Promise.all(COPIED.map((f) => cp(join(REPO, f), join(copy, f), { recursive: true })));
    await symlink(join(REPO, "node_modules"), join(copy, "node_modules"));
    await mkdir(join(copy, "plans"));
    await reset();

    const queue = JSON.parse(await read(QUEUE)) as Mismatch[];
    const species = JSON.parse(await read(SPECIES)) as Species[];
    const published = (id: number) => species.find((s) => s.id === id)?.range.countriesWithOpenRecords?.length ?? 0;
    const kept = queue.filter((e) => isCountryEntry(e) && statusQuo(e) === "keep" && published(e.speciesId) >= 2);
    if (!kept[1]) throw new Error("the queue has fewer than two kept country entries of species with 2+ published countries");
    [k1, k2] = [kept[0]!, kept[1]];
    [k1Key, k2Key] = [entryKey(k1), entryKey(k2)];

    const gbif = JSON.parse(await read("data/raw/gbif/snapshot.json")) as GbifSnapshot;
    const evidence: Evidence = {
      retrieved: "2026-01-01",
      sources: [],
      entries: queue.map((entry) => {
        if (!isCountryEntry(entry)) return { key: entryKey(entry), entry, gbif: null };
        const count = (entry.values["gbif"] as { records: number }).records;
        return {
          key: entryKey(entry),
          entry,
          gbif: {
            taxonKey: gbifTaxonKey(gbif.species[entry.scientificName]!.match.response)!,
            url: "https://example.invalid/occurrences",
            count,
            facets: { datasetKey: { counts: [{ name: DATASET, count }], truncated: false } },
            records: [],
          },
        };
      }),
      datasets: { [DATASET]: { title: "Synthetic dataset", type: "OCCURRENCE", license: "CC0", doi: null, publishingOrganizationKey: null } },
      organizations: {},
      col: {},
      gbifSpecies: {},
      wikidata: { query: "", statements: [] },
    };
    recs = [
      { key: k1Key, recommendation: "keep", confidence: "high", reason: "Fixture: a wild record.", cite: [`gbif:dataset:${DATASET}`] },
      { key: k2Key, recommendation: "remove", confidence: "high", reason: "Fixture: every record captive.", cite: [`gbif:dataset:${DATASET}`] },
    ];
    await mkdir(join(copy, "data/review/presort"), { recursive: true });
    await write(EVIDENCE, JSON.stringify(evidence));
    await write(RECOMMENDATIONS, JSON.stringify(recs));
    succeeds(pnpm("review:presort"));
  });

  after(async () => {
    if (copy) {
      await chmod(join(copy, LAST_DERIVE_DIR), 0o755);
      await rm(copy, { recursive: true, force: true });
    }
  });

  test("A1: a malformed command line exits 2 with the usage, nothing written", async () => {
    await refuses([], /usage: pnpm review:accept/, 2);
    await refuses(["--confidence", "high", "--ids", "1:DE"], /usage: pnpm review:accept/, 2);
  });

  test("A5: a hand-edited proposal is refused", async () => {
    await tampered(PROPOSAL, editJson<CountryOverride[]>((p) => { p[0]!.action = p[0]!.action === "keep" ? "remove" : "keep"; }), () =>
      refuses(["--ids", `${k1Key},${k2Key}`], /proposed\.json .*run pnpm review:presort/));
  });

  test("A5: a recommendation edited to low, proposal untouched, is refused before anything else", async () => {
    await tampered(RECOMMENDATIONS, editJson<Recommendation[]>((r) => { r.find((x) => x.key === k2Key)!.confidence = "low"; }), () =>
      refuses(["--ids", k1Key], new RegExp(`${k2Key}: low must be the status quo`)));
  });

  test("A5: evidence that fails assertEvidence is refused", async () => {
    await tampered(EVIDENCE, editJson<Evidence>((e) => { e.entries.find((x) => x.key === k1Key)!.gbif!.taxonKey = -1; }), () =>
      refuses(["--ids", k1Key], /taxon changed/));
  });

  test("A6: a stale derived file is refused", async () => {
    await tampered(SPECIES, (t) => `${t}\n`, () => refuses(["--ids", k1Key], /species\.json is stale: run pnpm derive/));
  });

  test("A7: a conflict with an override already in the file is refused", async () => {
    await write(OVERRIDES, JSON.stringify([{ speciesId: k1.speciesId, country: k1.country, action: "remove", reason: "The owner's call." }]));
    succeeds(pnpm("derive"));
    await refuses(["--ids", k1Key], new RegExp(`${k1Key}: conflict: .*remove.*keep`));
    await reset();
  });

  test("A8: a flag that moved since the evidence was gathered is refused", async () => {
    await tampered(EVIDENCE, editJson<Evidence>((e) => {
      const item = e.entries.find((x) => x.key === k1Key)!;
      (item.entry.values["gbif"] as { records: number }).records += 1;
    }), () => refuses(["--ids", k1Key], new RegExp(`${k1Key}: the flag moved`)));
  });

  test("A4: an empty selection through the CLI is refused", async () => {
    await refuses(["--ids", k2Key, "--confirm-only"], /nothing selected/);
  });

  test("--confidence high --confirm-only: only the confirming override lands; species.json unchanged, no follow-on", async () => {
    const start = await hashes(copy);
    const r = pnpm("review:accept", "--confidence", "high", "--confirm-only");
    succeeds(r);
    assert.deepEqual(changed(start, await hashes(copy)), [QUEUE, OVERRIDES].sort());
    assert.deepEqual(JSON.parse(await read(OVERRIDES)), proposalOf(recs.filter((x) => x.key === k1Key)));
    assert.doesNotMatch(r.stdout, /learn:check/);
    await reset();
  });

  test("success, then A11: both overrides land, entries gone, only K2's species changes; a rerun writes nothing", async () => {
    const speciesBefore = JSON.parse(await read(SPECIES)) as Species[];
    const start = await hashes(copy);
    let r: ReturnType<typeof pnpm> | undefined;
    await tampered(EVIDENCE, editJson<Evidence>((e) => {
      const item = e.entries.find((x) => x.key === k1Key)!;
      (item.entry.values["gbif"] as { speciesRecords: number }).speciesRecords += 1;
    }), async () => { r = pnpm("review:accept", "--ids", `${k1Key},${k2Key}`); });
    succeeds(r!);
    assert.match(r!.stdout + r!.stderr, new RegExp(`${k1Key}: .*total moved`));
    assert.match(r!.stdout, new RegExp(`accepted 2: ${k1Key},${k2Key}`));
    assert.match(r!.stdout, new RegExp(`species ${k2.speciesId}: removed ${k2.country}`));
    assert.match(r!.stdout, /pnpm learn:check --update/);
    assert.deepEqual(changed(start, await hashes(copy)), [QUEUE, OVERRIDES, SPECIES].sort());
    assert.deepEqual(JSON.parse(await read(OVERRIDES)), proposalOf(recs));
    const queue = JSON.parse(await read(QUEUE)) as Mismatch[];
    assert.ok(!queue.some((e) => [k1Key, k2Key].includes(entryKey(e))));
    const expected = structuredClone(speciesBefore);
    const s = expected.find((x) => x.id === k2.speciesId)!;
    s.range.countriesWithOpenRecords = s.range.countriesWithOpenRecords!.filter((c) => c !== k2.country);
    assert.deepEqual(JSON.parse(await read(SPECIES)), expected);

    const settled = await hashes(copy);
    const rerun = pnpm("review:accept", "--ids", `${k1Key},${k2Key}`);
    succeeds(rerun);
    assert.match(rerun.stdout, /already accepted/);
    assert.deepEqual(changed(settled, await hashes(copy)), []);
    await reset();
  });

  test("A10, A13, Undo: an interrupted derive names both ways out; a second accept is refused; Undo gives back every byte", async () => {
    const start = await hashes(copy);
    await chmod(join(copy, LAST_DERIVE_DIR), 0o555);
    const r = pnpm("review:accept", "--ids", k2Key);
    assert.notEqual(r.status, 0, output(r));
    assert.ok(output(r).includes(UNDO), output(r));
    assert.ok(output(r).includes(FINISH), output(r));
    assert.equal(await read(BACKUP), HAND_FORMATTED);
    assert.ok(changed(start, await hashes(copy)).includes(SPECIES), "derive got past species.json before failing");

    const refused = await refuses(["--ids", k1Key], /didn't finish/);
    assert.ok(output(refused).includes(UNDO), output(refused));
    assert.ok(output(refused).includes(FINISH), output(refused));

    await chmod(join(copy, LAST_DERIVE_DIR), 0o755);
    succeeds(shell(UNDO));
    assert.equal(await read(OVERRIDES), HAND_FORMATTED);
    assert.deepEqual(changed(start, await hashes(copy)), []);
  });

  test("Finish: after an interrupted derive, the accept lands and the backup is gone", async () => {
    const start = await hashes(copy);
    await chmod(join(copy, LAST_DERIVE_DIR), 0o555);
    assert.notEqual(pnpm("review:accept", "--ids", k2Key).status, 0);
    await chmod(join(copy, LAST_DERIVE_DIR), 0o755);
    succeeds(shell(FINISH));
    assert.deepEqual(changed(start, await hashes(copy)), [QUEUE, OVERRIDES, SPECIES].sort());
    assert.deepEqual(JSON.parse(await read(OVERRIDES)), proposalOf(recs.filter((x) => x.key === k2Key)));
    await reset();
  });

  test("A16: two accepts at once lose nothing: the file holds exactly what the exit-0 runs reported", async () => {
    const runs = await Promise.all([k1Key, k2Key].map(async (key) => ({ key, run: await pnpmAtOnce("review:accept", "--ids", key) })));
    const log = runs.map((r) => output(r.run)).join("\n");
    const won = runs.filter((r) => r.run.status === 0).map((r) => r.key).sort();
    assert.ok(won.length > 0, log);
    const held = (JSON.parse(await read(OVERRIDES)) as CountryOverride[]).map((o) => `${o.speciesId}:${o.country}`).sort();
    assert.deepEqual(held, won, log);
    const settled = await hashes(copy);
    assert.deepEqual([...settled.keys()].filter((f) => /\.pre-accept$|\.tmp-/.test(f)), [], log);
    succeeds(pnpm("derive"));
    assert.deepEqual(changed(settled, await hashes(copy)), [], log);
    await reset();
  });

  test("the real repo's data/ is untouched", async () => {
    assert.deepEqual(changed(realData, await hashes(join(REPO, "data"))), []);
  });
});
