# q: e2-ex
# status: ran
# after: py-connect, e2-file
# e2-typed's casts and CHECKs, per staged column: its type, and the range a typed value must fall in (None: any).
RULES = [
    ("datasetKey", "uuid", None),
    ("decimalLatitude", "float8", (-90, 90)),
    ("decimalLongitude", "float8", (-180, 180)),
    ("year", "integer", None),
    ("month", "integer", (1, 12)),
]


def problem(column, type_, bounds):
    """A value's problem, or NULL: the cast's own message, else the range it breaks. CASE tests in order,
    so a value is cast only once pg_input_is_valid has said it can be."""
    out_of_range = (f"""WHEN NOT ("{column}"::{type_} BETWEEN {bounds[0]} AND {bounds[1]})
                    THEN 'outside {bounds[0]} to {bounds[1]}'""" if bounds else "")
    return f"""SELECT "gbifID", '{column}' AS column_name, "{column}" AS value,
                      CASE WHEN NOT pg_input_is_valid("{column}", '{type_}')
                           THEN (pg_input_error_info("{column}", '{type_}')).message
                           {out_of_range} END AS problem
               FROM gbif_staging"""


PROBLEMS = ("SELECT * FROM (" + " UNION ALL ".join(problem(*rule) for rule in RULES) + ") AS p "
            "WHERE problem IS NOT NULL ORDER BY 1, 2")

rows = [row.copy() for row in ROWS]
rows[0][HEADER.index("month")] = "13"
rows[1][HEADER.index("decimalLatitude")] = "-122.4310"
rows[2][HEADER.index("datasetKey")] = "00000000-0000-0000-0000-00000000002"
rows[2][HEADER.index("year")] = "c. 2015"

with connect() as conn, conn.cursor() as cur:
    stage(cur, gbif_file(rows))
    problems = cur.execute(PROBLEMS).fetchall()
    conn.rollback()

print("gbifID | column | value | problem")
for row in problems:
    print(" | ".join(row))
print(f"load refused: {len(problems)} problems in {len({row[0] for row in problems})} of {len(rows)} records")
