// The GBIF checklist datasets that may yield range listings (007, Allowlist): dataset → role, area, reason. A dataset
// with no entry yields nothing and is counted (a new role is a person's call, never an agent's). The reasons stay here:
// the snapshot's allowlist holds role and area only, because assertNoIucnData walks the snapshot and a reason may name
// the tie the owner accepted (O2). No imports, so derive can read this file without a cycle through the ingests.
export type ChecklistRole = "register" | "checklist";

const GRIIS_TIE = "GRIIS: published by ISSG, a group of IUCN's Species Survival Commission; metadata names ISSG as project lead or contact, and some lists cite IUCN's alien-species definition or the EICAT paper. Rows are national expert lists of non-native species, not Red List data, so O2's question, not a drop.";

export const CHECKLIST_ROLES: Readonly<Record<string, { role: ChecklistRole; area: string | null; reason: string }>> = {
  "15147db1-27c3-49b5-9c69-c78d55a4b8ff": {
    role: "checklist", area: null,
    reason: `GRIIS Australia isn't non-native only: its one row met has a blank means on the greater bilby, an Australian endemic, and an even sample of its species read in session gave 24 INTRODUCED rows and 1 blank. So a blank can't mean introduced here: role checklist, the row yields none, explicit INTRODUCED rows still count. ${GRIIS_TIE}`,
  },
  "168568e7-eb5f-4ef6-8c59-f73ceaf57e91": {
    role: "register", area: null,
    reason: `National list of introduced species; rows met say INTRODUCED outright. ${GRIIS_TIE}`,
  },
  "1df9467e-0c60-4e5a-a7b0-2b60bd6648ed": {
    role: "register", area: null,
    reason: `National list of introduced species; rows met say INTRODUCED outright. ${GRIIS_TIE}`,
  },
  "2a281675-c184-4d54-a47e-5d3a7ec6653f": {
    role: "register", area: null,
    reason: `National list of introduced species; rows met say INTRODUCED outright. ${GRIIS_TIE}`,
  },
  "38de3b7a-5af3-4b6f-a1c5-4c0aa6abf010": {
    role: "register", area: null,
    reason: `National list of introduced species; rows met say INTRODUCED outright. ${GRIIS_TIE}`,
  },
  "39f36f10-559b-427f-8c86-2d28afff68ca": {
    role: "register", area: null,
    reason: "Inventory of alien species in Europe; per-row country. Only IUCN tie is one contact's affiliation (ISSG's European chair), read in session: no use of IUCN data, so not O2.",
  },
  "3cabcf37-db13-4dc1-9bf3-e6f3fbfbbe23": {
    role: "register", area: null,
    reason: `National list of introduced species; rows met say INTRODUCED outright. ${GRIIS_TIE}`,
  },
  "3f5e930b-52a5-461d-87ec-26ecd66f14a3": {
    role: "register", area: null,
    reason: "Registry of non-native species for four countries; per-row country, so no dataset area. No IUCN mention.",
  },
  "5aa5f29e-532e-4ae5-81c0-f8a9eb4dcaf2": {
    role: "register", area: null,
    reason: `National list of introduced species; rows met say INTRODUCED outright. ${GRIIS_TIE}`,
  },
  "5c5a6e45-d510-45ed-b7bf-6d0624fac056": {
    role: "register", area: null,
    reason: `National list of introduced species; rows met say INTRODUCED outright. ${GRIIS_TIE}`,
  },
  "6baf6a53-c106-40fb-bbde-f6d4e4051513": {
    role: "register", area: "Hawaii",
    reason: `US-RIIS Hawaii list: 'a taxon must be non-native everywhere in the locality'; 'Native pest species are not included'. Whole dataset is Hawaii, so area. ${GRIIS_TIE}`,
  },
  "6d9e952f-948c-4483-9807-575348147c7e": {
    role: "register", area: null,
    reason: `National list of introduced species; rows met say INTRODUCED outright. Rows mix scopes in locality (Belgium, Flemish Region), so area null. ${GRIIS_TIE}`,
  },
  "78ee0f56-267b-49e1-8afc-19f03cf81276": {
    role: "register", area: null,
    reason: "SANBI's list of alien species in South Africa: by its title holds only non-native species, so a blank means introduced. No IUCN mention.",
  },
  "7b6661a3-5bbd-4dbb-b3e4-0c26df341977": {
    role: "register", area: null,
    reason: `National list of introduced species; rows met say INTRODUCED outright. ${GRIIS_TIE}`,
  },
  "9a52d8bf-864a-4abb-95ba-319c4edfca8d": {
    role: "register", area: null,
    reason: "Belgium's alien mammals list. Row's locality is a region but the dataset spans the country, so area null. No IUCN mention.",
  },
  "a12e2bf8-13ce-4d0b-b2d4-b1cd20450a63": {
    role: "register", area: null,
    reason: "Belgium's alien herpetofauna list. Row's locality is a region but the dataset spans the country, so area null. No IUCN mention.",
  },
  "c71d02ff-b756-4cc0-b089-d29ba9155619": {
    role: "checklist", area: null,
    reason: "The only native-but-absent source met, plus one explicit INTRODUCED row. Stated sources are literature, monographs and institutional checklists; metadata says global aggregators including IUCN were used for cross-checking and its conservation status follows the Red List. Status is never kept. A stated cross-check, not a stated source of rows, so O2's question, not a drop.",
  },
  "de8934f4-a136-481c-a87a-b0b202b80a31": {
    role: "checklist", area: null,
    reason: "Sweden's national taxon database: native and non-native species alike, so checklist. Its one row states INTRODUCED outright. No IUCN mention.",
  },
};

// What the snapshot records: role and area, no reason. A snapshot whose allowlist differs from this is stale.
export const CHECKLIST_ALLOWLIST: Readonly<Record<string, { role: ChecklistRole; area: string | null }>> = Object.fromEntries(
  Object.entries(CHECKLIST_ROLES).map(([key, { role, area }]) => [key, { role, area }]));
