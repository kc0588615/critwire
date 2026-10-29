# q: e1-request
# status: ran
# after: py-connect
import json

BACKBONE = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"  # the GBIF Backbone Taxonomy, which critwire's ids.gbif come from
BASIS = ["HUMAN_OBSERVATION", "OBSERVATION", "MACHINE_OBSERVATION", "PRESERVED_SPECIMEN",
         "MATERIAL_SAMPLE", "MATERIAL_CITATION", "OCCURRENCE"]


def build_request(taxon_keys, user):
    """The download request: open records with coordinates, no geospatial issue, present, no living or fossil specimens."""
    return {
        "creator": user,
        "sendNotification": False,
        "format": "SIMPLE_CSV",
        "checklistKey": BACKBONE,
        "predicate": {
            "type": "and",
            "predicates": [
                {"type": "in", "key": "TAXON_KEY", "values": [str(k) for k in taxon_keys], "checklistKey": BACKBONE},
                {"type": "in", "key": "LICENSE", "values": ["CC0_1_0", "CC_BY_4_0"]},
                {"type": "equals", "key": "HAS_COORDINATE", "value": "true"},
                {"type": "equals", "key": "HAS_GEOSPATIAL_ISSUE", "value": "false"},
                {"type": "equals", "key": "OCCURRENCE_STATUS", "value": "PRESENT"},
                {"type": "in", "key": "BASIS_OF_RECORD", "values": BASIS},
            ],
        },
    }


with connect() as conn:
    keys = [k for (k,) in conn.execute("SELECT gbif_id FROM species WHERE gbif_id IS NOT NULL ORDER BY gbif_id")]
request = build_request(keys, "your-gbif-username")
taxa = request["predicate"]["predicates"][0]
print(f"taxon keys: {len(taxa['values'])}, first {taxa['values'][0]}, last {taxa['values'][-1]}")
print(f"checklistKey: request {request['checklistKey']}, TAXON_KEY {taxa['checklistKey']}")
for p in request["predicate"]["predicates"][1:]:
    print(p["key"], p["type"], p.get("values", p.get("value")))
print("bytes:", len(json.dumps(request)))
