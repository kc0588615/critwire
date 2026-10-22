// GBIF derived-dataset contributions (plan §5 Derive): per occurrence dataset, every record the countries queries
// matched for the settled species, records in excluded stray countries included (they decide the core region).
// Pure: no fs, network or clock. Attribution only; no rule reads it.
import type { Fetched, GbifDatasets, GbifOccurrenceResponse } from "../raw.ts";
import type { ContributingTaxon, Contributions } from "../gbif/derived-dataset.ts";

export interface ContributionInput {
  speciesId: number;
  // deriveGbif's taxonKey: null means unsettled, which contributes nothing.
  taxonKey: number | null;
  occurrences: Fetched<GbifOccurrenceResponse> | null;
  datasets: GbifDatasets | null;
}

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function gbifContributions(retrieved: string, species: readonly ContributionInput[]): Contributions {
  const byTaxon = new Map<number, { raw: string; first: number; taxon: ContributingTaxon; counts: Record<string, number> }>();
  for (const s of species) {
    if (s.taxonKey === null) continue;
    if (s.occurrences === null || s.datasets === null) throw new Error(`gbif: no dataset counts for taxon ${s.taxonKey}: data/raw/gbif is stale: run pnpm ingest gbif`);
    const raw = JSON.stringify([s.occurrences, s.datasets]);
    const seen = byTaxon.get(s.taxonKey);
    if (seen) {
      if (seen.raw !== raw) throw new Error(`gbif: taxon ${s.taxonKey} has different raw for species ${Math.min(seen.first, s.speciesId)} and ${Math.max(seen.first, s.speciesId)}`);
      seen.taxon.speciesIds.push(s.speciesId);
      continue;
    }
    let records = 0;
    for (const [key, n] of Object.entries(s.datasets.counts)) {
      if (!UUID.test(key)) throw new Error(`gbif: taxon ${s.taxonKey}: dataset key ${JSON.stringify(key)} is not a UUID`);
      if (!Number.isSafeInteger(n) || n < 1) throw new Error(`gbif: taxon ${s.taxonKey}: dataset ${key} has count ${n}`);
      records += n;
    }
    const count = s.occurrences.response.count;
    if (records !== count) throw new Error(`gbif: taxon ${s.taxonKey}: dataset counts sum to ${records}, count is ${count}`);
    byTaxon.set(s.taxonKey, { raw, first: s.speciesId, counts: s.datasets.counts, taxon: { taxonKey: s.taxonKey, speciesIds: [s.speciesId], records, url: s.occurrences.url } });
  }

  const taxa = [...byTaxon.values()].sort((a, b) => a.taxon.taxonKey - b.taxon.taxonKey);
  const totals = new Map<string, number>();
  for (const { counts } of taxa) for (const [key, n] of Object.entries(counts)) totals.set(key, (totals.get(key) ?? 0) + n);
  return {
    retrieved,
    records: taxa.reduce((a, t) => a + t.taxon.records, 0),
    taxa: taxa.map(({ taxon }) => ({ ...taxon, speciesIds: [...taxon.speciesIds].sort((a, b) => a - b) })),
    datasets: Object.fromEntries([...totals.keys()].sort(byText).map((key) => [key, totals.get(key)!])),
  };
}
