// HB7 (L3 §1.7 #9): rasterWkb's bytes through PostGIS raster in critwire_dev. Written before the code, seen failing
// first. Failure mode: a WKB that HB3's layout accepts but ST_RastFromWKB reads with another size, SRID, pixel type,
// nodata, georeference or cell order (the loader's clips would then misplace every class).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import postgres from "postgres";
import { testDatabaseUrl } from "../test-db.ts";
import { rasterWkb } from "./habitat.ts";

let sql: postgres.Sql;
before(async () => { sql = postgres(await testDatabaseUrl(), { onnotice: () => {} }); });
after(async () => { await sql.end(); });

test("HB7 ST_RastFromWKB reads rasterWkb: width, height, SRID 4326, 16BUI, nodata, georeference, ST_Value per cell", async () => {
  // 3 × 2, row-major from the upper left; 0 is nodata (ST_Value's NULL, asked apart: postgres.js reads a NULL array element as NaN).
  const pixels = new Uint8Array(new Uint16Array([105, 1405, 0, 600, 65_534, 104]).buffer);
  const wkb = Buffer.from(rasterWkb({ width: 3, height: 2, ulx: -84.2, uly: 10.6, scale: 0.000898315, srid: 4326, nodata: 0, pixels }));
  const [r] = await sql`with r as (select ST_RastFromWKB(${wkb}::bytea) as r)
    select ST_Width(r) as w, ST_Height(r) as h, ST_SRID(r) as srid, ST_NumBands(r) as bands, ST_BandPixelType(r, 1) as type,
      ST_BandNoDataValue(r, 1) as nodata, ST_UpperLeftX(r) as ulx, ST_UpperLeftY(r) as uly, ST_ScaleX(r) as sx, ST_ScaleY(r) as sy,
      array[ST_Value(r, 1, 1, 1), ST_Value(r, 1, 2, 1), ST_Value(r, 1, 1, 2), ST_Value(r, 1, 2, 2), ST_Value(r, 1, 3, 2)] as v,
      ST_Value(r, 1, 3, 1) is null as nodata_cell,
      ST_Value(r, 1, ST_SetSRID(ST_Point(-84.2 + 0.000898315 * 1.5, 10.6 - 0.000898315 * 1.5), 4326)) as at_point,
      ST_AsBinary(r) = ${wkb}::bytea as round_trip
    from r`;
  assert.deepEqual({ ...r }, {
    w: 3, h: 2, srid: 4326, bands: 1, type: "16BUI", nodata: 0, ulx: -84.2, uly: 10.6, sx: 0.000898315, sy: -0.000898315,
    v: [105, 1405, 600, 65_534, 104], nodata_cell: true, at_point: 65_534, round_trip: true,
  });
});
