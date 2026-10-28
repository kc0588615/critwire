// One editor's controls (plan D11; 002 §8): within `root`, a textarea, a `.result` region and the buttons [data-run]
// (Run, or Check), [data-stop] and [data-reset]. Run (also Ctrl/Cmd+Enter) calls `act` with the editor's text, one run
// at a time per editor; Stop and Reset restart the engine (a new generation), and a run they overtook (Superseded)
// leaves the region to them. Any other failure is the block's error, in the region and the test hook. Shared by the
// playground and the lesson pages.
import { Superseded, type Engine } from "./engine.ts";
import { setHookResult } from "./hook.ts";
import { setBusy, showError, showNote } from "./results.ts";

/** What a run does: runs `sql` and shows the outcome in `region` (and the hook). */
export type Act = (sql: string, region: HTMLElement) => Promise<void>;

function part<T extends Element>(root: Element, selector: string): T {
  const e = root.querySelector<T>(selector);
  if (!e) throw new Error(`${root.id || root.tagName}: no ${selector}`);
  return e;
}

/** Wires the editor in `root`, whose results the test hook keeps as `blockId`, until `signal` aborts (its page left). */
export function wireEditor(engine: Engine, root: HTMLElement, blockId: string, act: Act, signal: AbortSignal): void {
  const editor = part<HTMLTextAreaElement>(root, "textarea");
  const region = part<HTMLElement>(root, ".result");
  const run = part<HTMLButtonElement>(root, "[data-run]");
  const stop = root.querySelector<HTMLButtonElement>("[data-stop]");
  const reset = root.querySelector<HTMLButtonElement>("[data-reset]");
  let running = false;
  let runs = 0; // a run's number: a run that Stop or Reset overtook mustn't touch the next run's state
  const sync = () => {
    run.disabled = engine.state.state !== "ready" || running;
    if (stop) stop.disabled = !running;
    if (reset) reset.disabled = engine.state.state === "loading";
  };
  engine.onChange(sync, signal);

  async function runEditor(): Promise<void> {
    if (run.disabled) return;
    const me = ++runs;
    running = true;
    setBusy(region, true);
    sync();
    try {
      await act(editor.value, region);
    } catch (e) {
      if (e instanceof Superseded) return; // Stop or Reset already says what happened
      setHookResult(blockId, e as Error);
      showError(region, e as Error);
    } finally {
      if (me === runs) {
        running = false;
        setBusy(region, false);
        sync();
      }
    }
  }

  async function restart(note: string): Promise<void> {
    runs++;
    running = false;
    setBusy(region, false);
    setHookResult(blockId, undefined);
    showNote(region, "Restarting the database…");
    await engine.restart();
    showNote(region, engine.state.state === "ready" ? note : "The database couldn't restart.");
  }

  run.addEventListener("click", () => void runEditor());
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void runEditor();
    }
  });
  stop?.addEventListener("click", () => void restart("Stopped. The database was restarted."));
  reset?.addEventListener("click", () => void restart("The database was reset: every table is as it was built."));
}
