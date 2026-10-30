# q: e5-job
# status: ran
# after: py-connect
# A simulation: both "weeks" run in this one process, on TEMP tables that vanish when it ends. A scheduler runs a job as
# a new process each time, against tables that persist; e5-refresh writes that job, and e5-runs runs it.
import hashlib
import json
import logging
import os
import sys
import urllib.request

BASE = os.environ.get("LEARN_BASE", "https://critwire.com")
FILE = "datasets.csv"
# A scheduled job writes a timestamp on every line (add %(asctime)s); this lab leaves it out so its output can be checked.
logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("refresh")


def read(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def refresh(conn):
    """One scheduled run: nothing to do if the published file is unchanged; else reload it in one transaction, checked."""
    entry = json.loads(read(f"{BASE}/learn/data/manifest.json"))["files"][FILE]
    last = conn.execute("SELECT sha256 FROM refresh_state WHERE file = %s", (FILE,)).fetchone()
    if last is not None and last[0] == entry["sha256"]:
        log.info("%s unchanged (sha256 %s): nothing to do", FILE, entry["sha256"][:12])
        return
    data = read(f"{BASE}/learn/data/{FILE}")
    if hashlib.sha256(data).hexdigest() != entry["sha256"]:
        raise RuntimeError(f"{FILE} doesn't match its manifest")
    with conn.transaction():  # a failed check below leaves the previous copy and state as they were
        conn.execute("TRUNCATE my_datasets")
        with conn.cursor().copy("COPY my_datasets FROM STDIN (FORMAT csv, HEADER true)") as copy:
            copy.write(data)
        rows = conn.execute("SELECT count(*) FROM my_datasets").fetchone()[0]
        if rows != entry["rows"]:
            raise RuntimeError(f"loaded {rows} rows of {FILE}; the manifest says {entry['rows']}")
        conn.execute("INSERT INTO refresh_state VALUES (%s, %s) ON CONFLICT (file) DO UPDATE SET sha256 = EXCLUDED.sha256",
                     (FILE, entry["sha256"]))
    log.info("%s loaded: %d rows, sha256 %s", FILE, rows, entry["sha256"][:12])


def main():
    """Exit 0 on success, 1 on any failure, with the traceback in the output. The scheduler sees only the exit code:
    systemd marks the unit failed; cron mails the output only if the crontab line doesn't redirect it to a file."""
    try:
        with connect() as conn:
            # TEMP tables: the simulation leaves learn_curriculum as it was; a real job's tables live in its own schema.
            conn.execute("CREATE TEMP TABLE my_datasets (LIKE datasets)")
            conn.execute("CREATE TEMP TABLE refresh_state (file text PRIMARY KEY, sha256 text NOT NULL)")
            for run in (1, 2):  # this week's run, then next week's with nothing new
                log.info("run %d", run)
                refresh(conn)
    except Exception:
        log.exception("refresh failed")
        return 1
    return 0


# A scheduled script ends with `raise SystemExit(main())`; here the lab goes on, so only a failure stops it.
exit_code = main()
if exit_code:
    raise SystemExit(exit_code)
