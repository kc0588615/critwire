# q: e1-checksum
# status: ran
# after: e1-fetch
import json
import os

BASE = os.environ.get("LEARN_BASE", "https://critwire.com")

fetch_file(f"{BASE}/learn/data/manifest.json", "manifest.json")
with open("manifest.json") as f:
    manifest = json.load(f)
for name in ["occurrences.parquet", "datasets.csv"]:
    expected = manifest["files"][name]
    got, digest = fetch_file(f"{BASE}/learn/data/{name}", name, expected["bytes"], expected["sha256"])
    print(f"{name}: {got} bytes, sha256 {digest[:12]} = manifest, {expected['rows']} rows")
