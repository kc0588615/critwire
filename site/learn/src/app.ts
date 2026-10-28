// The Learn bundle's entry (plan D11): one bundle for every Learn page, built by scripts/build/learn/assets.ts as
// app-<hash>.js beside learn-<hash>.css. A page names itself in <body data-page>; its init starts the engine only if
// it has an editor, and the engine's state goes to <body data-engine> (and data-changed once the playground changed
// the tables) and the layout's #engine-status line.
import { startEngine, type Engine } from "./engine.ts";
import { installHook } from "./hook.ts";
import { module } from "./pages/module.ts";
import { playground } from "./pages/playground.ts";

/** Each page's init, by its data-page; `start` starts the engine (once). */
const PAGES: Record<string, (start: () => Engine) => void> = { playground, module };

const CHANGED = "You changed its tables: Reset database restores them, and lesson checks wait until then.";

function showState(engine: Engine): void {
  const s = engine.state;
  document.body.dataset.engine = s.state;
  if (engine.changed) document.body.dataset.changed = "true";
  else delete document.body.dataset.changed;
  const status = document.getElementById("engine-status")!;
  status.textContent = s.state !== "ready" ? s.text : engine.changed ? `The database is ready. ${CHANGED}` : "The database is ready.";
}

let engine: Engine | undefined;
function start(): Engine {
  if (engine) return engine;
  installHook();
  engine = startEngine();
  engine.onChange(() => showState(engine!));
  return engine;
}

const init = PAGES[document.body.dataset.page ?? ""];
if (init) init(start);
