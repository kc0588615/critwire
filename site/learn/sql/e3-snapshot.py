# q: e3-snapshot
# status: ran
# after: py-connect
import hashlib
import json

from psycopg.types.json import Jsonb

# The target's DDL by SCHEMA_VERSION: version 2 adds a CHECK on the licence.
SCHEMAS = {
    1: "CREATE TEMP TABLE devil_target (id bigint PRIMARY KEY, year integer, license text NOT NULL)",
    2: "CREATE TEMP TABLE devil_target (id bigint PRIMARY KEY, year integer, "
       "license text NOT NULL CHECK (license IN ('CC0 1.0', 'CC BY 4.0')))",
}


def md5_order(row):
    return hashlib.md5(str(row[0]).encode()).hexdigest(), row[0]


def transform_v1(rows, config):
    """The rows the config keeps: records under its licences, the first `cap` by the md5 of their id."""
    return sorted((r for r in rows if r[2] in config["licenses"]), key=md5_order)[:config["cap"]]


def transform_v2(rows, config):
    """Version 2 also drops records without a year."""
    return transform_v1([r for r in rows if r[1] is not None], config)


TRANSFORMS = {1: transform_v1, 2: transform_v2}


def snapshot(rows):
    """A delivered file: one line per record, `id,year,license`, an empty year for none."""
    return "".join(f"{i},{'' if y is None else y},{lic}\n" for i, y, lic in rows).encode()


def parse(data):
    return [(int(i), int(y) if y else None, lic) for i, y, lic in (line.split(",") for line in data.decode().splitlines())]


def job_key(parts):
    """One sha256 over the four parts, as canonical JSON (sorted keys, no spaces), so equal parts give one key."""
    return hashlib.sha256(json.dumps(parts, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def refresh(conn, data, config, transform, schema):
    """Make the target hold `data` under this transform, config and schema, unless the state says it already does.
    One transaction: the target's rows and the state row change together, or neither does."""
    parts = {"input": hashlib.sha256(data).hexdigest(), "transform": transform, "config": config, "schema": schema}
    key = job_key(parts)
    with conn.transaction(), conn.cursor() as cur:
        state = cur.execute("SELECT job_key, parts FROM job_state WHERE job = 'devil' FOR UPDATE").fetchone()
        if state is not None and state[0] == key:
            return "nothing changed: skipped"
        if state is None or state[1]["schema"] != schema:
            cur.execute("DROP TABLE IF EXISTS devil_target")
            cur.execute(SCHEMAS[schema])
        else:
            cur.execute("TRUNCATE devil_target")
        rows = TRANSFORMS[transform](parse(data), config)
        cur.executemany("INSERT INTO devil_target VALUES (%s, %s, %s)", rows)
        cur.execute("INSERT INTO job_state VALUES ('devil', %s, %s) "
                    "ON CONFLICT (job) DO UPDATE SET job_key = EXCLUDED.job_key, parts = EXCLUDED.parts",
                    (key, Jsonb(parts)))
    changed = "first load" if state is None else " and ".join(p for p in sorted(parts) if parts[p] != state[1][p]) + " changed"
    return f"{changed}: loaded {len(rows)} rows"


def ledger(conn, data, config):
    """e3-rerun's rule: the run id is the input's checksum alone, and a seen run id is skipped."""
    with conn.transaction(), conn.cursor() as cur:
        run_id = hashlib.sha256(data).hexdigest()
        if cur.execute("INSERT INTO load_runs VALUES (%s) ON CONFLICT DO NOTHING RETURNING run_id",
                       (run_id,)).fetchone() is None:
            return "run id seen before: skipped"
        rows = transform_v1(parse(data), config)
        cur.executemany("INSERT INTO ledger_target VALUES (%s, %s, %s) ON CONFLICT (id) DO UPDATE "
                        "SET year = EXCLUDED.year, license = EXCLUDED.license", rows)
        return f"loaded {len(rows)} rows"


def holds(conn, table, inputs, config, transform):
    """The input whose rows, under these settings, are exactly the table's rows."""
    rows = set(conn.execute(f"SELECT id, year, license FROM {table}").fetchall())
    return next(name for name, data in inputs.items() if rows == set(TRANSFORMS[transform](parse(data), config)))


with connect() as conn:
    conn.autocommit = True  # each `with conn.transaction()` is then one transaction of its own
    conn.execute("CREATE TEMP TABLE job_state (job text PRIMARY KEY, job_key text NOT NULL, parts jsonb NOT NULL)")
    conn.execute("CREATE TEMP TABLE load_runs (run_id text PRIMARY KEY)")
    conn.execute(SCHEMAS[1].replace("devil_target", "ledger_target"))
    try:
        rows = conn.execute("""SELECT o.id, o.year, o.license FROM occurrences AS o
                               JOIN species AS s ON s.id = o.species_id
                               WHERE s.scientific_name = 'Sarcophilus harrisii' ORDER BY o.id""").fetchall()
        fixed = min((r for r in rows if r[1] is not None), key=md5_order)  # next week the publisher corrects one year
        inputs = {"A": snapshot(rows), "B": snapshot([(i, y - 1, lic) if i == fixed[0] else (i, y, lic) for i, y, lic in rows])}
        default = {"cap": 1000, "licenses": ["CC0 1.0", "CC BY 4.0"]}
        smaller = {**default, "cap": 500}
        runs = [("A", default, 1, 1), ("A", default, 1, 1), ("B", default, 1, 1), ("A", default, 1, 1),
                ("A", smaller, 1, 1), ("A", smaller, 2, 1), ("A", smaller, 2, 2), ("A", smaller, 2, 2)]
        for n, (name, config, transform, schema) in enumerate(runs, 1):
            what = refresh(conn, inputs[name], config, transform, schema)
            settings = f"cap {config['cap']}, transform {transform}, schema {schema}"
            print(f"run {n} · {name} ({settings}) · {what}; the target holds "
                  f"{holds(conn, 'devil_target', inputs, config, transform)}")
            if n <= 4:
                what = ledger(conn, inputs[name], default)
                print(f"  ledger rule · {name} · {what}; its target holds {holds(conn, 'ledger_target', inputs, default, 1)}")
    finally:
        conn.execute("DROP TABLE IF EXISTS job_state, load_runs, ledger_target, devil_target")
