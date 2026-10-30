// q: p1-load
// status: untested: Power BI is Windows-only
// input: star/dim_species.csv, star/dim_country.csv, star/dim_dataset.csv, star/dim_year.csv, star/fact_records.csv, star/fact_species_country.csv, star/dim_habitat_class.csv, star/fact_country_habitat.csv
(file as text, types as list) as table =>
let
    Source = Web.Contents("https://critwire.com", [RelativePath = "learn/data/star/" & file & ".csv"]),
    Rows = Csv.Document(Source, [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
    Promoted = Table.PromoteHeaders(Rows, [PromoteAllScalars = true]),
    Typed = Table.TransformColumnTypes(Promoted, types, "en-US")
in
    Typed
