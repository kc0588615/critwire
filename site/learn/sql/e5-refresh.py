# q: e5-refresh
# status: ran
from pathlib import Path

JOB = r'''"""refresh.py: makes <REFRESH_SCHEMA>.datasets hold the published datasets.csv, under this code and config.
Exit 0: loaded, or nothing to do. Exit 1: failed, and nothing changed. The reason goes to stdout, the traceback to stderr."""
import hashlib
import json
import logging
import os
import sys
import traceback
import urllib.request
from pathlib import Path

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb

FILE = "datasets.csv"
TRANSFORM_VERSION = 1  # bump when this code's output changes
SCHEMA_VERSION = 1  # bump when the target's DDL changes
SETTINGS = ("PGHOST", "PGPORT", "PGUSER", "PGDATABASE")

# A scheduled job writes a timestamp on every line (add %(asctime)s); this lab leaves it out so its output can be checked.
logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("refresh")


def missing_settings():
    """The connection settings this environment lacks, by name: no value, the password least of all, reaches the log."""
    missing = [name for name in SETTINGS if not os.environ.get(name)]
    default = (Path(os.environ.get("APPDATA", "")) / "postgresql" / "pgpass.conf" if os.name == "nt"
               else Path.home() / ".pgpass")
    if not os.environ.get("PGPASSWORD") and not Path(os.environ.get("PGPASSFILE", default)).is_file():
        missing.append("PGPASSWORD or a password file")
    return missing


def read(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def job_key(parts):
    """One sha256 over the four parts, as canonical JSON (sorted keys, no spaces), so equal parts give one key (e3)."""
    return hashlib.sha256(json.dumps(parts, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def refresh(conn, base, schema, licenses):
    """One run in one transaction: the lock, the comparison, the replacement and the new state commit together, or
    nothing does. Returns the log line."""
    entry = json.loads(read(f"{base}/learn/data/manifest.json"))["files"][FILE]
    parts = {"input": entry["sha256"], "transform": TRANSFORM_VERSION,
             "config": {"file": FILE, "licenses": licenses}, "schema": SCHEMA_VERSION}
    key = job_key(parts)
    target, state = sql.Identifier(schema, "datasets"), sql.Identifier(schema, "refresh_state")
    with conn.transaction():
        # The transaction's own lock: COMMIT or ROLLBACK frees it, however the job ends. Held means another run is at work.
        if not conn.execute("SELECT pg_try_advisory_xact_lock(hashtext(%s))", (f"refresh:{schema}",)).fetchone()[0]:
            return "another refresh holds the lock: skipped"
        last = conn.execute(sql.SQL("SELECT job_key, parts FROM {} WHERE job = %s").format(state), (FILE,)).fetchone()
        if last is not None and last[0] == key:
            return "nothing changed: skipped"
        data = read(f"{base}/learn/data/{FILE}")
        if hashlib.sha256(data).hexdigest() != entry["sha256"]:
            raise RuntimeError(f"{FILE} doesn't match its manifest's sha256")
        conn.execute(sql.SQL("CREATE TEMP TABLE stage (LIKE {}) ON COMMIT DROP").format(target))
        with conn.cursor().copy("COPY pg_temp.stage FROM STDIN (FORMAT csv, HEADER true)") as copy:
            copy.write(data)
        staged = conn.execute("SELECT count(*) FROM pg_temp.stage").fetchone()[0]
        if staged != entry["rows"]:
            raise RuntimeError(f"staged {staged} rows; the manifest says {entry['rows']}")
        conn.execute(sql.SQL("TRUNCATE {}").format(target))
        loaded = conn.execute(sql.SQL("INSERT INTO {} SELECT * FROM pg_temp.stage WHERE license = ANY(%s)").format(target),
                              (licenses,)).rowcount
        conn.execute(sql.SQL("INSERT INTO {} VALUES (%s, %s, %s) ON CONFLICT (job) DO UPDATE "
                             "SET job_key = EXCLUDED.job_key, parts = EXCLUDED.parts").format(state),
                     (FILE, key, Jsonb(parts)))
    if last is None:
        return f"first load: loaded {loaded} rows"
    changed = " and ".join(p for p in sorted(parts) if parts[p] != last[1].get(p))
    return f"{changed} changed: loaded {loaded} rows"


def main():
    missing = missing_settings()
    if missing:
        log.error("failed: not set in this environment: %s", ", ".join(missing))
        return 1
    base = os.environ.get("LEARN_BASE", "https://critwire.com")
    schema = os.environ.get("REFRESH_SCHEMA", "etl")
    licenses = sorted(name.strip() for name in os.environ.get("REFRESH_LICENSES", "CC0 1.0,CC BY 4.0").split(","))
    try:
        with psycopg.connect(autocommit=True) as conn:  # autocommit: conn.transaction() is then the one transaction
            log.info(refresh(conn, base, schema, licenses))
    except Exception as e:
        log.error("failed: %s", e)
        traceback.print_exc()
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''

Path("refresh.py").write_text(JOB, encoding="utf-8")
