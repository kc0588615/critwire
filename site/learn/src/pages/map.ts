// /learn/ and the track pages (plan D12; 004 §7.4): a done tick on each module entry (li[data-module] .done) that
// progress.ts lists, and on the map, Clear progress. Neither page starts the engine.
import { clearProgress, doneModules } from "../progress.ts";

function showTicks(): void {
  const done = doneModules();
  for (const li of document.querySelectorAll<HTMLElement>("li[data-module]")) {
    li.querySelector<HTMLElement>(".done")!.hidden = !(li.dataset.module! in done);
  }
}

export function map(): void {
  showTicks();
  document.getElementById("clear-progress")?.addEventListener("click", () => {
    clearProgress();
    showTicks();
  });
}
