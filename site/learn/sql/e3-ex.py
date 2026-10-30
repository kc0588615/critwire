# q: e3-ex
# status: ran
# after: py-connect
import hashlib

EXPORTS = {
    "without ORDER BY": "SELECT id, year, license FROM devil",
    "ORDER BY id": "SELECT id, year, license FROM devil ORDER BY id",
}


def export(cur, query):
    """The query's rows as a CSV file's bytes, and their sha256."""
    with cur.copy(f"COPY ({query}) TO STDOUT (FORMAT csv, HEADER true)") as copy:
        return hashlib.sha256(b"".join(copy)).hexdigest()


with connect() as conn, conn.cursor() as cur:
    cur.execute("""CREATE TEMP TABLE devil AS
                   SELECT o.id, o.year, o.license FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
                   WHERE s.scientific_name = 'Sarcophilus harrisii' ORDER BY o.id""")
    before = {name: export(cur, query) for name, query in EXPORTS.items()}
    cur.execute("UPDATE devil SET year = year WHERE id = (SELECT min(id) FROM devil)")  # changes no value
    for name, query in EXPORTS.items():
        after = export(cur, query)
        print(f"{name}: sha256 {before[name][:12]} then {after[:12]}: {'same file' if after == before[name] else 'a different file'}")
    conn.rollback()
