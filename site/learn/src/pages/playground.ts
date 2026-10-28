// /learn/playground/ (plan D11, D12): one editor whose changes stay until Reset database (the engine's persistent run:
// transaction control refused, the changed flag). Its last result is the test hook's "playground".
import type { Engine } from "../engine.ts";
import { wireEditor } from "../editor.ts";
import { setHookResult } from "../hook.ts";
import { showResult } from "../results.ts";

const BLOCK = "playground";

export function playground(start: () => Engine): void {
  const root = document.getElementById("playground");
  if (!root) throw new Error("the page has no #playground");
  const engine = start();
  wireEditor(engine, root, BLOCK, async (sql, region) => {
    const result = await engine.persistent(sql);
    setHookResult(BLOCK, result);
    showResult(region, sql, result, engine.species);
  });
}
