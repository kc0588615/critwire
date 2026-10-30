// q: p1-fact-records
// status: untested: Power BI is Windows-only
// input: star/fact_records.csv
LoadStar("fact_records", {
    {"record_id", Int64.Type}, {"species_id", Int64.Type}, {"country_code", type text},
    {"dataset_key", type text}, {"year", Int64.Type}, {"month", Int64.Type},
    {"basis_of_record", type text}, {"license", type text}, {"longitude", type number},
    {"latitude", type number}, {"coordinate_uncertainty_m", type number}
})
