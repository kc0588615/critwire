// DuckDB over HTTP (plan §9 duckdb): a query on the served species.parquet, answered with range requests.
import { expect, test } from "@playwright/test";
import { accessLog, openDuckDB, ORIGIN, records, statusCounts, tag, type DuckDB } from "./helpers.ts";

let db: DuckDB;
test.beforeAll(async () => { db = await openDuckDB(); });
test.afterAll(() => db.close());

test("DuckDB queries species.parquet over HTTP with range requests", async () => {
  const uri = `/v1/species.parquet?${tag()}`;
  const rows = await db.rows(`SELECT "range".status AS status, count(*)::INTEGER AS n FROM read_parquet('${ORIGIN}${uri}') GROUP BY 1 ORDER BY 1`);
  expect(Object.fromEntries(rows.map((r) => [r.status, r.n]))).toEqual(statusCounts(await records()));
  await expect.poll(async () => (await accessLog()).some((e) =>
    e.request.uri === uri && e.request.method === "GET" && e.status === 206 && e.request.headers.Range !== undefined)).toBe(true);
});
