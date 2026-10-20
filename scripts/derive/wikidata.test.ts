// Wikidata rule tests (plan §7). Failure modes first:
// W11: wikidataQuery with a null or non-integer ids.iucn → throws (an unbound ?iucn joins every item with a P627).
import assert from "node:assert/strict";
import { test } from "node:test";
import { wikidataQuery } from "../ingest/wikidata.ts";
import type { BaseSpecies } from "../species.ts";

function base(iucn: unknown, scientificName = "Emydoidea blandingii"): BaseSpecies {
  return {
    id: 1, slug: "x", scientificName, commonName: "X",
    taxonomy: { class: "Reptilia", order: "Testudines", family: "Emydidae", genus: "Emydoidea" },
    ids: { iucn } as BaseSpecies["ids"], photo: null, replacedBy: null,
  };
}

test("W11 wikidataQuery throws on a null or non-integer ids.iucn", () => {
  for (const iucn of [null, undefined, 0, -3, 1.5, "7709"]) {
    assert.throws(() => wikidataQuery([base(iucn)]), /ids\.iucn/, `iucn ${String(iucn)}`);
  }
  assert.match(wikidataQuery([base(7709)]), /\("Emydoidea blandingii" "7709"\)/);
});
