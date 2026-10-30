# q: e4-ex
# status: ran
# after: py-connect
# The row-level reject checks: each one's name, and the condition a breaking row meets.
REJECTS = [
    ("coordinates out of range", "longitude NOT BETWEEN -180 AND 180 OR latitude NOT BETWEEN -90 AND 90"),
    ("coordinates exactly 0, 0", "longitude = 0 AND latitude = 0"),
    ("coordinate uncertainty negative, NaN or infinite",
     "NOT (coordinate_uncertainty_m >= 0 AND coordinate_uncertainty_m < 'Infinity')"),
    ("year after the download (2026)", "year > 2026"),
]


def failures(cur):
    """Each reject check the staged rows break: its name, how many rows, the lowest key."""
    found = []
    for name, condition in REJECTS:
        n, first = cur.execute(f"SELECT count(*), min(id) FROM staged WHERE {condition}").fetchone()
        if n:
            found.append((name, n, first))
    return found


def report(label, cur):
    rows = cur.execute("SELECT count(*) FROM staged").fetchone()[0]
    found = failures(cur)
    print(f"{label} ({rows:,} rows): {'refused' if found else 'every reject check 0: load'}")
    for name, n, first in found:
        print(f"  {name}: {n} (first {first})")


with connect() as conn, conn.cursor() as cur:
    # CREATE TABLE AS copies no CHECK, as a staging table wouldn't have the target's
    cur.execute("""CREATE TEMP TABLE staged AS
                   SELECT o.id, o.longitude, o.latitude, o.coordinate_uncertainty_m, o.year
                   FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
                   WHERE s.scientific_name = 'Sarcophilus harrisii'""")
    report("the devil's records", cur)
    cur.execute("""INSERT INTO staged VALUES (9000000001, 0, 0, NULL, 2019),
                                             (9000000002, 146.8, -41.4, 'NaN', 2031)""")
    report("with two made-up records", cur)
    conn.rollback()
