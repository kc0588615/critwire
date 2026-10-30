# q: e1-decide
# status: ran
from datetime import datetime, timedelta

SKEW = timedelta(minutes=5)  # a download listed a little before the intent may still be its POST's: clocks differ


def same(a, b):
    """The same download request: what GBIF runs, not who asked."""
    return all(a.get(k) == b.get(k) for k in ("format", "checklistKey", "predicate"))


def decide(intent, request, listing=None):
    """Which download this run uses, before any POST. intent: what the last run saved just before its POST
    ({"request", "started", "key"}), or None. listing: the user's downloads, once asked for. Returns ("post",),
    ("resume", key), ("list",) (list the downloads, then decide again), ("adopt", key) or ("refuse", why)."""
    if intent is None:
        return ("post",)
    if not same(intent["request"], request):
        return ("refuse", "the intent is for another request: finish its download or delete the intent first")
    if intent["key"] is not None:
        return ("resume", intent["key"])
    if listing is None:
        return ("list",)
    since = datetime.fromisoformat(intent["started"]) - SKEW
    keys = [d["key"] for d in listing
            if datetime.fromisoformat(d["created"]) >= since and same(d["request"], intent["request"])]
    if len(keys) == 1:
        return ("adopt", keys[0])
    if keys:
        return ("refuse", f"{len(keys)} downloads match the POST: a person picks one")
    return ("refuse", "the POST may have made a download GBIF doesn't list yet: run again later")


# Six made-up situations; "devil" stands in for e1-request's request, "other" for a changed one.
devil = {"format": "SIMPLE_CSV", "checklistKey": "d7dddbf4", "predicate": {"type": "equals", "key": "TAXON_KEY", "value": "2435451"}}
other = {**devil, "predicate": {"type": "equals", "key": "TAXON_KEY", "value": "2440897"}}
unsaved = {"request": devil, "started": "2026-10-23T09:00:00+00:00", "key": None}  # POSTed; the key never saved
cases = {
    "first run": (None, None),
    "key saved": ({**unsaved, "key": "0041824-260928105237408"}, None),
    "key lost, GBIF lists one": (unsaved, [
        {"key": "0041819-260928105237408", "created": "2026-10-23T08:40:00+00:00", "request": devil},  # older: not ours
        {"key": "0041824-260928105237408", "created": "2026-10-23T09:00:02+00:00", "request": devil},
        {"key": "0041830-260928105237408", "created": "2026-10-23T09:03:00+00:00", "request": other},  # another request
    ]),
    "key lost, GBIF lists none": (unsaved, []),
    "key lost, GBIF lists two": (unsaved, [
        {"key": "0041824-260928105237408", "created": "2026-10-23T09:00:02+00:00", "request": devil},
        {"key": "0041825-260928105237408", "created": "2026-10-23T09:00:05+00:00", "request": devil},
    ]),
    "request changed": (unsaved, None),
}
for name, (intent, listing) in cases.items():
    request = other if name == "request changed" else devil
    step = decide(intent, request)
    steps = [step]
    if step == ("list",):
        steps.append(decide(intent, request, listing))
    print(f"{name}: " + ", then ".join(": ".join(s) for s in steps))
