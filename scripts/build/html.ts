// HTML for the build's pages (plan D9.2): escaping, links and {{slot}} filling, shared by dist/index.html and
// dist/learn/data/index.html. Pure.

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (value: string | number) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
export const link = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`;
// A license's name, linked to its deed when it has one (licenseUrl).
export const licenseLink = (license: string, url: string | null) => (url === null ? esc(license) : link(url, license));

// site/style.css, inlined into each page through its {{style}} slot.
export const styleSheet = new URL("../../site/style.css", import.meta.url);

// template with each {{slot}} replaced by slots[slot] (already HTML). Throws, naming the template (name), for a slot
// the template has that slots lacks, for one in slots the template doesn't use, and for any other {{ in the template
// (F10: it would reach the page as text).
export function fillSlots(template: string, slots: Record<string, string>, name: string): string {
  const rest = template.replace(/\{\{\w+\}\}/g, "");
  const at = rest.indexOf("{{");
  if (at >= 0) throw new Error(`${name}: a leftover {{ (not a {{slot}}): ${JSON.stringify(rest.slice(at, at + 40))}`);
  const used = new Set<string>();
  const html = template.replace(/\{\{(\w+)\}\}/g, (_, slot: string) => {
    if (!Object.hasOwn(slots, slot)) throw new Error(`${name}: unknown slot {{${slot}}}`);
    used.add(slot);
    return slots[slot];
  });
  const unused = Object.keys(slots).filter((slot) => !used.has(slot));
  if (unused.length > 0) throw new Error(`${name} lacks the slots ${unused.map((n) => `{{${n}}}`).join(", ")}`);
  return html;
}
