// Learn's HTML pages (plan D12): each page's fragment inside site/learn/layout.html, with site/style.css inlined and the
// bundle's two URLs (assets.ts writeAssets). S11: the playground only; the map, tracks, modules and schema pages follow.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { esc, fillSlots, styleSheet } from "../html.ts";
import type { BundleUrls } from "./assets.ts";

const learnDir = new URL("../../../site/learn/", import.meta.url);

export interface LearnPage {
  /** Its folder under /learn/, written as index.html. */
  dir: string;
  /** <body data-page>: the bundle's init for it (site/learn/src/app.ts). */
  page: string;
  title: string;
  /** Its fragment, under site/learn/. */
  fragment: string;
}

export const PAGES: readonly LearnPage[] = [
  { dir: "playground/", page: "playground", title: "Playground", fragment: "pages/playground.html" },
];

/** A page: `main` (HTML) inside `layout`. Pure. */
export function renderPage(layout: string, style: string, bundle: BundleUrls, page: Pick<LearnPage, "page" | "title">, main: string): string {
  return fillSlots(layout, {
    title: esc(page.title),
    style,
    css: `<link rel="stylesheet" href="${esc(bundle.css)}">`,
    js: `<script type="module" src="${esc(bundle.js)}"></script>`,
    page: esc(page.page),
    main,
  }, "site/learn/layout.html");
}

/** Writes every page of PAGES under `out`/learn/. */
export async function writePages(out: URL, bundle: BundleUrls): Promise<void> {
  const [layout, style] = await Promise.all([readFile(new URL("layout.html", learnDir), "utf8"), readFile(styleSheet, "utf8")]);
  for (const p of PAGES) {
    const dir = new URL(`learn/${p.dir}`, out);
    await mkdir(dir, { recursive: true });
    await writeFile(new URL("index.html", dir), renderPage(layout, style, bundle, p, await readFile(new URL(p.fragment, learnDir), "utf8")));
  }
}
