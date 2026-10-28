// The teaching diagrams (diagrams.ts; plan D14, S25), written before the code. Failure modes: a diagram ships without
// its dark variant or its diagram-design source, so it can't be redrawn or shows light on a dark page; an SVG without a
// <title> gives the page an image with no alt text; an SVG that loads a font, stylesheet or image from elsewhere
// breaks the offline build's promise and the origin fence; a file no page uses ships unseen; a stray file in the
// folder is mistaken for a diagram; the <img> lacks its size, alt or dark <source>.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDiagrams, diagramHtml } from "./diagrams.ts";

const svg = (title: string, body = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" role="img" aria-labelledby="flow-title flow-desc"><title id="flow-title">${title}</title><desc id="flow-desc">d</desc>${body}</svg>`;
const files = (over: Record<string, string | undefined> = {}) => {
  const all: Record<string, string | undefined> = {
    "flow.html": "<html>", "flow-dark.html": "<html>", "flow.svg": svg("Data flows one way"), "flow-dark.svg": svg("Data flows one way"), ...over,
  };
  return new Map(Object.entries(all).filter((e): e is [string, string] => e[1] !== undefined));
};
const used = new Set(["flow"]);
const errors = (over: Record<string, string | undefined>, u: ReadonlySet<string> = used) => checkDiagrams(files(over), u).errors;

test("DG1 a complete diagram: its title, and its size from the viewBox", () => {
  const { diagrams, errors: e } = checkDiagrams(files(), used);
  assert.deepEqual(e, []);
  assert.deepEqual(diagrams.get("flow"), { title: "Data flows one way", width: 800, height: 360 });
});

test("DG2 a missing variant or source is refused, each named", () => {
  assert.deepEqual(errors({ "flow-dark.svg": undefined }), ["site/learn/diagrams/flow-dark.svg: missing (flow needs flow.html, flow-dark.html, flow.svg, flow-dark.svg)"]);
  assert.deepEqual(errors({ "flow.html": undefined }), ["site/learn/diagrams/flow.html: missing (flow needs flow.html, flow-dark.html, flow.svg, flow-dark.svg)"]);
  assert.deepEqual(errors({ "flow-dark.html": undefined }), ["site/learn/diagrams/flow-dark.html: missing (flow needs flow.html, flow-dark.html, flow.svg, flow-dark.svg)"]);
});

test("DG3 an SVG without a <title>, or with an empty one, or without a viewBox, is refused", () => {
  assert.deepEqual(errors({ "flow-dark.svg": svg("x").replace(/<title.*<\/title>/, "") }), ["site/learn/diagrams/flow-dark.svg: no <title> (the page's alt text)"]);
  assert.deepEqual(errors({ "flow.svg": svg("  ") }), ["site/learn/diagrams/flow.svg: no <title> (the page's alt text)"]);
  assert.deepEqual(errors({ "flow.svg": svg("x").replace(' viewBox="0 0 800 360"', "") }), ['site/learn/diagrams/flow.svg: no viewBox="0 0 <width> <height>"']);
});

test("DG4 any reference outside the file is refused: @import, url(), href, src", () => {
  const remote = [
    "<style>@import url('https://fonts.googleapis.com/css2?family=Geist');</style>",
    '<style>@font-face { src: url("fonts/geist.woff2"); }</style>',
    '<image href="https://example.org/a.png"/>',
    '<use xlink:href="other.svg#a"/>',
    '<image src="a.png"/>',
  ];
  for (const body of remote) assert.deepEqual(errors({ "flow.svg": svg("x", body) }), ["site/learn/diagrams/flow.svg: a reference outside the file (the build is offline)"], body);
  // A fragment in the same file is fine; so is the SVG namespace.
  assert.deepEqual(errors({ "flow.svg": svg("x", '<marker id="flow-arrow"/><path marker-end="url(#flow-arrow)"/><use href="#flow-arrow"/>') }), []);
});

test("DG5 a diagram no page uses, and a file that isn't one, are refused", () => {
  assert.deepEqual(errors({}, new Set()), ["site/learn/diagrams/flow.svg: no page has {{diagram:flow}}"]);
  assert.deepEqual(errors({ "flow.png": "x" }), ["site/learn/diagrams/flow.png: not a diagram file (<name>.html, <name>-dark.html, <name>.svg, <name>-dark.svg)"]);
  assert.deepEqual(errors({ "Flow.svg": "x" }), ["site/learn/diagrams/Flow.svg: not a diagram file (<name>.html, <name>-dark.html, <name>.svg, <name>-dark.svg)"]);
});

test("DG6 the slot's HTML: a <picture> with the dark <source> and an <img> with its alt (escaped) and size", () => {
  const html = diagramHtml("flow", { title: "Rows <and> pages", width: 800, height: 360 });
  assert.ok(html.startsWith('<figure class="diagram" id="diagram-flow">'));
  assert.ok(html.includes('<source srcset="/learn/diagrams/flow-dark.svg" media="(prefers-color-scheme: dark)">'));
  assert.ok(html.includes('<img src="/learn/diagrams/flow.svg" alt="Rows &lt;and&gt; pages" width="800" height="360">'));
});
