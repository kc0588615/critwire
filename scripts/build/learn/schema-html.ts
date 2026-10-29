// The schema pages (plan D10 dictionaries, D12; 004 §6, §7.1): /learn/schema/, /learn/schema/lab/ and
// /learn/schema/star/, each its template (site/learn/pages/schema-<name>.html: the prose) with the parts the .mmd
// decides filled in: the SVG (alt = its accTitle, also linked alone), the relationships in words, the data dictionary
// (erd.ts dictionaries; the lab's lists only the tables that differ from schema v2 and links the rest there), and the
// planned and lab-made lists (`%% planned:`, `%% lab-made:`). A planned table is marked in its dictionary entry; a
// published star table links its file. Pure. Checked by e2e/schema.spec.ts.
import { markers, parseErd, type ErdRelationship } from "../../learn/erd-model.ts";
import { esc, fillSlots } from "../html.ts";
import { dictionaries, type DrawnErd, type ErdTexts } from "./erd.ts";
import { inlineCode } from "./map-html.ts";

export const SCHEMA_URLS: Record<DrawnErd, string> = { schema: "/learn/schema/", lab: "/learn/schema/lab/", star: "/learn/schema/star/" };

const table = (name: string) => `<code>${esc(name)}</code>`;

/** One line in words: "Each `many` row points at exactly one (or at most one) `one` row; a `one` row has … (label)." */
export function relationshipText(r: ErdRelationship): string {
  const many = /\|\{|\}\|/.test(r.drawn) ? "one or more" : r.unique ? "at most one" : "zero or more";
  const self = r.one === r.many;
  return `Each ${table(r.many)} row points at ${r.optional ? "zero or one" : "exactly one"} ${table(r.one)} row` +
    `${self ? " (another row of the same table)" : ""}; a ${table(r.one)} row has ${many} ${table(r.many)} ${many === "at most one" ? "row" : "rows"}: ` +
    `“${esc(r.label)}”.`;
}

const list = (cls: string, names: readonly string[]) => `<ul class="${cls}">${names.map((n) => `<li>${table(n)}</li>`).join("")}</ul>`;

function dictionaryHtml(name: DrawnErd, texts: ErdTexts): string {
  const { planned } = markers(texts[name]);
  return dictionaries(texts[name], name === "lab" ? { except: texts.schema } : {}).map((d) => {
    const isPlanned = planned.includes(d.table);
    const file = name === "star" && !isPlanned ? ` <a href="/learn/data/star/${d.table}.csv">${d.table}.csv</a>` : "";
    const rows = d.rows.map((r) => `<tr><td><code>${esc(r.column)}</code></td><td>${esc(r.type)}</td><td>${esc(r.key)}</td><td>${esc(r.meaning)}</td><td>${inlineCode(r.source)}</td></tr>`);
    return [
      `<section class="dictionary" id="t-${d.table}" data-table="${d.table}"${isPlanned ? " data-planned" : ""}>`,
      `<h3>${table(d.table)}${isPlanned ? ` <span class="planned">planned</span>` : ""}${file}</h3>`,
      `<div class="table-wrap"><table><thead><tr><th scope="col">Column</th><th scope="col">Type</th><th scope="col">Key</th><th scope="col">Meaning</th><th scope="col">Source</th></tr></thead>`,
      `<tbody>${rows.join("")}</tbody></table></div>`,
      `</section>`,
    ].join("\n");
  }).join("\n");
}

/** The lab's tables drawn as in schema v2 (same columns), each linked to its entry there. */
function sharedHtml(texts: ErdTexts): string {
  const own = new Set(dictionaries(texts.lab, { except: texts.schema }).map((d) => d.table));
  const shared = parseErd(texts.lab).entities.map((e) => e.name).filter((t) => !own.has(t));
  return `<ul class="shared-tables">${shared.map((t) => `<li><a href="${SCHEMA_URLS.schema}#t-${t}">${table(t)}</a></li>`).join("")}</ul>`;
}

/** A schema page's main: `template` (its prose) with the diagram, relationships, dictionary and lists filled in. */
export function schemaMain(name: DrawnErd, texts: ErdTexts, template: string): string {
  const erd = parseErd(texts[name]);
  const { labMade, planned } = markers(texts[name]);
  const svg = `/learn/schema/${name}.svg`;
  const slots: Record<string, string> = {
    diagram: [
      `<figure class="erd">`,
      `<img src="${svg}" alt="${esc(erd.title!)}">`,
      `<figcaption>${esc(erd.description!)} <a href="${svg}">Open the diagram alone</a> to zoom in.</figcaption>`,
      `</figure>`,
    ].join("\n"),
    relationships: `<ul class="relationships">${erd.relationships.map((r) => `<li>${relationshipText(r)}</li>`).join("")}</ul>`,
    dictionary: dictionaryHtml(name, texts),
  };
  // Only a page with planned tables has the slot, so its prose can't outlive them (fillSlots refuses either mismatch).
  if (name !== "schema" && planned.length) slots.planned = list("planned-tables", planned);
  if (name === "lab") {
    slots.labMade = list("lab-made", labMade);
    slots.shared = sharedHtml(texts);
  }
  return fillSlots(template, slots, `site/learn/pages/schema-${name}.html`);
}

/** The playground's list of schema v2's tables and its view, each linked to its dictionary entry. */
export function tablesList(texts: ErdTexts): string {
  const items = [
    ...parseErd(texts.schema).entities.map((e) => `<li><a href="${SCHEMA_URLS.schema}#t-${e.name}">${e.name}</a></li>`),
    `<li><a href="${SCHEMA_URLS.schema}#species_taxonomy">species_taxonomy</a> (a view)</li>`,
  ];
  return `<ul id="playground-tables" class="table-list">${items.join("")}</ul>`;
}
