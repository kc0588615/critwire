// dist/index.html (plan §8): fills site/index.html's {{slot}}s from attribution.json, the records, the page's own
// stylesheet site/docs.css and script site/docs.js (both inlined; rawText refuses text that would end their element
// early), and the font's URLs (plan 2026-11-25-critwire-web-modernize §1). Pure. Values are HTML-escaped and list
// fragments are built escaped; a slot the template lacks, or one it has that isn't filled, throws.
import type { RangeStatus, Species } from "../species.ts";
import type { Attribution } from "./attribution.ts";
import { CURATED_SOURCE, MDD_SOURCE } from "../derive/listings.ts";
import { esc, fillSlots, licenseLink, link, rawText } from "./html.ts";
import { GBIF_CHECKLISTS, NATURAL_EARTH } from "./sources.ts";

export const site = new URL("../../site/", import.meta.url);
export const docsTemplate = new URL("index.html", site);
export const docsStyle = new URL("docs.css", site);
export const docsScript = new URL("docs.js", site);

// The docs page's font, served at /fonts/ under a fixed name: its bytes never change, so new bytes need a new file
// name (Caddy sends no Cache-Control). Atkinson Hyperlegible Next (Braille Institute, SIL OFL 1.1; the copyright line
// names no Reserved Font Name, so the subset keeps its name, OFL condition 3), a Latin subset made once, outside the
// build, which only copies the committed bytes (plan 2026-11-25-critwire-web-modernize §1 "Font step", S1, 2026-11-25):
//   inputs, google/fonts at 66eef70728ca29f28c31cdc5e7947f2c2de73e8d, ofl/atkinsonhyperlegiblenext/:
//     AtkinsonHyperlegibleNext[wght].ttf  114,552 B  sha256 5a455d1cfa099b601ab70751bb9673e8fe1854dc4500c80e1a220d0d75e31745
//     OFL.txt                               4,431 B  sha256 aca6a428580965d2297d1b718042dd427c2a9443ece3b0d02d758e161e0c4030
//   command (uv's fonttools[woff]==4.68.0 + brotli==1.2.1):
//     uv tool run --from 'fonttools[woff]==4.68.0' --with 'brotli==1.2.1' pyftsubset font.ttf \
//       --unicodes='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' \
//       --name-IDs='*' --flavor=woff2 --output-file=site/fonts/atkinson-hyperlegible-next.woff2
//   output: 32,336 B, sha256 416e6dfac2746f060c23ecd8f183ba805278bc48192eb06060ac00ccd42fe97c (same over 2 runs);
//   sxHeight 496 / unitsPerEm 1000; name IDs 13, 14 (license, license URL) kept. OFL.txt is the input's, copied as is.
export const FONT = "fonts/atkinson-hyperlegible-next.woff2";
export const FONT_LICENSE = "fonts/OFL.txt";
// Files under site/ the build copies to the same path under dist/.
export const DOCS_FILES = [FONT, FONT_LICENSE] as const;

// What a credited source's count counts, where it isn't records.
const UNITS: Readonly<Record<string, string>> = { [NATURAL_EARTH]: "countries", [GBIF_CHECKLISTS]: "rows", [MDD_SOURCE]: "rows", [CURATED_SOURCE]: "rows" };

export function renderDocs(template: string, code: { style: string; script: string }, attribution: Attribution, species: Species[]): string {
  const count = (status: RangeStatus) => species.filter((s) => s.range.status === status).length;
  const names = new Map(species.map((s) => [s.id, s.commonName]));
  const slots: Record<string, string> = {
    style: rawText("style", code.style, "site/docs.css"),
    script: rawText("script", code.script, "site/docs.js"),
    fontUrl: esc(`/${FONT}`),
    fontLicenseUrl: esc(`/${FONT_LICENSE}`),
    species: esc(species.length),
    statusOk: esc(count("ok")),
    statusNoOpenRecords: esc(count("no-open-records")),
    statusIdentityUnsettled: esc(count("identity-unsettled")),
    critwireCredit: esc(attribution.critwire.credit),
    sources: attribution.sources.map((s) => [
      `<dt>${link(s.url, s.source)}</dt>`,
      `<dd>${esc(s.citation)}<br>License: ${licenseLink(s.license, s.licenseUrl)}`
        + `${s.retrieved ? `, retrieved ${esc(s.retrieved)}` : ""}. Used for ${esc(s.records)} ${UNITS[s.source] ?? "records"}: `
        + `${s.fields.map((f) => `<code>${esc(f)}</code>`).join(", ")}.</dd>`,
    ].join("\n")).join("\n"),
    gbifDerivedDataset: derivedDataset(attribution.gbifDerivedDataset),
    gbifChecklistCount: esc(attribution.gbifChecklists.length),
    gbifChecklists: attribution.gbifChecklists.map((d) =>
      `<li>${link(d.url, d.title)}: ${licenseLink(d.license, d.licenseUrl)}, ${link(`https://doi.org/${d.doi}`, d.doi)}, ${esc(d.rows)} ${d.rows === 1 ? "row" : "rows"}</li>`,
    ).join("\n"),
    photoCount: esc(attribution.photos.length),
    photos: attribution.photos.map((p) =>
      `<li>${link(p.page, names.get(p.speciesId)!)}: ${esc(p.credit)}, ${licenseLink(p.license, p.licenseUrl)}, via Wikimedia Commons</li>`,
    ).join("\n"),
  };

  return fillSlots(template, slots, "site/index.html");
}

function derivedDataset(dd: Attribution["gbifDerivedDataset"]): string {
  if (dd === null) return "<p>Draft build: no GBIF derived-dataset DOI yet.</p>";
  return [
    `<p>The country lists count ${esc(dd.records.toLocaleString("en-US"))} open occurrence records from `
      + `${esc(dd.datasets.length)} datasets shared through GBIF. GBIF registered them as a derived dataset with its own DOI, `
      + `so every dataset gets credit: ${link(dd.url, dd.doi)}.</p>`,
    `<p>${esc(dd.citation)}</p>`,
    `<p>The full list of datasets and their record counts is in ${link("/v1/attribution.json", "attribution.json")}.</p>`,
  ].join("\n");
}
