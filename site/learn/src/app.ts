// The Learn bundle's entry (plan D11): one bundle for every Learn page, built by scripts/build/learn/assets.ts as
// app-<hash>.js beside learn-<hash>.css. A page names itself in <body data-page>; a page with an editor starts the
// engine, whose state goes to <body data-engine> and the layout's #engine-status line.
import { startEngine, type Engine, type EngineState } from "./engine.ts";
import { playground } from "./pages/playground.ts";

/** Each page that runs code, by its data-page. */
const PAGES: Record<string, (engine: Engine) => void> = { playground };

function showState(s: EngineState): void {
  document.body.dataset.engine = s.state;
  const status = document.getElementById("engine-status")!;
  status.textContent = s.state === "ready" ? "The database is ready." : s.text;
}

const init = PAGES[document.body.dataset.page ?? ""];
if (init) {
  const engine = startEngine();
  engine.onChange(showState);
  init(engine);
}
