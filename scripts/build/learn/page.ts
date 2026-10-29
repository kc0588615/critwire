// dist/learn/data/index.html (plan D9.8, 004 §4.5): fills site/learn/data/index.html's {{slot}}s from manifest.json and
// the sample's datasets with their record counts (contributions.json's). Pure. Values are HTML-escaped; every manifest file needs a description here.
import type { SampleDatasetRow } from "../../derive/sample.ts";
import { esc, fillSlots, licenseLink, link } from "../html.ts";
import type { Credit } from "./credits.ts";
import type { LabManifest } from "./data.ts";

export const labPageTemplate = new URL("../../../site/learn/data/index.html", import.meta.url);

// One line per /learn/data/ file, under its name.
const DESCRIPTIONS: Record<string, string> = {
  "occurrences.parquet": "The GBIF sample: one row per open occurrence record.",
  "occurrences.csv": "The same records as CSV.",
  "datasets.csv": "The datasets in the sample: title, publisher, DOI and declared license.",
  "country_shapes.parquet": "Country outlines, Natural Earth admin-0 at 1:50m.",
  "admin1_shapes.parquet": "State and province outlines, Natural Earth admin-1 at 1:50m (the countries it covers at that scale).",
  "ecoregions.parquet": "RESOLVE Ecoregions 2017, each outline simplified on its own.",
  "biomes.csv": "The biomes the ecoregions belong to.",
  "habitat_classes.parquet": "The habitat map's classes (Jung et al. 2020, v004 legend): level 1 and level 2.",
  "country_habitats.parquet": "Estimated area of each habitat class in each country: the map's 1 km class fractions × each cell's area, summed over the cells whose centre is in the country's outline. Estimated from a map, not measured.",
  "occurrence_habitats.parquet": "Each sample record's habitat class: the most common class in its 1 km cell of the map (empty if none), estimated from the map. The class at that place, not the species' habitat.",
  "habitat_clips.parquet": "Two clips of the 100 m habitat map as PostGIS rasters (WKB): all of Costa Rica (cr) and Tasmania (tas), in 256 × 256-cell tiles, one row each; tiles holding none of the country are left out.",
  "clips/cr.tif": "The Costa Rica clip as a cloud-optimized GeoTIFF, for QGIS or any GIS; cells outside the kept tiles are nodata.",
  "clips/tas.tif": "The Tasmania clip as a cloud-optimized GeoTIFF; cells outside the kept tiles are nodata.",
  "postgis/learn_curriculum.sql": "Builds every lab table in PostGIS (see PostGIS below).",
  "star/dim_country.csv": "Star dimension: every country, plus ZZ for a record with no country.",
  "star/dim_dataset.csv": "Star dimension: each dataset in the sample, with what it takes to credit it.",
  "star/dim_species.csv": "Star dimension: each species with its class, order, family and genus side by side.",
  "star/dim_year.csv": "Star dimension: each year with records, its decade, plus -1 for a record with no year.",
  "star/fact_records.csv": "Star fact: one row per sample record, with a key to each dimension.",
  "star/fact_species_country.csv": "Star fact with no measure: each species and country with open records of it.",
  "star/manifest.json": "The star's files: columns, keys, rows, sha256 and sources, for Power BI's input check.",
};

const n = (value: number) => value.toLocaleString("en-US");
const size = (bytes: number) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : bytes >= 1e3 ? `${(bytes / 1e3).toFixed(1)} kB` : `${bytes} bytes`);
const doiLink = (doi: string) => link(`https://doi.org/${doi}`, doi);

export function renderLabPage(template: string, style: string, manifest: LabManifest,
  { datasets, counts }: { datasets: readonly SampleDatasetRow[]; counts: Readonly<Record<string, number>> }): string {
  const sample = manifest.files["occurrences.parquet"]?.sources.find((s) => s.datasets);
  if (!sample) throw new Error("manifest.json: occurrences.parquet has no source crediting the datasets");
  const sources = new Map<string, Credit>();
  for (const f of Object.values(manifest.files)) for (const s of f.sources) sources.set(s.name, s);

  const slots: Record<string, string> = {
    style,
    files: Object.entries(manifest.files).map(([name, f]) => {
      const description = DESCRIPTIONS[name];
      if (!description) throw new Error(`${name}: no description in scripts/build/learn/page.ts`);
      const rows = f.tables ? `${Object.keys(f.tables).length} tables` : f.rows === undefined ? "" : n(f.rows);
      return `<tr><td>${link(`/learn/data/${name}`, name)}<span class="note">${esc(description)}</span></td>`
        + `<td class="num">${esc(rows)}</td><td class="num">${esc(size(f.bytes))}</td>`
        + `<td>${f.sources.map((s) => `${esc(s.name)} (${licenseLink(s.license, s.licenseUrl)})`).join("<br>")}</td></tr>`;
    }).join("\n"),
    totalBytes: esc(`${size(manifest.bytes)} (${n(manifest.bytes)} bytes)`),
    records: esc(n(manifest.inputs.sample.rows)),
    datasetCount: esc(n(datasets.length)),
    downloadDoi: doiLink(manifest.dois.download),
    sampleDoi: manifest.dois.sample === null
      ? "<p>Draft build: the sample has no derived-dataset DOI yet.</p>"
      : `<p>GBIF registered the sample itself as a derived dataset, so each dataset in it gets credit: ${doiLink(manifest.dois.sample)}. `
        + `Cite it when you use these records:</p>\n<pre class="wrap"><code>${esc(sample.derivedDataset!.citation)}</code></pre>`,
    sources: [...sources.values()].map((s) => [
      `<dt>${link(s.url, s.name)}</dt>`,
      `<dd>${esc(s.citation)}<br>License: ${licenseLink(s.license, s.licenseUrl)}`
        + `${s.doi ? `. DOI: ${doiLink(s.doi)}` : ""}${s.derivedDataset ? `. Derived dataset: ${doiLink(s.derivedDataset.doi)}` : ""}.</dd>`,
    ].join("\n")).join("\n"),
    datasets: datasets.map((d) => {
      const records = counts[d.dataset_key];
      if (!records) throw new Error(`dataset ${d.dataset_key}: no records in the sample`);
      return `<tr><td>${esc(d.title)}</td><td>${esc(d.publisher)}</td><td>${d.doi === null ? "none" : doiLink(d.doi)}</td>`
        + `<td>${esc(d.license)}</td><td class="num">${esc(n(records))}</td></tr>`;
    }).join("\n"),
  };
  return fillSlots(template, slots, "site/learn/data/index.html");
}
