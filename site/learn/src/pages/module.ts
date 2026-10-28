// A course page: /learn/setup/ and each module (plan D11, D12; 004 §7.2), as module-html.ts writes it.
// - A lesson editor (.block.editor) runs isolated after its `data-after` blocks, as written (an editor's original
//   text, an exercise's reference answer), so no lesson changes the tables another reads.
// - An exercise (.block.exercise) checks the learner's answer with check.ts's Checker: the reference, `data-ordered`,
//   and its probes (each editor with `data-expect` whose `data-after` names it); its verdict goes to .verdict, the
//   learner's result to the region and the test hook. A passed skip check (`data-skip`) marks its own module done; a
//   check that settles after its page was left is dropped.
// - Copy, the Schema and Lab schema dialogs, and Mark done work without the engine; the engine starts only on a page
//   with an editor or exercise.
import { Checker, type Exercise } from "../check.ts";
import type { Engine } from "../engine.ts";
import { wireEditor } from "../editor.ts";
import { setHookResult } from "../hook.ts";
import type { Script } from "../isolation.ts";
import { doneModules, setDone } from "../progress.ts";
import { showResult } from "../results.ts";

const ids = (list: string | undefined) => (list ?? "").split(" ").filter(Boolean);

/** Block `id`'s code as written: an editor's original text, or an exercise's reference answer. */
function blockSql(id: string): string {
  const e = document.querySelector(`[data-block="${id}"]`);
  if (!e) throw new Error(`the page has no block ${id}`);
  return e instanceof HTMLTextAreaElement ? e.defaultValue : (e.textContent ?? "");
}

const scripts = (list: string | undefined): Script[] => ids(list).map((id) => ({ id, sql: blockSql(id) }));

function exercise(root: HTMLElement): Exercise {
  const id = root.dataset.exercise!;
  const probes = [...document.querySelectorAll<HTMLTextAreaElement>("textarea[data-expect]")]
    .filter((t) => ids(t.dataset.after).includes(id))
    .map((t) => ({ id: t.dataset.block!, sql: t.defaultValue, expect: t.dataset.expect!, after: scripts(t.dataset.after) }));
  return { id, answer: blockSql(id), ordered: root.dataset.ordered === "true", after: scripts(root.dataset.after), probes };
}

function wireCopy(button: HTMLButtonElement): void {
  const code = document.getElementById(button.dataset.copy!);
  if (!code) throw new Error(`the page has no #${button.dataset.copy}`);
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent ?? "");
      button.textContent = "Copied";
    } catch {
      button.textContent = "Copy failed: select the text";
    }
    setTimeout(() => (button.textContent = "Copy"), 2000);
  });
}

function wireDialog(button: HTMLButtonElement): void {
  const dialog = document.getElementById(`dialog-${button.dataset.dialog}`);
  if (!(dialog instanceof HTMLDialogElement)) throw new Error(`the page has no dialog-${button.dataset.dialog}`);
  button.addEventListener("click", () => dialog.showModal());
}

function showDone(button: HTMLButtonElement, done: boolean): void {
  button.setAttribute("aria-pressed", String(done));
  button.textContent = done ? "Done ✓" : "Mark done";
}

function wireMarkDone(button: HTMLButtonElement): void {
  const id = button.dataset.module!;
  showDone(button, id in doneModules());
  button.addEventListener("click", () => {
    const done = button.getAttribute("aria-pressed") !== "true";
    setDone(id, done);
    showDone(button, done);
  });
}

function markModuleDone(button: HTMLButtonElement): void {
  setDone(button.dataset.module!, true);
  showDone(button, true);
}

export function module(start: () => Engine, signal: AbortSignal): void {
  document.querySelectorAll<HTMLButtonElement>("button[data-copy]").forEach(wireCopy);
  document.querySelectorAll<HTMLButtonElement>("button[data-dialog]").forEach(wireDialog);
  document.querySelectorAll<HTMLButtonElement>(".mark-done").forEach(wireMarkDone);

  const lessons = [...document.querySelectorAll<HTMLElement>(".block.editor")];
  const exercises = [...document.querySelectorAll<HTMLElement>(".block.exercise")];
  if (!lessons.length && !exercises.length) return;
  const engine = start();
  const done = document.querySelector<HTMLButtonElement>(".mark-done"); // none on the setup page, which is no module
  const checker = new Checker(engine);

  for (const root of lessons) {
    const id = root.querySelector<HTMLTextAreaElement>("textarea[data-block]")!.dataset.block!;
    const after = scripts(root.querySelector<HTMLTextAreaElement>("textarea")!.dataset.after);
    wireEditor(engine, root, id, async (sql, region) => {
      const result = await engine.isolated(after, sql);
      setHookResult(id, result);
      showResult(region, sql, result, engine.species);
    }, signal);
  }

  for (const root of exercises) {
    const ex = exercise(root);
    const verdict = root.querySelector<HTMLElement>(".verdict")!;
    wireEditor(engine, root, ex.id, async (sql, region) => {
      verdict.textContent = "";
      delete verdict.dataset.ok;
      region.replaceChildren();
      const v = await checker.check(ex, sql);
      if (signal.aborted) return; // the learner left this page
      setHookResult(ex.id, v.result ?? new Error(v.hint));
      if (v.result) showResult(region, sql, v.result, engine.species);
      verdict.textContent = v.hint;
      verdict.dataset.ok = String(v.ok);
      if (v.ok && "skip" in root.dataset && done) markModuleDone(done);
    }, signal);
  }
}
