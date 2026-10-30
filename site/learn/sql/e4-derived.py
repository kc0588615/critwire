# q: e4-derived
# status: ran
# after: py-connect
import json

DOWNLOAD_DOI = "10.15468/dl.fbpk9w"  # the GBIF download the records came from (§4.2)

with connect() as conn:
    counts = dict(conn.execute("""
        SELECT CAST(o.dataset_key AS text), count(*)
        FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
        WHERE s.scientific_name IN ('Sarcophilus harrisii', 'Panthera onca')
        GROUP BY o.dataset_key ORDER BY o.dataset_key""").fetchall())

# The body of POST https://api.gbif.org/v1/derivedDataset: what GBIF needs to mint a DOI that credits each dataset.
body = {
    "title": "Tasmanian devil and jaguar records used in my analysis",
    "description": "A subset of GBIF download 10.15468/dl.fbpk9w: open records of two species.",
    "originalDownloadDOI": DOWNLOAD_DOI,
    "sourceUrl": "https://example.org/where-my-subset-is-published",
    "relatedDatasets": counts,
}
print(f"relatedDatasets: {len(counts)} datasets, {sum(counts.values())} records")
for key, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:3]:
    print(f"  {key}: {n}")
print(f"body: {len(json.dumps(body))} bytes, ready to POST with your GBIF account")
