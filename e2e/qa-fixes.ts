// One row per prose or external-URL fix of the Learn QA pass (plans/006-learn-qa.md): the served page holds `has` and not
// `not`, in its HTML as written, so a link's URL counts and a sentence is matched between its tags. `from`: the recorded
// result (repo path) a number came from, checked on dist/ only by learn-walk.spec.ts. Run on dist/ and, by
// release/live.spec.ts, on the origin.
import type { APIRequestContext } from "@playwright/test";

export interface QaFix {
  q: string;
  url: string;
  has: string;
  not?: string;
  from?: { file: string; values: string[] };
}

export const QA_FIXES: QaFix[] = [
  { q: "Q5", url: "/learn/setup/", has: "uv pip install --constraint requirements.txt jupyterlab" },
];

// What's wrong with each row on the origin `request` points at; [] when every fix shows.
export async function qaFixErrors(request: APIRequestContext): Promise<string[]> {
  const errors: string[] = [];
  for (const { q, url, has, not } of QA_FIXES) {
    const res = await request.get(url);
    if (res.status() !== 200) {
      errors.push(`${q} ${url}: ${res.status()}`);
      continue;
    }
    const html = await res.text();
    if (!html.includes(has)) errors.push(`${q} ${url}: lacks "${has}"`);
    if (not && html.includes(not)) errors.push(`${q} ${url}: still has "${not}"`);
  }
  return errors;
}
