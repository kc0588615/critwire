// q: p1-ex
// status: untested: Power BI is Windows-only
// input: star/dim_habitat_class.csv, star/fact_country_habitat.csv
let
    Classes = LoadStar("dim_habitat_class", {{"habitat_code", Int64.Type}, {"name", type text}, {"level1_code", Int64.Type}, {"level1_name", type text}}),
    Areas = LoadStar("fact_country_habitat", {{"country_code", type text}, {"habitat_code", Int64.Type}, {"est_area_km2", Currency.Type}}),
    Check = #table({"check", "value"}, {
        {"dim_habitat_class rows", Table.RowCount(Classes)},
        {"fact_country_habitat rows", Table.RowCount(Areas)},
        {"area rows with an empty key", Table.RowCount(Table.SelectRows(Areas, each [country_code] = null or [country_code] = "" or [habitat_code] = null))},
        {"area rows with no class", Table.RowCount(Table.NestedJoin(Areas, {"habitat_code"}, Classes, {"habitat_code"}, "class", JoinKind.LeftAnti))},
        {"total km2", List.Sum(Areas[est_area_km2])},
        {"Namibia (NA) km2", List.Sum(Table.SelectRows(Areas, each [country_code] = "NA")[est_area_km2])}
    })
in
    Check
