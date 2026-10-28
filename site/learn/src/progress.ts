// Progress without accounts (004 §7.4): one localStorage key, critwire.learn.done.v1, `{ "<module id>": "<YYYY-MM-DD>" }`.
// Mark done and a passed skip check set it; the map shows the ticks and clears the key (S14). A browser that refuses
// storage still runs every module: the ticks just don't persist, so a refusal reads as "nothing done".
const KEY = "critwire.learn.done.v1";

export function doneModules(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw === null ? {} : JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Marks `id` done today (UTC), or not done. */
export function setDone(id: string, done: boolean): void {
  const all = doneModules();
  if (done) all[id] = new Date().toISOString().slice(0, 10);
  else delete all[id];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage refused: the tick lasts for this page only
  }
}
