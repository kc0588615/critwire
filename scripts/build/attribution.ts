// dist/v1/attribution.json (plan §7): critwire's license, every source the records cite, Natural Earth for the
// countries files, the GBIF derived dataset and every photo, each with its license and citation. Pure: every value
// comes from the records, the registration, data/countries.json and the registry (no clock).
import type { CountriesFile } from "../derive/naturalearth.ts";
import { FIELDS } from "../derive/record.ts";
import type { Registration } from "../gbif/derived-dataset.ts";
import type { Source, Species } from "../species.ts";
import { CRITWIRE_CREDIT, licenseUrl, NATURAL_EARTH, SOURCES, type RegisteredSource } from "./sources.ts";

const REPO = "https://github.com/kc0588615/critwire";
const COMMONS = "https://commons.wikimedia.org/";

export interface Attribution {
  critwire: { license: string; licenseUrl: string | null; credit: string; terms: string; code: { license: string; url: string } };
  // release: COL's for Catalogue of Life; Natural Earth's has only version and issued (a subset of COL's keys, plan D4).
  sources: (Pick<Source, "source" | "fields" | "license" | "retrieved" | "doi" | "checklistKey">
    & { url: string; records: number; licenseUrl: string | null; release?: { version: string; issued: string; key?: number; alias?: string };
      citation: string; notes?: string })[];
  gbifDerivedDataset: { doi: string; url: string; citation: string; title: string; sourceUrl: string; records: number;
    datasets: { datasetKey: string; records: number }[] } | null;
  photos: { speciesId: number; slug: string; credit: string; license: string; licenseUrl: string | null; page: string; citation: string }[];
}

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// registration: the current GBIF derived dataset; null only in a --draft build. countries: data/countries.json.
export function buildAttribution(species: Species[], registration: Registration | null, countries: CountriesFile): Attribution {
  return {
    critwire: {
      license: "CC BY 4.0", licenseUrl: licenseUrl("CC BY 4.0"), credit: CRITWIRE_CREDIT,
      terms: `${REPO}/blob/main/DATA-LICENSE.md`, code: { license: "MIT", url: `${REPO}/blob/main/LICENSE` },
    },
    sources: sources(species, registration, countries),
    gbifDerivedDataset: registration && derivedDataset(registration),
    photos: species.flatMap(({ id, slug, photo }) => {
      if (!photo) return [];
      if (!photo.page.startsWith(COMMONS)) throw new Error(`species ${id}: photo page ${photo.page} is not on Wikimedia Commons`);
      const { credit, license, page } = photo;
      return [{ speciesId: id, slug, credit, license, licenseUrl: licenseUrl(license), page, citation: `${credit}, ${license}, via Wikimedia Commons, ${page}` }];
    }),
  };
}

const citation = ({ citation }: RegisteredSource, source: Source, registration: Registration | null) =>
  (typeof citation === "string" ? citation : citation(source, registration));

function registered(name: string): RegisteredSource {
  const entry = SOURCES[name];
  if (!entry) throw new Error(`unknown source "${name}": add it to SOURCES in scripts/build/sources.ts`);
  return entry;
}

// The record sources' entries plus Natural Earth's, sorted by name; every registered source must be credited once.
function sources(species: Species[], registration: Registration | null, countries: CountriesFile): Attribution["sources"] {
  const all = [...recordSources(species, registration), countriesSource(countries)].sort((a, b) => byText(a.source, b.source));
  const names = all.map((s) => s.source);
  for (const name of Object.keys(SOURCES)) {
    const n = names.filter((x) => x === name).length;
    if (n !== 1) throw new Error(`scripts/build/sources.ts registers "${name}", which ${n === 0 ? "no record or file cites" : `is credited ${n} times`}`);
  }
  return all;
}

// Natural Earth, for /v1/countries.*: its fields are the files' columns (file-qualified, so no one reads them as species
// fields; code is ISO's) and its records the country rows (002 §6).
function countriesSource({ source: { release, retrieved }, rows }: CountriesFile): Attribution["sources"][number] {
  const { url, citation, notes } = registered(NATURAL_EARTH);
  if (typeof citation !== "string") throw new Error(`${NATURAL_EARTH}'s citation must be fixed text (no record source to build it from)`);
  const license = "Public domain";
  return {
    source: NATURAL_EARTH, url, fields: ["countries.name", "countries.continent", "countries.region", "countries.subregion"],
    records: rows.length, license, licenseUrl: licenseUrl(license), retrieved,
    release: { version: release.version, issued: release.issued }, citation, ...(notes === undefined ? {} : { notes }),
  };
}

// One entry per source name in sources[], sorted like sources[]. Its per-source values must be the same in every
// record (one snapshot per source); fields is the union of the fields it fills, in FIELDS order.
function recordSources(species: Species[], registration: Registration | null): Attribution["sources"] {
  const cited = new Map<string, Source[]>();
  for (const r of species) {
    for (const s of r.sources) {
      if (r.sources.filter((x) => x.source === s.source).length > 1) throw new Error(`record ${r.id}: source ${s.source} cited twice`);
      cited.set(s.source, [...(cited.get(s.source) ?? []), s]);
    }
  }

  return [...cited.keys()].sort(byText).map((name) => {
    const entries = cited.get(name)!;
    const entry = registered(name);
    const [first] = entries;
    const { license, retrieved, doi, release, checklistKey } = first;
    const shared = JSON.stringify({ license, retrieved, doi, release, checklistKey });
    for (const e of entries) {
      const { license, retrieved, doi, release, checklistKey } = e;
      if (JSON.stringify({ license, retrieved, doi, release, checklistKey }) !== shared) {
        throw new Error(`source ${name}: license, retrieved, doi, release or checklistKey differs between records`);
      }
    }
    return {
      source: name, url: entry.url,
      fields: FIELDS.filter((f) => entries.some((e) => e.fields.includes(f))),
      records: entries.length, license, licenseUrl: licenseUrl(license),
      // Optional keys are left out rather than null.
      ...(retrieved === undefined ? {} : { retrieved }), ...(doi === undefined ? {} : { doi }),
      ...(release === undefined ? {} : { release }), ...(checklistKey === undefined ? {} : { checklistKey }),
      citation: citation(entry, first, registration),
      ...(entry.notes === undefined ? {} : { notes: entry.notes }),
    };
  });
}

function derivedDataset({ doi, citation, title, sourceUrl, records, relatedDatasets }: Registration): NonNullable<Attribution["gbifDerivedDataset"]> {
  const datasets = Object.keys(relatedDatasets).sort(byText).map((datasetKey) => ({ datasetKey, records: relatedDatasets[datasetKey] }));
  const sum = datasets.reduce((n, d) => n + d.records, 0);
  if (sum !== records) throw new Error(`registration.json: datasets sum to ${sum} records, not ${records}`);
  return { doi, url: `https://doi.org/${doi}`, citation, title, sourceUrl, records, datasets };
}
