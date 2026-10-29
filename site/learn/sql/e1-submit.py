# q: e1-submit
# status: untested: makes a real GBIF download with your account; the course's sample was made with the same steps
# after: py-connect, e1-request, e1-fetch, e1-decide
import base64
from datetime import timezone

API = "https://api.gbif.org/v1"
USER, PASSWORD = os.environ["GBIF_USERNAME"], os.environ["GBIF_PASSWORD"]  # from the environment, never in the code
AUTH = "Basic " + base64.b64encode(f"{USER}:{PASSWORD}".encode()).decode()
INTENT = "download-intent.json"  # what this run asked for, saved before its POST
DEADLINE_S = 6 * 3600  # stop asking after 6 hours; a run started later resumes the same download
_last = 0.0


def call(method, url, body=None, auth=False):
    """One request, at most 2 a second. A GET retries what is transient, as fetch_file does; a POST never retries,
    because a second POST is a second download."""
    global _last
    headers = {"Accept": "application/json, text/plain"}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if auth:
        headers["Authorization"] = AUTH
    retries = len(WAITS) if method == "GET" else 0
    for attempt in range(retries + 1):
        time.sleep(max(0.0, _last + 0.5 - time.monotonic()))
        _last = time.monotonic()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data, headers, method=method), timeout=60) as r:
                return r.read()
        except Exception as e:
            if not transient(e) or attempt == retries:
                raise
            time.sleep(wait_for(e, attempt))


def save(intent):
    """Write the intent whole: a .part first, then the rename, so a killed run never leaves half a file."""
    with open(INTENT + ".part", "w") as f:
        json.dump(intent, f)
    os.replace(INTENT + ".part", INTENT)


request = build_request(keys, USER)
intent = None
if os.path.exists(INTENT):
    with open(INTENT) as f:
        intent = json.load(f)
step = decide(intent, request)
if step == ("list",):  # a run POSTed and stopped before saving the key: find its download, never POST again
    listed = json.loads(call("GET", f"{API}/occurrence/download/user/{USER}?limit=50", auth=True))["results"]
    step = decide(intent, request, [{"key": d["key"], "created": d["created"], "request": d["request"]} for d in listed])
if step[0] == "refuse":
    raise SystemExit(f"{INTENT}: {step[1]}")
if step == ("post",):
    intent = {"request": request, "started": datetime.now(timezone.utc).isoformat(), "key": None}
    save(intent)  # before the POST: a run killed during it leaves the trace the next run reconciles
    try:
        key = call("POST", f"{API}/occurrence/download/request", request, auth=True).decode()
    except urllib.error.HTTPError as e:
        if e.code < 500:  # GBIF answered no (a bad request, a wrong password, too many downloads): nothing was made
            os.remove(INTENT)
        raise  # a 5xx or a dropped connection may have made one: the intent stays, and the next run lists
    save({**intent, "key": key})
else:
    key = step[1]
print("download key:", key)

deadline = time.monotonic() + DEADLINE_S
while True:  # a job, not a response: ask at most once a minute, and not forever
    meta = json.loads(call("GET", f"{API}/occurrence/download/{key}"))
    if meta["status"] == "SUCCEEDED":
        break
    if meta["status"] in ("KILLED", "FAILED", "CANCELLED"):
        raise SystemExit(f"download {key} ended {meta['status']}; delete {INTENT} to ask again")
    if time.monotonic() > deadline:
        raise SystemExit(f"download {key} is still {meta['status']} after {DEADLINE_S // 3600} h; "
                         f"run again later: {INTENT} resumes it")
    time.sleep(60)
stored = meta["request"]
if stored["checklistKey"] != BACKBONE or stored["predicate"]["predicates"][0]["checklistKey"] != BACKBONE:
    raise SystemExit("GBIF didn't keep the pinned taxonomy")  # the echo check: what ran is what was asked
print("DOI:", meta["doi"], "records:", meta["totalRecords"], "bytes:", meta["size"])

got, digest = fetch_file(meta["downloadLink"], f"{key}.zip", size=meta["size"])
print("zip sha256:", digest)  # keep it with the DOI: it is how a later run knows it has the same file
