// /learn/playground/ (plan D11, D12): one editor whose changes stay until Reset database (the engine's persistent run:
// transaction control refused, the changed flag). Its last result is the test hook's "playground", and Download CSV
// saves it (csv.ts), enabled only while it is shown (a new run, Stop or Reset forgets it).
import { csvText } from "../csv.ts";
import type { Engine } from "../engine.ts";
import { wireEditor } from "../editor.ts";
import { setHookResult } from "../hook.ts";
import type { Result } from "../query-result.ts";
import { showResult } from "../results.ts";

const BLOCK = "playground";

function download(result: Result): void {
  const url = URL.createObjectURL(new Blob([csvText(result)], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "result.csv" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function playground(start: () => Engine, signal: AbortSignal): void {
  const root = document.getElementById("playground");
  const csv = document.getElementById("download-csv");
  if (!root || !(csv instanceof HTMLButtonElement)) throw new Error("the page has no #playground or #download-csv");
  let last: Result | undefined;
  const forget = () => {
    last = undefined;
    csv.disabled = true;
  };
  csv.addEventListener("click", () => last && download(last), { signal });
  root.querySelectorAll("[data-stop], [data-reset]").forEach((b) => b.addEventListener("click", forget, { signal }));
  const engine = start();
  wireEditor(engine, root, BLOCK, async (sql, region) => {
    forget();
    const result = await engine.persistent(sql);
    setHookResult(BLOCK, result);
    showResult(region, sql, result, engine.species);
    last = result;
    csv.disabled = false;
  }, signal);
}
