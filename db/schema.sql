-- critwire tables. Rebuilt from data/ on every load (scripts/db.ts).
drop table if exists species;

create table species (
  id int primary key,
  slug text unique not null,
  scientific_name text not null,
  common_name text not null,
  class text not null,
  order_name text not null,
  family text not null,
  genus text not null,
  iucn_id int,
  gbif_id bigint,
  col_id text,
  wikidata_id text,
  inaturalist_id int,
  ncbi_id int,
  countries_with_open_records text[] check (cardinality(countries_with_open_records) > 0), -- null unless range_status = 'ok'
  range_status text not null check (range_status in ('ok', 'no-open-records', 'identity-unsettled')
    and (range_status = 'ok') = (countries_with_open_records is not null)),
  photo_url text,
  photo_credit text,
  photo_license text,
  photo_page text,
  sources jsonb not null,
  replaced_by int[]
);
