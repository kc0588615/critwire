# q: e2-copy
# status: ran
# after: py-connect, e2-file
TEXT_FORMAT = "COPY gbif_staging FROM STDIN (FORMAT text, HEADER true)"  # the default format: wrong for this file


def show(value):
    """NULL, '' and a line break made visible."""
    return "NULL" if value is None else "''" if value == "" else value.replace("\n", "↵")


with connect() as conn, conn.cursor() as cur:
    read = {}
    for name, sql in [("csv form", COPY_STAGING), ("text format", TEXT_FORMAT)]:
        stage(cur, GBIF_FILE, sql)
        read[name] = cur.execute('SELECT "gbifID", locality, "recordedBy" FROM gbif_staging ORDER BY "gbifID"').fetchall()
        cur.execute("DROP TABLE gbif_staging")
    conn.rollback()

sent = {row[0]: (row[4], row[14] or None) for row in ROWS}
print("COPY | gbifID | locality | recordedBy | read")
for name, rows in read.items():
    for gbif_id, locality, recorded_by in rows:
        same = (locality, recorded_by) == sent[gbif_id]
        print(f"{name} | {gbif_id} | {show(locality)} | {show(recorded_by)} | {'as sent' if same else 'CHANGED'}")
