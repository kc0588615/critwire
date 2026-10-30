# q: e5-ex
# status: ran
# after: py-connect, e5-refresh
import os
import subprocess
import sys
import tempfile
from pathlib import Path

SCHEMA = "learn_e5ex"
JOB = Path("refresh.py").read_text(encoding="utf-8")


def edit(text, old, new):
    """`text` with its one `old` replaced by `new`: an edit that finds nothing to change fails, it doesn't pass silently."""
    if text.count(old) != 1:
        raise ValueError(f"expected one {old!r} in refresh.py")
    return text.replace(old, new)


# The new transform: each DOI stored as a link, https://doi.org/<doi>. Same input, same config, a different output.
LINKS = edit(JOB, "SELECT * FROM pg_temp.stage WHERE",
             "SELECT dataset_key, title, publisher, 'https://doi.org/' || doi, license FROM pg_temp.stage WHERE")


def run(conn, n, label, script):
    """`script` as a new process, with this block's environment, then the target's DOIs that are links."""
    done = subprocess.run([sys.executable, "-I", str(script)], env={**os.environ, "REFRESH_SCHEMA": SCHEMA},
                          text=True, capture_output=True, timeout=120)
    links = conn.execute(f"SELECT count(*) FROM {SCHEMA}.datasets WHERE starts_with(doi, 'https://doi.org/')").fetchone()[0]
    print(f"run {n} · {label} · exit {done.returncode} · {done.stdout.strip()} · {links} DOIs as links")


with connect() as conn, tempfile.TemporaryDirectory() as tmp:
    conn.autocommit = True  # each statement commits, so the job's own sessions see the tables
    unbumped, bumped = Path(tmp) / "refresh_links.py", Path(tmp) / "refresh_v2.py"
    unbumped.write_text(LINKS, encoding="utf-8")
    bumped.write_text(edit(LINKS, "TRANSFORM_VERSION = 1", "TRANSFORM_VERSION = 2"), encoding="utf-8")
    conn.execute(f"CREATE SCHEMA {SCHEMA}")
    try:
        conn.execute(f"CREATE TABLE {SCHEMA}.datasets (dataset_key uuid PRIMARY KEY, title text NOT NULL, "
                     "publisher text NOT NULL, doi text, license text NOT NULL)")
        conn.execute(f"CREATE TABLE {SCHEMA}.refresh_state (job text PRIMARY KEY, job_key text NOT NULL, parts jsonb NOT NULL)")
        run(conn, 1, "the old job", "refresh.py")
        run(conn, 2, "links, TRANSFORM_VERSION still 1", unbumped)
        run(conn, 3, "links, TRANSFORM_VERSION = 2", bumped)
        run(conn, 4, "links, TRANSFORM_VERSION = 2 again", bumped)
    finally:
        conn.execute(f"DROP SCHEMA {SCHEMA} CASCADE")
