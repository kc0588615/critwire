# q: e2-geopandas
# status: ran
# after: py-connect
import geopandas as gpd
from sqlalchemy import create_engine, text

# SQLAlchemy on py-connect's connection: the same database, role and search path.
engine = create_engine("postgresql+psycopg://", creator=connect)

with engine.connect() as conn:
    devils = gpd.read_postgis(
        text("SELECT o.id, o.year, o.geom FROM learn_curriculum.occurrences AS o "
             "JOIN learn_curriculum.species AS s ON s.id = o.species_id "
             "WHERE s.scientific_name = 'Sarcophilus harrisii' ORDER BY o.id"),
        conn, geom_col="geom")
    print(f"read: {len(devils)} rows, CRS {devils.crs.to_string()}, geometry {devils.geom_type.iloc[0]}")

    metres = devils.to_crs(3577)  # GDA94 / Australian Albers, an equal-area projection in metres
    metres["geom"] = metres.buffer(1000)  # a 1 km circle around each record
    # The schema named, not left to the search path; the write stays in this connection's transaction.
    metres.to_postgis("devil_buffers", conn, schema="learn_curriculum", if_exists="fail", index=False)
    n, srid, kind, km2 = conn.execute(text(
        "SELECT count(*), min(ST_SRID(geom)), min(GeometryType(geom)), round(sum(ST_Area(geom))::numeric / 1e6, 1) "
        "FROM learn_curriculum.devil_buffers")).one()
    print(f"written: {n} rows, SRID {srid}, {kind}, {km2} km² in all")
    schema = conn.execute(text(
        "SELECT relnamespace::regnamespace::text FROM pg_class "
        "WHERE oid = to_regclass('learn_curriculum.devil_buffers')")).scalar_one()
    assert schema == "learn_curriculum", f"devil_buffers was written to {schema}"
    print(f"devil_buffers is in schema {schema}, until the rollback")
    conn.rollback()  # the lab leaves learn_curriculum as it found it
    left = conn.execute(text("SELECT to_regclass('learn_curriculum.devil_buffers')")).scalar_one()
    print(f"after the rollback: {left or 'no table'}")
