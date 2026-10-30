# q: e5-runs
# status: ran
# after: py-connect, e5-refresh
import csv
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

BASE = os.environ.get("LEARN_BASE", "https://critwire.com")
SCHEMA = "learn_e5"
LICENSES = {"CC0 1.0", "CC BY 4.0"}  # refresh.py's default config


def rows_of(data):
    return [tuple(r) for r in csv.reader(io.StringIO(data.decode("utf-8"), newline=""))][1:]


def csv_file(header, rows):
    out = io.StringIO()
    csv.writer(out, lineterminator="\n").writerows([header, *rows])
    return out.getvalue().encode("utf-8")


def publish(folder, data, rows):
    """A copy of /learn/data/ on this machine holding `data`, its manifest saying `rows` rows; returns its LEARN_BASE."""
    d = Path(folder) / "learn" / "data"
    d.mkdir(parents=True)
    (d / "datasets.csv").write_bytes(data)
    entry = {"sha256": hashlib.sha256(data).hexdigest(), "rows": rows}
    (d / "manifest.json").write_text(json.dumps({"files": {"datasets.csv": entry}}), encoding="utf-8")
    return Path(folder).as_uri()


def start(base=None, licenses=None, without=None):
    """refresh.py as a new process, with this block's environment and these changes."""
    env = {k: v for k, v in os.environ.items() if k != without}
    env["REFRESH_SCHEMA"] = SCHEMA
    if base:
        env["LEARN_BASE"] = base
    if licenses:
        env["REFRESH_LICENSES"] = licenses
    return subprocess.Popen([sys.executable, "-I", "refresh.py"], env=env, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def finish(proc):
    out, err = proc.communicate(timeout=120)
    return proc.returncode, out.strip(), " · traceback on stderr" if "Traceback" in err else ""


def show(n, label, proc):
    code, out, err = finish(proc)
    print(f"run {n} · {label} · exit {code} · {out}{err}")


def holds(conn, inputs):
    """Which input the target's rows and the state's key come from: read, not assumed."""
    rows = set(conn.execute(f"SELECT CAST(dataset_key AS text), title, publisher, coalesce(doi, ''), license "
                            f"FROM {SCHEMA}.datasets").fetchall())
    target = next((n for n, data in inputs.items() if rows == {r for r in rows_of(data) if r[4] in LICENSES}), "no input")
    sha = conn.execute(f"SELECT parts->>'input' FROM {SCHEMA}.refresh_state WHERE job = 'datasets.csv'").fetchone()[0]
    state = next((n for n, data in inputs.items() if hashlib.sha256(data).hexdigest() == sha), "no input")
    print(f"  the target holds {target}; the state's input is {state}")


with connect() as conn, tempfile.TemporaryDirectory() as tmp:
    conn.autocommit = True  # each statement commits, so the job's own sessions see the tables
    conn.execute(f"CREATE SCHEMA {SCHEMA}")
    try:
        conn.execute(f"CREATE TABLE {SCHEMA}.datasets (dataset_key uuid PRIMARY KEY, title text NOT NULL, "
                     "publisher text NOT NULL, doi text, license text NOT NULL)")
        conn.execute(f"CREATE TABLE {SCHEMA}.refresh_state (job text PRIMARY KEY, job_key text NOT NULL, parts jsonb NOT NULL)")
        with urllib.request.urlopen(f"{BASE}/learn/data/datasets.csv", timeout=60) as r:
            a = r.read()
        header, *rows = csv.reader(io.StringIO(a.decode("utf-8"), newline=""))
        b_rows = [[*rows[0][:1], rows[0][1] + " (corrected)", *rows[0][2:]], *rows[1:]]
        made_up = ["00000000-0000-4000-8000-000000000001", "A made-up dataset", "Nobody", "", "CC0 1.0"]
        inputs = {"A": a, "B": csv_file(header, b_rows), "C": csv_file(header, [*b_rows, made_up])}
        b_base = publish(Path(tmp) / "b", inputs["B"], len(b_rows))
        c_base = publish(Path(tmp) / "c", inputs["C"], len(b_rows))  # one row more than its manifest says

        show(1, "A", start())
        show(2, "A again", start())
        show(3, "A, REFRESH_LICENSES=CC0 1.0", start(licenses="CC0 1.0"))
        show(4, "B, one title corrected", start(base=b_base))
        show(5, "C, one row added, its manifest still says 400 rows", start(base=c_base))
        holds(conn, inputs)
        lock = f"refresh:{SCHEMA}"
        conn.execute("SELECT pg_advisory_lock(hashtext(%s))", (lock,))  # as a run that is still going holds it
        try:
            show(6, "A, the lock held by another session", start())
        finally:
            conn.execute("SELECT pg_advisory_unlock(hashtext(%s))", (lock,))
        holds(conn, inputs)
        both = [finish(p) for p in [start(), start()]]
        # Which one wins, and whether the other meets the lock or the new state, varies from run to run.
        outcomes = sorted("loaded" if ": loaded " in out else "not loaded" for _, out, _ in both)
        print(f"run 7 · A, two runs started together · exit {' and '.join(str(c) for c, _, _ in both)} · {', '.join(outcomes)}")
        holds(conn, inputs)
        show(8, "A, without PGDATABASE", start(without="PGDATABASE"))
    finally:
        conn.execute(f"DROP SCHEMA {SCHEMA} CASCADE")
