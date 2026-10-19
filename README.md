# critwire

Open, curated species data for nature apps (grades 6–12), at critwire.com. One clean record per animal: names, taxonomy, ids that match GBIF, COL, IUCN, Wikidata, iNaturalist and NCBI, open ranges, traits, photos with credits. Built for and used by [Critter Connect](https://play.critterconnect.org).

Published as static files under `/v1/` (Parquet, CSV, JSON), so DuckDB, QGIS, pandas or a browser can read them directly:

```sql
SELECT * FROM 'https://critwire.com/v1/species.parquet';
```

Not live yet. Plan: `plans/001-mvp.md`. Agents: `AGENTS.md`. Licenses: `LICENSE` (code, MIT), `DATA-LICENSE.md` (data, CC BY 4.0).

## Dev

```sh
pnpm install
pnpm build      # writes dist/
pnpm typecheck
```
