// dist/v1/attribution.json (plan §7): critwire's license, every source the records cite, the GBIF derived dataset and
// every photo, each with its license and citation. Pure: every value comes from the records, the registration and
// the registry (no clock).
import { FIELDS } from "../derive/record.ts";
import type { Registration } from "../gbif/derived-dataset.ts";
import type { Source, Species } from "../species.ts";
import { CRITWIRE_CREDIT, licenseUrl, SOURCES } from "./sources.ts";

const REPO = "https://github.com/kc0588615/critwire";
const COMMONS = "https://commons.wikimedia.org/";

export interface Attribution {
  critwire: { license: string; licenseUrl: string | null; credit: string; terms: string; code: { license: string; url: string } };
  sources: (Pick<Source, "source" | "fields" | "license" | "retrieved" | "doi" | "release" | "checklistKey">
    & { url: string; records: number; licenseUrl: string | null; citation: string; notes?: string })[];
  gbifDerivedDataset: { doi: string; url: string; citation: string; title: string; sourceUrl: string; records: number;
    datasets: { datasetKey: string; records: number }[] } | null;
  photos: { speciesId: number; slug: string; credit: string; license: string; licenseUrl: string | null; page: string; citation: string }[];
}

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// registration: the current GBIF derived dataset; null only in a --draft build.
export function buildAttribution(species: Species[], registration: Registration | null): Attribution {
  return {
    critwire: {
      license: "CC BY 4.0", licenseUrl: licenseUrl("CC BY 4.0"), credit: CRITWIRE_CREDIT,
      terms: `${REPO}/blob/main/DATA-LICENSE.md`, code: { license: "MIT", url: `${REPO}/blob/main/LICENSE` },
    },
    sources: sources(species, registration),
    gbifDerivedDataset: registration && derivedDataset(registration),
    photos: species.flatMap(({ id, slug, photo }) => {
      if (!photo) return [];
      if (!photo.page.startsWith(COMMONS)) throw new Error(`species ${id}: photo page ${photo.page} is not on Wikimedia Commons`);
      const { credit, license, page } = photo;
      return [{ speciesId: id, slug, credit, license, licenseUrl: licenseUrl(license), page, citation: `${credit}, ${license}, via Wikimedia Commons, ${page}` }];
    }),
  };
}

// One entry per source name in sources[], sorted like sources[]. Its per-source values must be the same in every
// record (one snapshot per source); fields is the union of the fields it fills, in FIELDS order.
function sources(species: Species[], registration: Registration | null): Attribution["sources"] {
  const cited = new Map<string, Source[]>();
  for (const r of species) {
    for (const s of r.sources) {
      if (r.sources.filter((x) => x.source === s.source).length > 1) throw new Error(`record ${r.id}: source ${s.source} cited twice`);
      cited.set(s.source, [...(cited.get(s.source) ?? []), s]);
    }
  }
  for (const name of Object.keys(SOURCES)) {
    if (!cited.has(name)) throw new Error(`scripts/build/sources.ts registers "${name}", which no record cites`);
  }

  return [...cited.keys()].sort(byText).map((name) => {
    const entries = cited.get(name)!;
    const registered = SOURCES[name];
    if (!registered) throw new Error(`unknown source "${name}": add it to SOURCES in scripts/build/sources.ts`);
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
      source: name, url: registered.url,
      fields: FIELDS.filter((f) => entries.some((e) => e.fields.includes(f))),
      records: entries.length, license, licenseUrl: licenseUrl(license),
      // Optional keys are left out rather than null.
      ...(retrieved === undefined ? {} : { retrieved }), ...(doi === undefined ? {} : { doi }),
      ...(release === undefined ? {} : { release }), ...(checklistKey === undefined ? {} : { checklistKey }),
      citation: registered.citation(first, registration),
      ...(registered.notes === undefined ? {} : { notes: registered.notes }),
    };
  });
}

function derivedDataset({ doi, citation, title, sourceUrl, records, relatedDatasets }: Registration): NonNullable<Attribution["gbifDerivedDataset"]> {
  const datasets = Object.keys(relatedDatasets).sort(byText).map((datasetKey) => ({ datasetKey, records: relatedDatasets[datasetKey] }));
  const sum = datasets.reduce((n, d) => n + d.records, 0);
  if (sum !== records) throw new Error(`registration.json: datasets sum to ${sum} records, not ${records}`);
  return { doi, url: `https://doi.org/${doi}`, citation, title, sourceUrl, records, datasets };
}
