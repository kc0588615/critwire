// /learn/playground/ (plan D11, D12): one editor whose changes stay until Reset database. Run (Ctrl/Cmd+Enter),
// Stop and Reset restart nothing but the engine. Transaction control and the changed flag land in S12.
import { Superseded, type Engine } from "../engine.ts";
import { setBusy, showError, showNote, showResult } from "../results.ts";

const byId = <T extends HTMLElement>(id: string) => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`the page has no #${id}`);
  return e as T;
};

export function playground(engine: Engine): void {
  const editor = byId<HTMLTextAreaElement>("playground-sql");
  const region = byId("playground-result");
  const [run, stop, reset] = ["playground-run", "playground-stop", "playground-reset"].map((id) => byId<HTMLButtonElement>(id));
  let running = false;
  let runs = 0; // a run's number: a run that Stop or Reset overtook mustn't touch the next run's state
  const sync = () => {
    const ready = engine.state.state === "ready";
    run!.disabled = !ready || running;
    stop!.disabled = !running;
    reset!.disabled = engine.state.state === "loading";
  };
  engine.onChange(sync);

  async function runEditor(): Promise<void> {
    if (run!.disabled) return;
    const me = ++runs;
    running = true;
    setBusy(region, true);
    sync();
    try {
      showResult(region, await engine.run(editor.value));
    } catch (e) {
      if (e instanceof Superseded) return; // Stop or Reset already says what happened
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
    showNote(region, "Restarting the database…");
    await engine.restart();
    showNote(region, engine.state.state === "ready" ? note : "The database couldn't restart.");
  }

  run!.addEventListener("click", () => void runEditor());
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void runEditor();
    }
  });
  stop!.addEventListener("click", () => void restart("Stopped. The database was restarted."));
  reset!.addEventListener("click", () => void restart("The database was reset: every table is as it was built."));
}
