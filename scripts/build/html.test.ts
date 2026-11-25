// fillSlots (html.ts; plan F10), written before the change: a template's `{{` that isn't a `{{word}}` slot would reach
// the page as text. rawText (HT2; web-modernize plan F1-F8), also written before the change: a slot value that ends
// its <style> or <script> early.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillSlots, rawText } from "./html.ts";

test("HT1 fillSlots fills {{word}} slots and refuses any other {{ left in the template, naming it", () => {
  assert.equal(fillSlots("<p>{{a}}</p>", { a: "{{x}}" }, "t.html"), "<p>{{x}}</p>");
  assert.throws(() => fillSlots("<p>{{a}} {{block:b}}</p>", { a: "" }, "t.html"), /^Error: t\.html: a leftover \{\{/);
  assert.throws(() => fillSlots("<p>{{a}} {{ b</p>", { a: "" }, "t.html"), /^Error: t\.html: a leftover \{\{/);
});

test("HT2 rawText returns a style or script unchanged and refuses text that would end its element early, naming it", () => {
  // F1-F3: </style in a style, any case, anything after it, inside a CSS comment too.
  for (const css of ["a{}</style><p>", "a{}</STYLE >", "a{}</Style\n", "/* </style> */"]) {
    assert.throws(() => rawText("style", css, "site/docs.css"), { message: "site/docs.css: contains </style" }, css);
  }
  // F4: </script in a script, any case.
  for (const js of ["x()</script>", "x()</SCRIPT>"]) {
    assert.throws(() => rawText("script", js, "site/docs.js"), { message: "site/docs.js: contains </script" }, js);
  }
  // F5: <!-- in a script.
  assert.throws(() => rawText("script", "a <!-- b", "site/docs.js"), { message: "site/docs.js: contains <!--" });
  // F6: each element ends only at its own tag; <!-- matters only in a script.
  assert.equal(rawText("style", "a{} <!-- </script>", "site/docs.css"), "a{} <!-- </script>");
  assert.equal(rawText("script", "x = '</style>';", "site/docs.js"), "x = '</style>';");
  // F7: clean text comes back as the same string (no trim, no escape, no $ patterns).
  const css = " a{content:'$&'}\n";
  assert.equal(rawText("style", css, "site/docs.css"), css);
  // F8: the message names the file passed in.
  assert.throws(() => rawText("style", "</style>", "other.css"), { message: "other.css: contains </style" });
});
