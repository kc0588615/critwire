// q: c1-report
// status: untested: Power BI is Windows-only
// input: labs/c1-feed.json
let
    Source = Json.Document(Web.Contents("https://critwire.com", [RelativePath = "learn/labs/c1-feed.json"]), 65001),
    Cells = Table.FromRecords(Source[cells], {"id", "lon", "lat", "records", "weight", "recording_hot_spot"}, MissingField.Error),
    Typed = Table.TransformColumnTypes(Cells, {
        {"id", Int64.Type}, {"lon", type number}, {"lat", type number},
        {"records", Int64.Type}, {"weight", type number}, {"recording_hot_spot", type logical}
    }),
    Species = Table.AddColumn(Typed, "species", each Source[species][common_name], type text),
    Kind = Table.AddColumn(Species, "kind", each if [recording_hot_spot] then "recording hot spot" else "other recorded cell", type text)
in
    Kind
