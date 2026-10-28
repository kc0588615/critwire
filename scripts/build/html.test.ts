// fillSlots (html.ts; plan F10), written before the change: a template's `{{` that isn't a `{{word}}` slot would reach
// the page as text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillSlots } from "./html.ts";

test("HT1 fillSlots fills {{word}} slots and refuses any other {{ left in the template, naming it", () => {
  assert.equal(fillSlots("<p>{{a}}</p>", { a: "{{x}}" }, "t.html"), "<p>{{x}}</p>");
  assert.throws(() => fillSlots("<p>{{a}} {{block:b}}</p>", { a: "" }, "t.html"), /^Error: t\.html: a leftover \{\{/);
  assert.throws(() => fillSlots("<p>{{a}} {{ b</p>", { a: "" }, "t.html"), /^Error: t\.html: a leftover \{\{/);
});
