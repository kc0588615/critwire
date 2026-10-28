// The ERD sources the build reads (plan D10): site/learn/erd/{v1,schema,lab,star}.mmd, the only copy of each diagram.
// v1.mmd is schema v1, which schema.mmd extends unchanged; the other three are drawn (pnpm erd, S8) and get pages with
// data dictionaries (S15). erdErrors checks them without a database: each parses, schema.mmd keeps v1, the drawn three
// carry accTitle/accDescr (the SVG's <title> and <desc>), markers name drawn entities only, every entity has a source.
// svgErrors refuses a drawn ERD whose committed SVG is missing or stale: pnpm erd stamps each SVG with its source's
// sha256 (`data-source-sha256` on the root <svg>), and only a source that changed is drawn again.
// The catalog checks run elsewhere: lab in learn:check, star in the build's writeStar (S9), schema in E2E.
// Tests: erd.test.ts.
import { readFile } from "node:fs/promises";
import { readOptionalText } from "../../json.ts";
import { baseDrift, baseOf, ERD_DIR, markerErrors, markers, parseErd, svgStale, type Erd } from "../../learn/erd-model.ts";

export { ERD_DIR };
export const ERD_NAMES = ["v1", "schema", "lab", "star"] as const;
export type ErdName = (typeof ERD_NAMES)[number];
/** The ERDs drawn as SVG and shown on a page. */
export const DRAWN_ERDS = ["schema", "lab", "star"] as const satisfies readonly ErdName[];
export type DrawnErd = (typeof DRAWN_ERDS)[number];
export type ErdTexts = Record<ErdName, string>;
/** The committed SVGs, by drawn ERD; absent when the file is. */
export type ErdSvgs = Partial<Record<DrawnErd, string>>;

const V1 = "critwire `/v1/species.parquet`";
const SAMPLE = "GBIF occurrence download, sampled (cited in the credits)";
const JUNG = "Jung et al. 2020, v004 (CC BY 4.0)";
/** Where each table's rows come from; COLUMN_SOURCES names the columns that differ. A table with no source fails. */
const SOURCES: Record<string, string> = {
  taxa: `${V1}: taxonomy from Catalogue of Life, else critwire base`,
  species: `${V1}; each field's source is in \`species_sources\``,
  countries: "critwire `/v1/countries.parquet`",
  species_countries: `${V1}, \`range.countriesWithOpenRecords\` (GBIF, CC0 and CC BY records)`,
  sources: `${V1}, \`sources[]\``,
  species_sources: `${V1}, \`sources[]\``,
  datasets: "GBIF registry: the download's datasets (`datasets.csv`)",
  occurrences: SAMPLE,
  country_shapes: "Natural Earth admin-0 1:50m (public domain)",
  admin1_shapes: "Natural Earth admin-1 1:50m (public domain)",
  biomes: "RESOLVE Ecoregions 2017 (CC BY 4.0)",
  ecoregions: "RESOLVE Ecoregions 2017 (CC BY 4.0)",
  habitat_classes: "Jung et al. 2020, v004 legend (CC BY 4.0)",
  country_habitats: "stand-in from Jung et al. 2020 (CC BY 4.0), until the habitat map is built",
  occurrence_habitats: `planned: ${JUNG}`,
  habitat_clips: `planned: ${JUNG}`,
  dim_species: "`species` and `species_taxonomy`",
  dim_country: "`countries`, plus the `ZZ` member",
  dim_dataset: "`datasets`",
  dim_year: "`occurrences.year`, plus the `-1` member",
  fact_records: "`occurrences`",
  fact_species_country: "`species_countries`",
  dim_habitat_class: "`habitat_classes`",
  fact_country_habitat: "`country_habitats`",
};
const COLUMN_SOURCES: Record<string, string> = {
  "occurrences.geom": "generated from `longitude`, `latitude`",
  "occurrences.license": "GBIF record and dataset licenses",
  "occurrences.country_code": "`country_code_gbif`, when a `countries` row",
  "dim_year.decade": "computed from `year`",
  "dim_year.label": "computed from `year`",
  "dim_habitat_class.level1_name": "`habitat_classes`, its level-1 row",
};

export interface DictionaryRow {
  column: string;
  /** As the .mmd writes it. */
  type: string;
  key: string;
  meaning: string;
  source: string;
}
export interface Dictionary {
  table: string;
  rows: DictionaryRow[];
}

/** One dictionary per entity, in the .mmd's order; `except`: only entities that ERD lacks or draws with other columns. */
export function dictionaries(text: string, { except }: { except?: string } = {}): Dictionary[] {
  const columns = (e: Erd["entities"][number]) => e.attributes.map((a) => a.name).join(",");
  const skip = new Map(except ? parseErd(except).entities.map((e) => [e.name, columns(e)]) : []);
  return parseErd(text).entities.filter((e) => skip.get(e.name) !== columns(e)).map((e) => {
    const source = SOURCES[e.name];
    if (!source) throw new Error(`${e.name} has no source`);
    return {
      table: e.name,
      rows: e.attributes.map((a) => ({
        column: a.name, type: a.written, key: [...a.keys].join(", "), meaning: a.comment, source: COLUMN_SOURCES[`${e.name}.${a.name}`] ?? source,
      })),
    };
  });
}

/** Every way the ERD sources break the rules above, each prefixed with its file; [] when they pass. */
export function erdErrors(texts: ErdTexts): string[] {
  const errors: string[] = [];
  const parsed: Partial<Record<ErdName, Erd>> = {};
  for (const name of ERD_NAMES) {
    const at = (s: string) => errors.push(`${ERD_DIR}/${name}.mmd: ${s}`);
    const attempt = (f: () => void) => {
      try {
        f();
      } catch (e) {
        at((e as Error).message);
      }
    };
    attempt(() => void (parsed[name] = parseErd(texts[name])));
    const erd = parsed[name];
    if (!erd || name === "v1") continue;
    if (erd.title === undefined) at("no accTitle: (the SVG's <title>)");
    if (erd.description === undefined) at("no accDescr: (the SVG's <desc>)");
    attempt(() => markerErrors(erd, markers(texts[name])).forEach(at));
    attempt(() => void dictionaries(texts[name]));
    if (name === "schema") {
      if (baseOf(texts.schema) !== "v1.mmd") at("must name its base: %% extends: v1.mmd");
      else if (parsed.v1) baseDrift(parsed.v1, erd, "v1.mmd").forEach(at);
    }
  }
  return errors;
}

/** Each drawn ERD whose SVG is missing or stale, as an error naming the file; [] when all are current. */
export function svgErrors(texts: ErdTexts, svgs: ErdSvgs): string[] {
  return DRAWN_ERDS.flatMap((n) => {
    const file = `${ERD_DIR}/${n}.svg`;
    if (svgs[n] === undefined) return [`${file}: missing: run pnpm erd`];
    return svgStale(texts[n], svgs[n]) ? [`${file} is stale: run pnpm erd`] : [];
  });
}

/** The four sources and the drawn three's SVGs, read from the repository, with erdErrors and svgErrors over them. */
export async function readErds(): Promise<{ texts: ErdTexts; svgs: ErdSvgs; errors: string[] }> {
  const root = new URL(`../../../${ERD_DIR}/`, import.meta.url);
  const entries = await Promise.all(ERD_NAMES.map(async (n) => [n, await readFile(new URL(`${n}.mmd`, root), "utf8")] as const));
  const texts = Object.fromEntries(entries) as ErdTexts;
  const svgs: ErdSvgs = {};
  for (const n of DRAWN_ERDS) {
    const svg = await readOptionalText(new URL(`${n}.svg`, root));
    if (svg !== null) svgs[n] = svg;
  }
  return { texts, svgs, errors: [...erdErrors(texts), ...svgErrors(texts, svgs)] };
}
