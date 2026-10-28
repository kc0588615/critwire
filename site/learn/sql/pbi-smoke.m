// q: pbi-smoke
// status: untested: Power BI is Windows-only
// input: star/dim_country.csv
let
    Source = Web.Contents("https://critwire.com", [RelativePath = "learn/data/star/dim_country.csv"]),
    Rows = Csv.Document(Source, [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
    Promoted = Table.PromoteHeaders(Rows, [PromoteAllScalars = true]),
    Typed = Table.TransformColumnTypes(Promoted, {{"country_code", type text}, {"name", type text}, {"continent", type text}, {"region", type text}, {"subregion", type text}}, "en-US")
in
    Typed
