# critwire

Open, curated species data for nature apps (grades 6–12), at critwire.com. One clean record per animal: names, taxonomy, ids that match GBIF, COL, IUCN, Wikidata, iNaturalist and NCBI, countries with open occurrence records, photos with credits. Built for and used by [Critter Connect](https://play.critterconnect.org).

Published as static files under `https://critwire.com/v1/`, so DuckDB, QGIS, pandas or a browser can read them directly (CORS open, `Range` requests honored):

- `species.parquet`: all records, nested like the JSON
- `species.csv`: all records, flat (no `sources`)
- `species.json`: all records
- `species/{id}.json`, `species/{slug}.json`: one record
- `attribution.json`: every source, its license and citation, the GBIF derived-dataset DOI, photo credits

```sql
SELECT * FROM 'https://critwire.com/v1/species.parquet';
```

Docs (fields, examples, licenses, credits): https://critwire.com/. Plan: `plans/001-mvp.md`. Agents: `AGENTS.md`. Licenses: `LICENSE` (code, MIT), `DATA-LICENSE.md` (data, CC BY 4.0).

## Dev

```sh
pnpm install
pnpm typecheck
pnpm test             # unit tests
pnpm build            # offline: loads DATABASE_URL, writes dist/ (--draft: no GBIF DOI needed)
pnpm e2e              # Playwright against dist/ via a local Caddy (after pnpm build)
pnpm gbif:register    # registers the GBIF derived dataset (see AGENTS.md, GBIF DOI refresh)
```
