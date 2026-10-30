# A 004 excerpt for scripts/learn/port.test.ts

## 0. Conventions

Prose. A fence in prose, ```` ```sql ````, isn't a block.

```sql
-- q: setup
-- status: ran
CREATE TABLE t (a int);
```

```sql
-- q: pg-session
-- status: ran
-- engine: postgis
SET search_path = learn_curriculum, public;
SHOW search_path;
```

```text
-- result: pg-session · 1 row · sha256 791623fd72db
search_path
learn_curriculum, public
```

```python
# q: py-connect
# status: ran
print("L4's")
```

```text
-- result: py-connect · python · sha256 000000000000
L4's
```

## 1. What carries over

```sql
-- q: not-a-page
-- status: ran
SELECT 1 AS a
```

## 3. Lab environments and setup

### 3.1 Browser

```sql
-- q: setup-counts
-- status: ran
SELECT 76 AS n
```

```text
-- result: setup-counts · 1 row · sha256 580de410843f
n
76
```

### 3.3 Python

```text
# a requirements file: neither a block nor a result
geopandas==1.2.0
```

```python
# q: gpkg-export
# status: ran
# after: py-connect
print("rows: 1")
```

```text
-- result: gpkg-export · python · sha256 000000000000
rows: 1
```

### 3.4 arcpy notes (ArcGIS Pro)

```python
# q: arcpy-moran
# status: untested: ArcGIS Pro (Windows, licensed)
import arcpy
```

### 3.6 Not a setup section

```sql
-- q: not-setup
-- status: ran
SELECT 1 AS a
```

### 3.5 Power BI Desktop

```m
// q: pbi-smoke
// status: untested: Power BI is Windows-only
// input: star/dim_country.csv
let
    Source = 1
in
    Source
```

## 5. Modules

### 5.1 Foundations

#### f1 · select

```sh
# q: not-a-block
echo hi
```

```sql
-- q: f1-one
-- status: ran
SELECT 1 AS a
```

```text
-- result: f1-one · 1 row · sha256 4f395a2e9ea1
a
1
```

```python
# q: f1-py
# status: ran
# after: py-connect
#### f9 · not a heading
print(1)
```

```text
-- result: f1-py · python · sha256 4355a46b19d3
1
```

```sql
-- q: f1-later
-- status: untested: shown only
SELECT 2 AS a
```

```sql
-- q: f1-dup
-- status: ran
-- expect: error Constraint Error
INSERT INTO t VALUES (1)
```

```text
-- result: f1-dup · error: statement 1 of 1: Constraint Error: Duplicate key "a: 1"
```

```sql
-- q: f1-pg
-- status: ran
-- engine: postgis
SELECT 2 AS a
```

```text
-- result: f1-pg · 1 row · sha256 29c58cb14a61
a
2
```

#### f2 · aggregate

```sql
-- q: f2-one
-- status: ran
SELECT 1 AS a
```

```text
-- result: f2-one · 1 row · sha256 4f395a2e9ea1
a
1
```
