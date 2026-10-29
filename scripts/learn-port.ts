// pnpm learn:port (plan D16): a page's blocks from plans/004-learn-curriculum.md to site/learn/ (learn/port.ts).
//   pnpm learn:port <page>…             writes each page's block files and seeds their recorded results; refuses,
//                                       writing nothing, if a file exists and differs from 004.
//   pnpm learn:port --check <page>…|all compares the files with 004 and names each difference; `all` = every page with
//                                       a block file written. This is the plan's `P`.
// A page is `setup` or a module id (f1, d3 …). Any 004 error (a lint, a missing result) exits 1 before anything is written.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkPort, portedPages, portPage, writePort } from "./learn/port.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
try {
  const { values, positionals } = parseArgs({ options: { check: { type: "boolean" } }, allowPositionals: true, strict: true });
  if (!positionals.length) throw new Error("usage: pnpm learn:port <page>… | pnpm learn:port --check <page>…|all");
  const doc = readFileSync(new URL("../plans/004-learn-curriculum.md", import.meta.url), "utf8");
  const setupSql = readFileSync(new URL("../site/learn/sql/setup.sql", import.meta.url), "utf8");
  const all = positionals.length === 1 && positionals[0] === "all";
  if (all && !values.check) throw new Error("`all` is for --check: port pages one by one");
  const pages = all ? portedPages(doc, setupSql, root) : positionals;
  const ported = pages.map((p) => ({ page: p, ...portPage(doc, p, setupSql) }));
  const errors = ported.flatMap((p) => p.errors);
  if (errors.length) throw new Error(errors.join("\n"));
  const files = ported.flatMap((p) => p.files);
  if (values.check) {
    const diffs = checkPort(files, root);
    if (diffs.length) throw new Error(diffs.join("\n"));
    console.log(`learn:port: ${pages.length} pages (${pages.join(", ") || "none ported"}), ${files.length} files equal 004`);
  } else {
    const { written, unchanged } = writePort(files, root);
    console.log(`learn:port: ${pages.join(", ")}: ${written} written, ${unchanged} unchanged`);
  }
} catch (e) {
  console.error(`learn:port: ${(e as Error).message}`);
  process.exit(1);
}
