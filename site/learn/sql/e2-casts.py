# q: e2-casts
# status: ran
# after: py-connect, e2-file
import psycopg

# The type each staged column gets in e2-typed's INSERT_TYPED.
CASTS = {"gbifID": "bigint", "datasetKey": "uuid", "decimalLatitude": "float8", "decimalLongitude": "float8",
         "coordinateUncertaintyInMeters": "float8", "year": "integer", "month": "integer", "taxonKey": "bigint",
         "speciesKey": "bigint"}
# Every staged value its cast would refuse, with its record's key and its column: what a failed cast doesn't say.
BAD_VALUES = " UNION ALL ".join(
    f"""SELECT "gbifID", '{column}', "{column}", '{type_}' FROM gbif_staging
        WHERE NOT pg_input_is_valid("{column}", '{type_}')""" for column, type_ in CASTS.items()) + " ORDER BY 1, 2"

rows = [row.copy() for row in ROWS]
rows[0][HEADER.index("coordinateUncertaintyInMeters")] = "30 m"
rows[1][HEADER.index("decimalLatitude")] = "-22,4310"

with connect() as conn, conn.cursor() as cur:
    stage(cur, gbif_file(rows))  # staging takes both: every column is text
    try:
        with conn.transaction():
            cur.execute('SELECT "decimalLatitude"::float8, "coordinateUncertaintyInMeters"::float8 FROM gbif_staging')
    except psycopg.Error as error:
        print(f"the cast alone: {error.sqlstate} {error.diag.message_primary}")
    bad = cur.execute(BAD_VALUES).fetchall()  # run this before INSERT_TYPED; refuse the load if it returns a row
    conn.rollback()

print("gbifID | column | value | type")
for row in bad:
    print(" | ".join(row))
print(f"load refused before INSERT_TYPED: {len(bad)} values in {len({row[0] for row in bad})} of {len(rows)} records")
