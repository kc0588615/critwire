# q: e2-typed
# status: ran
# after: py-connect, e2-file
TYPED = """
CREATE TEMP TABLE occurrences_new (
  id                       bigint PRIMARY KEY,
  species_id               integer NOT NULL,
  dataset_key              uuid NOT NULL,
  license                  text NOT NULL,
  basis_of_record          text NOT NULL,
  longitude                double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  latitude                 double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  coordinate_uncertainty_m double precision,
  country_code_gbif        text,
  year                     integer,
  month                    integer CHECK (month BETWEEN 1 AND 12),
  geom                     geometry(Point, 4326) GENERATED ALWAYS AS (ST_Point(longitude, latitude, 4326)) STORED
)"""

# The species whose GBIF key is the record's speciesKey, else its taxonKey (a synonym keeps our key in taxonKey).
# The license: this file's two codes renamed, for illustration only. The lab sample keeps a record only if its
# effective license, the more restrictive of its own and its dataset's, is open; that needs the dataset's too.
INSERT_TYPED = """
INSERT INTO occurrences_new
SELECT g."gbifID"::bigint, coalesce(by_species.id, by_taxon.id), g."datasetKey"::uuid,
       replace(replace(g.license, 'CC_BY_4_0', 'CC BY 4.0'), 'CC0_1_0', 'CC0 1.0'), g."basisOfRecord",
       g."decimalLongitude"::float8, g."decimalLatitude"::float8, g."coordinateUncertaintyInMeters"::float8,
       g."countryCode", g.year::integer, g.month::integer
FROM gbif_staging AS g
LEFT JOIN species AS by_species ON by_species.gbif_id = g."speciesKey"::bigint
LEFT JOIN species AS by_taxon ON by_taxon.gbif_id = g."taxonKey"::bigint
"""

# One row per check, with the rows that break it. Any non-zero count rolls the whole load back.
CHECKS = """
SELECT 'rows typed = rows staged', (SELECT count(*) FROM gbif_staging) - (SELECT count(*) FROM occurrences_new)
UNION ALL SELECT 'speciesKey and taxonKey name two species', count(*) FROM gbif_staging AS g
  JOIN species AS a ON a.gbif_id = g."speciesKey"::bigint
  JOIN species AS b ON b.gbif_id = g."taxonKey"::bigint
  WHERE a.id <> b.id
UNION ALL SELECT 'license not CC0 1.0 or CC BY 4.0', count(*) FROM occurrences_new
  WHERE license NOT IN ('CC0 1.0', 'CC BY 4.0')
"""

with connect() as conn, conn.cursor() as cur:
    with conn.transaction():  # all or nothing: an exception inside rolls every statement back
        stage(cur, GBIF_FILE)
        cur.execute(TYPED)
        cur.execute(INSERT_TYPED)  # a record that maps to no species fails NOT NULL here, and so the load
        failed = [(name, n) for name, n in cur.execute(CHECKS).fetchall() if n]
        if failed:
            raise SystemExit(f"load refused, nothing kept: {failed}")
        by_species_only = cur.execute(
            'SELECT count(*) FROM gbif_staging AS g JOIN species AS s ON s.gbif_id = g."speciesKey"::bigint').fetchone()[0]
        rows = cur.execute("""
            SELECT o.id, s.scientific_name, o.license, o.coordinate_uncertainty_m, o.year, ST_AsText(o.geom)
            FROM occurrences_new AS o JOIN species AS s ON s.id = o.species_id ORDER BY o.id""").fetchall()

print(f"joined on speciesKey alone: {by_species_only} of {len(rows)} records")
print("id | species | license | uncertainty_m | year | geom")
for row in rows:
    print(" | ".join("NULL" if v is None else str(v) for v in row))
