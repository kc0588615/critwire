// dist/index.html (plan §8): fills site/index.html's {{slot}}s from attribution.json, the records and site/style.css.
// Pure. Values are HTML-escaped and list fragments are built escaped; a slot the template lacks, or one it has that
// isn't filled, throws.
import type { RangeStatus, Species } from "../species.ts";
import type { Attribution } from "./attribution.ts";
import { esc, fillSlots, licenseLink, link } from "./html.ts";
import { NATURAL_EARTH } from "./sources.ts";

export const docsTemplate = new URL("../../site/index.html", import.meta.url);

export function renderDocs(template: string, style: string, attribution: Attribution, species: Species[]): string {
  const count = (status: RangeStatus) => species.filter((s) => s.range.status === status).length;
  const names = new Map(species.map((s) => [s.id, s.commonName]));
  const slots: Record<string, string> = {
    style,
    species: esc(species.length),
    statusOk: esc(count("ok")),
    statusNoOpenRecords: esc(count("no-open-records")),
    statusIdentityUnsettled: esc(count("identity-unsettled")),
    critwireCredit: esc(attribution.critwire.credit),
    sources: attribution.sources.map((s) => [
      `<dt>${link(s.url, s.source)}</dt>`,
      `<dd>${esc(s.citation)}<br>License: ${licenseLink(s.license, s.licenseUrl)}`
        + `${s.retrieved ? `, retrieved ${esc(s.retrieved)}` : ""}. Used for ${esc(s.records)} ${s.source === NATURAL_EARTH ? "countries" : "records"}: `
        + `${s.fields.map((f) => `<code>${esc(f)}</code>`).join(", ")}.</dd>`,
    ].join("\n")).join("\n"),
    gbifDerivedDataset: derivedDataset(attribution.gbifDerivedDataset),
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
