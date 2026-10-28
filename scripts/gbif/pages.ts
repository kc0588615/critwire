// GBIF's paged listings (offset/limit until endOfRecords), shared by gbif:register and ingest gbif-sample.
import { getJson, type GetJsonInit } from "../http.ts";

const PAGE_LIMIT = 1000; // GBIF's maximum page size

// Every row of a GBIF paged listing. Throws on an empty page before the end, or a total ≠ GBIF's count.
export async function allPages<T>(url: string, init: GetJsonInit = {}): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const page = await getJson(`${url}?offset=${rows.length}&limit=${PAGE_LIMIT}`, init) as
      { endOfRecords: boolean; count?: number; results: T[] };
    rows.push(...page.results);
    if (page.endOfRecords) {
      if (page.count !== undefined && page.count !== rows.length) throw new Error(`${url}: ${rows.length} rows, count ${page.count}`);
      return rows;
    }
    if (page.results.length === 0) throw new Error(`${url}: an empty page at offset ${rows.length} before endOfRecords`);
  }
}
