# q: e2-file
# status: ran
HEADER = ["gbifID", "datasetKey", "species", "countryCode", "locality", "decimalLatitude", "decimalLongitude",
          "coordinateUncertaintyInMeters", "year", "month", "taxonKey", "speciesKey", "basisOfRecord", "license",
          "recordedBy"]
ROWS = [
    ["1000000001", "00000000-0000-0000-0000-000000000001", "Sarcophilus harrisii", "AU",
     r"Cradle Mountain\Dove Lake track", "-41.6512", "145.9601", "30", "2019", "3", "2435451", "2435451",
     "HUMAN_OBSERVATION", "CC_BY_4_0", 'A. "Sam" Lee'],
    ["1000000002", "00000000-0000-0000-0000-000000000001", "Smutsia temminckii", "ZA",
     r"Pafuri\north bank", "-22.4310", "31.2120", "", "2021", "", "5786560", "5219630",
     "HUMAN_OBSERVATION", "CC0_1_0", ""],
    ["1000000003", "00000000-0000-0000-0000-000000000002", "Tapirus bairdii", "CR",
     "Sirena station", "8.4800", "-83.5900", "250", "", "", "2440897", "8395500",
     "MACHINE_OBSERVATION", "CC_BY_4_0", r"\N"],
]


def gbif_file(rows):
    """Records in GBIF's SIMPLE_CSV form: a header line, tab-separated, no quoting, an empty field for "no value"."""
    return ("\n".join("\t".join(row) for row in [HEADER, *rows]) + "\n").encode()


GBIF_FILE = gbif_file(ROWS)  # three made-up records

# Every column text: the file is read exactly as delivered, and typed in SQL afterwards.
CREATE_STAGING = "CREATE TEMP TABLE gbif_staging (" + ", ".join(f'"{h}" text' for h in HEADER) + ")"
# CSV mode with a quote character that never occurs, so backslashes and double quotes stay data; '' is NULL.
COPY_STAGING = ("COPY gbif_staging FROM STDIN "
                "(FORMAT csv, DELIMITER E'\\t', QUOTE E'\\b', NULL '', HEADER true)")


def stage(cur, data, copy_sql=COPY_STAGING):
    """Load the file's bytes into gbif_staging, streamed: COPY reads what it is sent, in pieces of any size."""
    cur.execute(CREATE_STAGING)
    with cur.copy(copy_sql) as copy:
        for start in range(0, len(data), 1 << 20):
            copy.write(data[start:start + (1 << 20)])
