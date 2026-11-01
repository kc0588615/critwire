// Renders plans/005-review-presort.md (mission plan 2026-11-01-critwire-review-presort, Q3). Pure, and reads no clock: the
// only dates are the evidence's and the snapshots', numbers use one fixed format, the order is speciesId, then key.
import { MERGED_REGIONS } from "../derive/countries.ts";
import { bindingsByName } from "../derive/wikidata.ts";
import type { Snapshots, SparqlBinding } from "../raw.ts";
import type { Species } from "../species.ts";
import {
  changesOutput, colIdsOf, CONFIDENCES, gbifKeysOf, isCountryEntry, NO_ACTION, statusQuo, wikidataItemsOf,
  type Confidence, type Evidence, type EvidenceItem, type FacetEvidence, type GbifRecord, type Recommendation, type WikidataStatement,
} from "./presort.ts";

export interface PresortInputs {
  evidence: Evidence;
  recommendations: readonly Recommendation[];
  species: readonly Species[];
  snapshots: Pick<Snapshots, "gbif" | "col" | "wikidata">;
}

const CITED_RECORDS = 5;
const RANGE_PROPS = ["P2341", "P183"];
const ID_PROPS: Readonly<Record<string, string>> = { "ids.iucn": "P627", "ids.gbif": "P846", "ids.col": "P10585", "ids.inaturalist": "P3151" };
// Record issues that bear on where the record is or what it is; the rest are GBIF's interpretation notes.
const SIGNAL_ISSUES = new Set([
  "COUNTRY_MISMATCH", "COUNTRY_INVALID", "COUNTRY_DERIVED_FROM_COORDINATES", "CONTINENT_COORDINATE_MISMATCH", "CONTINENT_INVALID",
  "TAXON_MATCH_FUZZY", "TAXON_MATCH_HIGHERRANK",
]);

const int = (n: number) => n.toLocaleString("en-US");
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
// Third-party free text on one line, with nothing that markdown would act on.
const esc = (s: string) => s.replace(/\s+/g, " ").trim().replace(/[\\`*[\]<>]/g, "\\$&");
const link = (label: string, url: string) => `[${label}](${url})`;
const records = (n: number) => `${int(n)} record${n === 1 ? "" : "s"}`;
const gbifOccurrence = (key: string | number) => link(String(key), `https://www.gbif.org/occurrence/${key}`);
const wikidataLink = (q: string) => (/^Q\d+$/.test(q) ? link(q, `https://www.wikidata.org/wiki/${q}`) : q);

const rowOf = (rec: Recommendation, item: EvidenceItem) => (isCountryEntry(item.entry) ? rec.recommendation : rec.recommendation === NO_ACTION ? NO_ACTION : "fix");

export interface PresortCounts {
  rows: { name: string; byConfidence: Record<Confidence, number>; total: number; changes: number | null }[];
  pending: number;
  total: number;
}

// Recommendation × confidence, plus how many of each change /v1 and how many entries still have none.
export function presortCounts(evidence: Evidence, recommendations: readonly Recommendation[]): PresortCounts {
  const items = new Map(evidence.entries.map((e) => [e.key, e]));
  const rows: PresortCounts["rows"] = ["keep", "remove", "fix", NO_ACTION].map((name) => ({
    name, byConfidence: { high: 0, medium: 0, low: 0 }, total: 0, changes: name === "keep" || name === "remove" ? 0 : null,
  }));
  for (const rec of recommendations) {
    const item = items.get(rec.key)!;
    const row = rows.find((r) => r.name === rowOf(rec, item))!;
    row.byConfidence[rec.confidence]++;
    row.total++;
    if (row.changes !== null && changesOutput(item.entry, rec.recommendation as "keep" | "remove")) row.changes++;
  }
  return { rows, pending: evidence.entries.length - recommendations.length, total: evidence.entries.length };
}

function summaryTable({ rows, pending, total }: PresortCounts): string[] {
  return [
    `| Recommendation | ${CONFIDENCES.join(" | ")} | total | changes /v1 |`,
    `|---|${CONFIDENCES.map(() => "---:").join("|")}|---:|---:|`,
    ...rows.map((r) => `| ${r.name} | ${CONFIDENCES.map((c) => r.byConfidence[c]).join(" | ")} | ${r.total} | ${r.changes ?? "n/a"} |`),
    ...(pending ? [`| pending | ${CONFIDENCES.map(() => "").join(" | ")} | ${pending} | |`] : []),
    `| **all entries** | ${CONFIDENCES.map((c) => rows.reduce((sum, r) => sum + r.byConfidence[c], 0)).join(" | ")} | ${total} | ${rows.reduce((sum, r) => sum + (r.changes ?? 0), 0)} |`,
  ];
}

const keyList = (keys: readonly string[]) => (keys.length ? `\`${keys.join(",")}\`` : "none");

// Species whose every published country is flagged: only these can lose them all, so 005 says what each selection leaves.
function exposedSpecies(evidence: Evidence, recommendations: readonly Recommendation[], species: readonly Species[]): string[] {
  const flagged = new Map<number, EvidenceItem[]>();
  for (const item of evidence.entries.filter((e) => isCountryEntry(e.entry))) flagged.set(item.entry.speciesId, [...(flagged.get(item.entry.speciesId) ?? []), item]);
  const lines: string[] = [];
  for (const s of species) {
    const published = s.range.countriesWithOpenRecords;
    const items = flagged.get(s.id);
    if (!published || !items) continue;
    const kept = new Set(items.filter((i) => statusQuo(i.entry) === "keep").map((i) => i.entry.country));
    if (!published.every((c) => kept.has(c))) continue;
    const left = (selected: readonly Recommendation[]) => {
      const out = new Set(published);
      for (const item of items) {
        const rec = selected.find((r) => r.key === item.key);
        if (rec?.recommendation === "keep") out.add(item.entry.country!);
        if (rec?.recommendation === "remove") out.delete(item.entry.country!);
      }
      return out.size;
    };
    const high = left(recommendations.filter((r) => r.confidence === "high"));
    const all = left(recommendations);
    const warning = high === 0 || all === 0 ? " **Removing them all turns it to `no-open-records`.**" : "";
    lines.push(`- ${s.id} ${s.scientificName} (${s.commonName}): all ${published.length} published countries are flagged. The high-confidence set leaves ${high}; every recommendation taken leaves ${all}.${warning}`);
  }
  return lines;
}

function header({ evidence, snapshots }: PresortInputs): string[] {
  return [
    "---",
    "title: Review queue, pre-sorted for the owner",
    `evidence_retrieved: ${evidence.retrieved}`,
    `gbif_snapshot: ${snapshots.gbif.retrieved}`,
    `col_snapshot: ${snapshots.col.retrieved}`,
    `wikidata_snapshot: ${snapshots.wikidata.retrieved}`,
    "---",
    "",
    "# Review queue, pre-sorted for the owner",
    "",
    "Generated by `pnpm review:presort` from `data/review/mismatches.json`, `data/review/presort/evidence.json` and `data/review/presort/recommendations.json`. Don't edit it: change a recommendation, then regenerate. `data/review/country-overrides.proposed.json` holds the same country recommendations as overrides. Nothing here takes effect until you accept it.",
    "",
    "## How to read this",
    "",
    "The country list means **countries with open (CC0 or CC BY) records**. It never means native range, and this file never claims range in its own voice: Wikidata and Catalogue of Life (COL) statements are quoted as theirs. The assumption below is the agents'; you can overrule it.",
    "",
    "- **keep:** at least one counted record documents the animal outside captivity in that country: native, introduced or vagrant.",
    "- **remove:** every counted record is captive (a zoo, breeding centre, farm or pet), misplaced (wrong coordinates or country) or misidentified.",
    "",
    "Confidence:",
    "",
    "- **high:** the cited records settle it. A remove: each counted record is captive or misplaced by its own fields, its dataset or publisher, or its locality, and every counted record is covered. A keep: at least one wild record, and an independent source agrees (a second dataset, a COL distribution, or Wikidata P2341 or P183).",
    "- **medium:** the evidence points one way, but one condition of high is missing.",
    "- **low:** thin or conflicting evidence. The recommendation is then always the status quo, so accepting it changes nothing published.",
    "",
    "Terms: **kept** or **excluded** is what derive publishes today with no override. **Confirming** means the override matches that, and **output-changing** means it doesn't. **Live** counts come from the query run on the evidence date; **snapshot** counts are what `pnpm derive` counted.",
    "",
  ];
}

function acceptSection(inputs: PresortInputs, itemsByKey: ReadonlyMap<string, EvidenceItem>): string[] {
  const { evidence, recommendations, species } = inputs;
  const high = recommendations.filter((r) => r.confidence === "high").sort(byKey);
  const proposals = high.filter((r) => isCountryEntry(itemsByKey.get(r.key)!.entry));
  const isChange = (r: Recommendation) => changesOutput(itemsByKey.get(r.key)!.entry, r.recommendation as "keep" | "remove");
  const confirming = proposals.filter((r) => !isChange(r)).map((r) => r.key);
  const changing = proposals.filter(isChange).map((r) => r.key);
  const fixes = high.filter((r) => !isCountryEntry(itemsByKey.get(r.key)!.entry)).map((r) => r.key);
  const exposed = exposedSpecies(evidence, recommendations, species);
  return [
    "## Accept in one go",
    "",
    "Two sentences you can reply with:",
    "",
    `- **"accept the high-confidence confirmations only"**: \`pnpm review:accept --confidence high --confirm-only\` (${confirming.length} entries). Published countries don't change, and the next release isn't held up.`,
    `- **"accept the high-confidence set"**: \`pnpm review:accept --confidence high\` (${proposals.length} entries: ${confirming.length} confirming, ${changing.length} output-changing). The output-changing ones hold the next release until the follow-on below is done.`,
    "",
    "Any other selection works too: `pnpm review:accept --ids 25:DE,25:RU`, or `--confidence medium` for medium and higher. The command copies the chosen proposals into `data/review/country-overrides.json` and runs `pnpm derive`. Non-country entries can't be accepted this way; their fixes are separate work.",
    "",
    `Confirming, high (${confirming.length}): ${keyList(confirming)}`,
    "",
    `Output-changing, high (${changing.length}): ${keyList(changing)}`,
    "",
    `Non-country fixes, high (${fixes.length}, not covered by accept): ${keyList(fixes)}`,
    "",
    "What accepting does:",
    "",
    "| | Confirming override | Output-changing override |",
    "|---|---|---|",
    "| `mismatches.json` | the entry is removed | the entry is removed |",
    "| `species.json`, `/v1` | unchanged | the country is added or removed (removing every published country turns the status into `no-open-records`) |",
    "| Countries DOI | stays current | stays current: its counts include every record of the countries query, strays too |",
    "| Learn-sample DOI, `habitat.json` | current | current: both come from the sample, which doesn't read any species' country list |",
    "| `pnpm build`, `deploy` | pass, `dist/` byte-identical | **refused** (\"lab <id> is stale\") until `pnpm build --draft && pnpm learn:check --update`. Changed results then need 004, `checked/`, `e2e/__snapshots__/` and the prose numbers changed in one commit, then `pnpm build`, `pnpm e2e` and the deploy: a separate unit of about 1–2 h |",
    "",
    ...(exposed.length ? ["Species that could lose every published country:", "", ...exposed, ""] : []),
  ];
}

const byKey = (a: { key: string }, b: { key: string }) => cmp(a.key, b.key);

function countsOf(facet: FacetEvidence | undefined, total: number, order: "count" | "name" = "count", label: (name: string) => string = esc): string {
  const counts = facet?.counts ?? [];
  if (counts.length === 0) return "none filled";
  const sorted = order === "name" ? [...counts].sort(byName) : counts;
  const listed = counts.reduce((sum, c) => sum + c.count, 0);
  return sorted.map((c) => `${label(c.name)} ${int(c.count)}`).join(", ") + (listed < total ? `; ${int(total - listed)} unlisted` : "");
}
const byName = (a: { name: string }, b: { name: string }) => cmp(a.name, b.name);

function recordLine(r: GbifRecord): string {
  const date = r.year ? (r.month ? `${r.year}-${String(r.month).padStart(2, "0")}` : String(r.year)) : "no date";
  const coords = r.decimalLatitude != null && r.decimalLongitude != null
    ? `${r.decimalLatitude}, ${r.decimalLongitude}${r.coordinateUncertaintyInMeters == null ? "" : ` ±${int(r.coordinateUncertaintyInMeters)} m`}`
    : "no coordinates";
  const issues = (r.issues ?? []).filter((i) => SIGNAL_ISSUES.has(i));
  const parts = [
    gbifOccurrence(r.key), r.basisOfRecord, date, coords,
    r.locality && esc(r.locality), r.stateProvince && esc(r.stateProvince), r.institutionCode && esc(r.institutionCode),
    r.establishmentMeans && `establishment: ${esc(r.establishmentMeans)}`, r.degreeOfEstablishment && `degree: ${esc(r.degreeOfEstablishment)}`,
    issues.length ? `issues: ${issues.join(", ")}` : null,
    r.occurrenceRemarks && `remarks: ${esc(r.occurrenceRemarks)}`,
  ];
  return `  - ${parts.filter(Boolean).join(" · ")}`;
}

// Pending entries show every stored record, so a recommendation batch can read 005 alone; decided ones show the cited
// records first, then enough others to reach CITED_RECORDS.
function shownRecords(all: readonly GbifRecord[], rec: Recommendation | undefined): GbifRecord[] {
  if (!rec) return [...all];
  const cited = new Set(rec.cite.map((c) => /^gbif:occurrence:(.+)$/.exec(c)?.[1]).filter(Boolean));
  const first = all.filter((r) => cited.has(String(r.key)));
  return [...first, ...all.filter((r) => !cited.has(String(r.key))).slice(0, Math.max(0, CITED_RECORDS - first.length))];
}

function countryEvidence(item: EvidenceItem, rec: Recommendation | undefined, evidence: Evidence): string[] {
  const g = item.gbif!;
  const snapshot = (item.entry.values["gbif"] as { records: number }).records;
  const count = g.count === snapshot ? `live ${int(g.count)}, same as the snapshot` : `live ${int(g.count)}, snapshot ${int(snapshot)}`;
  const datasets = g.facets["datasetKey"]?.counts.map((c) => {
    const d = evidence.datasets[c.name];
    const org = d?.publishingOrganizationKey ? evidence.organizations[d.publishingOrganizationKey]?.title : null;
    return `  - ${link(esc(d?.title ?? c.name), `https://www.gbif.org/dataset/${c.name}`)}${org ? ` · ${esc(org)}` : ""} · ${records(c.count)}`;
  }) ?? [];
  const shown = shownRecords(g.records, rec);
  return [
    `- **Records:** ${count}. [Query](${g.url}).`,
    `- **Basis of record:** ${countsOf(g.facets["basisOfRecord"], g.count)}`,
    `- **Years:** ${countsOf(g.facets["year"], g.count, "name")}`,
    `- **Institutions:** ${countsOf(g.facets["institutionCode"], g.count)}`,
    `- **State or province:** ${countsOf(g.facets["stateProvince"], g.count)}`,
    `- **Establishment means:** ${countsOf(g.facets["establishmentMeans"], g.count)}. **Degree of establishment:** ${countsOf(g.facets["degreeOfEstablishment"], g.count)}`,
    ...(datasets.length ? ["- **Datasets:**", ...datasets] : ["- **Datasets:** none"]),
    ...(shown.length ? [`- **Records shown** (${shown.length} of ${int(g.count)}):`, ...shown.map(recordLine)] : []),
  ];
}

function statementLine(s: WikidataStatement): string {
  const refs = s.references.flatMap((r) => [r.statedIn && `stated in ${wikidataLink(r.statedIn)}`, r.retrieved && `retrieved ${r.retrieved.slice(0, 10)}`].filter(Boolean).join(", ") || []);
  return `${wikidataLink(s.item)} ${s.property} = ${wikidataLink(s.value)}${s.country ? ` (${s.country})` : ""}, ${s.rank} rank${refs.length ? `, ${refs.join("; ")}` : ", no reference"}`;
}

function nonCountryEvidence(item: EvidenceItem, { evidence, snapshots }: PresortInputs, wikidataByName: ReadonlyMap<string, readonly SparqlBinding[]>): string[] {
  const { entry } = item;
  const release = snapshots.col.release;
  const prop = ID_PROPS[entry.field];
  const items = new Set(wikidataItemsOf(entry, wikidataByName));
  const statements = prop ? evidence.wikidata.statements.filter((s) => s.property === prop && items.has(s.item)) : [];
  return [
    `- **Values:** \`${JSON.stringify(entry.values)}\``,
    ...colIdsOf(entry, snapshots).map((id) => {
      const u = evidence.col[id];
      const accepted = u?.accepted ? `, accepted name ${u.accepted.name} (${u.accepted.id})` : "";
      return `- **COL ${id}** (release ${release.version}): ${[u?.name, u?.rank, u?.status].filter(Boolean).join(", ")}${accepted}. ${link("Open", `https://www.checklistbank.org/dataset/${release.key}/taxon/${id}`)}.`;
    }),
    ...gbifKeysOf(entry, snapshots).map((key) => {
      const u = evidence.gbifSpecies[String(key)];
      const accepted = u?.accepted ? `, accepted name ${u.accepted}` : "";
      return `- **GBIF ${key}:** ${u?.scientificName}, ${u?.rank}, ${u?.taxonomicStatus}${accepted}. ${link("Open", `https://www.gbif.org/species/${key}`)}.`;
    }),
    ...statements.map((s) => `- **Wikidata:** ${statementLine(s)}`),
  ];
}

function citeLink(cite: string, { snapshots }: PresortInputs): string {
  const [, kind, id] = /^(gbif:occurrence|gbif:dataset|gbif:species|col|wikidata):(.+)$/.exec(cite) ?? [];
  switch (kind) {
    case "gbif:occurrence": return link(cite, `https://www.gbif.org/occurrence/${id}`);
    case "gbif:dataset": return link(cite, `https://www.gbif.org/dataset/${id}`);
    case "gbif:species": return link(cite, `https://www.gbif.org/species/${id}`);
    case "col": return link(cite, `https://www.checklistbank.org/dataset/${snapshots.col.release.key}/taxon/${id}`);
    case "wikidata": return link(cite, `https://www.wikidata.org/wiki/${id}`);
    default: return cite;
  }
}

function entryBlock(item: EvidenceItem, rec: Recommendation | undefined, inputs: PresortInputs, wikidataByName: ReadonlyMap<string, readonly SparqlBinding[]>): string[] {
  const { entry } = item;
  const country = isCountryEntry(entry);
  const state = country ? `, ${statusQuo(entry) === "keep" ? "kept" : "excluded"}` : "";
  const title = country ? ` (${inputs.snapshots.gbif.countries[entry.country!]?.title ?? entry.country})` : "";
  const effect = country && rec ? ` · ${changesOutput(entry, rec.recommendation as "keep" | "remove") ? "output-changing" : "confirming"}` : "";
  return [
    `#### ${item.key} · ${entry.kind} (${entry.severity}${state})`,
    "",
    `- **Flagged${title}:** ${entry.reason}`,
    ...(country ? countryEvidence(item, rec, inputs.evidence) : nonCountryEvidence(item, inputs, wikidataByName)),
    rec ? `- **Recommendation:** ${rec.recommendation} · **${rec.confidence}**${effect}` : "- **Recommendation:** pending",
    ...(rec ? [`- **Why:** ${rec.reason}`, `- **Cites:** ${rec.cite.map((c) => citeLink(c, inputs)).join(", ")}`] : []),
    "",
  ];
}

// The species' country facet from the snapshot derive counted: every country's count and region, largest first.
function contextLines(items: readonly EvidenceItem[], s: Species | undefined, { evidence, snapshots }: PresortInputs, wikidataByName: ReadonlyMap<string, readonly SparqlBinding[]>): string[] {
  const countryItem = items.find((i) => isCountryEntry(i.entry));
  if (!countryItem) return [];
  const { speciesRecords, coreRegions } = countryItem.entry.values["gbif"] as { speciesRecords: number; coreRegions: string[] };
  const response = snapshots.gbif.species[countryItem.entry.scientificName]?.occurrences?.response;
  const facet = [...(response?.facets.find((f) => f.field === "COUNTRY")?.counts ?? [])].sort((a, b) => b.count - a.count || cmp(a.name, b.name));
  const region = (c: string) => {
    const r = snapshots.gbif.countries[c]?.gbifRegion ?? "unknown";
    return MERGED_REGIONS[r] ?? r;
  };
  const colId = s?.ids.col;
  const col = colId ? evidence.col[colId] : undefined;
  const release = snapshots.col.release;
  const areas = col?.distributions?.map((d) => esc(d.area ?? d.globalId ?? "unnamed") + (d.establishmentMeans ? ` (${esc(d.establishmentMeans)})` : "")) ?? [];
  const wikidataItems = wikidataItemsOf(countryItem.entry, wikidataByName);
  const range = evidence.wikidata.statements.filter((st) => wikidataItems.includes(st.item) && RANGE_PROPS.includes(st.property));
  return [
    `- **Snapshot:** ${int(speciesRecords)} counted records in ${facet.length} countries; core region ${coreRegions.join(", ")}. ${facet.map((c) => `${c.name} ${int(c.count)} (${region(c.name)})`).join(", ")}`,
    `- **Published today:** ${s?.range.countriesWithOpenRecords?.join(", ") ?? `none (${s?.range.status})`}`,
    colId
      ? `- **COL says** (${link(colId, `https://www.checklistbank.org/dataset/${release.key}/taxon/${colId}`)}, release ${release.version}): ${areas.length ? areas.join("; ") : "no distribution"}`
      : "- **COL says:** no COL id",
    wikidataItems.length
      ? `- **Wikidata says** (P2341 indigenous to, P183 endemic to): ${range.length ? range.map(statementLine).join("; ") : `no statements on ${wikidataItems.map(wikidataLink).join(", ")}`}`
      : "- **Wikidata says:** no item",
    "",
  ];
}

export function renderPresort(inputs: PresortInputs): string {
  const { evidence, recommendations, species, snapshots } = inputs;
  const itemsByKey = new Map(evidence.entries.map((e) => [e.key, e]));
  const recsByKey = new Map(recommendations.map((r) => [r.key, r]));
  const speciesById = new Map(species.map((s) => [s.id, s]));
  const wikidataByName = bindingsByName(snapshots.wikidata);
  const groups = new Map<number, EvidenceItem[]>();
  for (const item of [...evidence.entries].sort(byKey)) groups.set(item.entry.speciesId, [...(groups.get(item.entry.speciesId) ?? []), item]);
  const lines = [
    ...header(inputs),
    "## Summary",
    "",
    ...summaryTable(presortCounts(evidence, recommendations)),
    "",
    ...acceptSection(inputs, itemsByKey),
    "## Per species",
    "",
  ];
  for (const id of [...groups.keys()].sort((a, b) => a - b)) {
    const items = groups.get(id)!;
    const s = speciesById.get(id);
    lines.push(`### ${id} · ${items[0]!.entry.scientificName}${s ? ` · ${s.commonName}` : ""}`, "");
    lines.push(...contextLines(items, s, inputs, wikidataByName));
    for (const item of items) lines.push(...entryBlock(item, recsByKey.get(item.key), inputs, wikidataByName));
  }
  return lines.join("\n").replace(/\n+$/, "\n");
}

// The key of every entry heading in 005's text: the literal coverage check.
export function headingKeys(text: string): string[] {
  return [...text.matchAll(/^#### (\S+) · /gm)].map((m) => m[1]!);
}
