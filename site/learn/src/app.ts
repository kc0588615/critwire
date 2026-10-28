// The Learn bundle's entry (plan D11): one bundle for every Learn page, built by scripts/build/learn/assets.ts as
// app-<hash>.js beside learn-<hash>.css. A page names itself in <body data-page>; a page with an editor starts the
// engine, whose state goes to <body data-engine> (and data-changed once the playground changed the tables) and the
// layout's #engine-status line.
import { startEngine, type Engine } from "./engine.ts";
import { installHook } from "./hook.ts";
import { playground } from "./pages/playground.ts";

/** Each page that runs code, by its data-page. */
const PAGES: Record<string, (engine: Engine) => void> = { playground };

const CHANGED = "You changed its tables: Reset database restores them, and lesson checks wait until then.";

function showState(engine: Engine): void {
  const s = engine.state;
  document.body.dataset.engine = s.state;
  if (engine.changed) document.body.dataset.changed = "true";
  else delete document.body.dataset.changed;
  const status = document.getElementById("engine-status")!;
  status.textContent = s.state !== "ready" ? s.text : engine.changed ? `The database is ready. ${CHANGED}` : "The database is ready.";
}

const init = PAGES[document.body.dataset.page ?? ""];
if (init) {
  installHook();
  const engine = startEngine();
  engine.onChange(() => showState(engine));
  init(engine);
}
