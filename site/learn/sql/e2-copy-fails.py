# q: e2-copy-fails
# status: ran
# after: py-connect, e2-file
import re

import psycopg

# Three ways a delivered file breaks COPY itself, before any type is involved: each damages one record of GBIF_FILE.
BROKEN = [
    ("a tab inside a field", GBIF_FILE.replace(b"Sirena station", b"Sirena\tstation")),
    ("a NUL byte", GBIF_FILE.replace(b"Pafuri", b"Paf\x00uri")),
    ("Latin-1, not UTF-8", GBIF_FILE.replace('A. "Sam" Lee'.encode(), 'A. "Sam" Lée'.encode("latin-1"))),
]

with connect() as conn, conn.cursor() as cur:
    cur.execute(CREATE_STAGING)
    print("file | SQLSTATE | line | error")
    for name, data in BROKEN:
        try:
            with conn.transaction():  # a savepoint: the failed COPY is undone, the table stays
                with cur.copy(COPY_STAGING) as copy:
                    copy.write(data)
        except psycopg.Error as error:
            line = re.search(r"\bline (\d+)", error.diag.context or "")  # COPY's context names the file's line
            print(f"{name} | {error.sqlstate} | {line[1] if line else '?'} | {error.diag.message_primary}")
        else:
            raise SystemExit(f"{name}: COPY accepted it")
    failed = cur.execute("SELECT count(*) FROM gbif_staging").fetchone()[0]
    with cur.copy(COPY_STAGING) as copy:
        copy.write(GBIF_FILE)
    delivered = cur.execute("SELECT count(*) FROM gbif_staging").fetchone()[0]
    conn.rollback()

print(f"rows staged: {failed} after the three failed COPYs, {delivered} from the file as delivered")
