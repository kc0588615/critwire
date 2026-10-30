# q: e3-rerun
# status: ran
# after: py-connect
import hashlib

SETUP = """
CREATE TEMP TABLE devil_records (id bigint PRIMARY KEY, year integer, longitude float8, latitude float8);
CREATE TEMP TABLE devil_records_naive (id bigint, year integer, longitude float8, latitude float8);
CREATE TEMP TABLE load_runs (run_id text PRIMARY KEY, input_rows integer NOT NULL)
"""


def checksum(cur, table):
    """md5 of every row in key order: two loads that leave the same rows give the same value."""
    return cur.execute(f"SELECT count(*), md5(coalesce(string_agg(t::text, E'\\n' ORDER BY t::text), '')) "
                       f"FROM {table} AS t").fetchone()


def load(cur, batch):
    """Idempotent: the run id is the input's sha256, so the same input is loaded once; rows upsert by key."""
    run_id = hashlib.sha256("\n".join(",".join(map(str, r)) for r in batch).encode()).hexdigest()
    if cur.execute("INSERT INTO load_runs VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING run_id",
                   (run_id, len(batch))).fetchone() is None:
        return run_id, "already loaded: skipped"
    cur.executemany("INSERT INTO devil_records VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO UPDATE "
                    "SET year = EXCLUDED.year, longitude = EXCLUDED.longitude, latitude = EXCLUDED.latitude", batch)
    return run_id, f"loaded {len(batch)} rows"


with connect() as conn, conn.cursor() as cur:
    cur.execute(SETUP)
    batch = cur.execute("""SELECT o.id, o.year, o.longitude, o.latitude FROM occurrences AS o
                           JOIN species AS s ON s.id = o.species_id
                           WHERE s.scientific_name = 'Sarcophilus harrisii' ORDER BY o.id""").fetchall()
    for run in (1, 2):
        cur.executemany("INSERT INTO devil_records_naive VALUES (%s, %s, %s, %s)", batch)
        rows, md5 = checksum(cur, "devil_records_naive")
        print(f"append, run {run}: {rows} rows, md5 {md5[:12]}")
    for run in (1, 2):
        run_id, what = load(cur, batch)
        rows, md5 = checksum(cur, "devil_records")
        print(f"idempotent, run {run}: run {run_id[:12]}, {what}; {rows} rows, md5 {md5[:12]}")
    corrected = [(batch[0][0], 1999, *batch[0][2:]), *batch[1:]]  # next week the publisher adds one missing year
    run_id, what = load(cur, corrected)
    rows, md5 = checksum(cur, "devil_records")
    print(f"idempotent, run 3 (one year added): run {run_id[:12]}, {what}; {rows} rows, md5 {md5[:12]}")
    conn.rollback()
