// Learn's HTML pages (plan D12): each page's main inside site/learn/layout.html, with site/style.css inlined and the
// bundle's two URLs (assets.ts writeAssets): the map and the track pages (map-html.ts), the playground (with schema
// v2's tables listed), the three schema pages (schema-html.ts), the setup page and each built module (its fragment's
// block slots filled by module-html.ts, a module inside its frame).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { SETUP_PAGE, type CoursePage, type Curriculum } from "../../learn/course.ts";
import { esc, fillSlots, styleSheet } from "../html.ts";
import type { BundleUrls } from "./assets.ts";
import { DRAWN_ERDS, type ErdTexts } from "./erd.ts";
import { mapMain, trackMain } from "./map-html.ts";
import { moduleFrame, moduleUrl, renderFragment, type PageContext } from "./module-html.ts";
import { SCHEMA_URLS, schemaMain, tablesList } from "./schema-html.ts";

const learnDir = new URL("../../../site/learn/", import.meta.url);

export interface LearnPage {
  /** Its folder under /learn/, written as index.html. */
  dir: string;
  /** <body data-page>: the bundle's init for it (site/learn/src/app.ts). */
  page: string;
  title: string;
  /** Its <main> content (HTML). */
  main: string;
}

/** What every course page shares: module-html.ts's PageContext less the page's own blocks, file and download. */
export type CourseContext = Omit<PageContext, "file" | "blocks" | "download">;

export interface PagesInput {
  curriculum: Curriculum;
  /** In page order (course.ts). */
  pages: readonly CoursePage[];
  /** Each page's download name under /learn/labs/, by page id (assemble.ts). */
  downloads: ReadonlyMap<string, string>;
  /** site/learn/pages/*.html. */
  templates: Templates;
  /** site/learn/erd/'s sources (erd.ts). */
  erds: ErdTexts;
  context: CourseContext;
}

/** Every Learn page this build writes. Pure. */
export function learnPages({ curriculum, pages, downloads, templates, erds, context }: PagesInput): LearnPage[] {
  const out: LearnPage[] = [
    { dir: "", page: "map", title: "Course map", main: mapMain(curriculum, templates.map) },
    ...curriculum.tracks.map((t): LearnPage => ({ dir: `${t.id}/`, page: "track", title: t.title, main: trackMain(curriculum, t, templates.track) })),
    { dir: "playground/", page: "playground", title: "Playground", main: fillSlots(templates.playground, { tables: tablesList(erds) }, "site/learn/pages/playground.html") },
    ...DRAWN_ERDS.map((n): LearnPage => ({
      dir: SCHEMA_URLS[n].slice("/learn/".length), page: "schema", title: SCHEMA_TITLES[n], main: schemaMain(n, erds, templates[`schema-${n}`]),
    })),
  ];
  for (const { page, blocks } of pages) {
    const main = renderFragment(page.html, { ...context, file: page.file, blocks: new Map(blocks.map((b) => [b.id, b])), download: downloads.get(page.id) });
    if (page.id === SETUP_PAGE) {
      out.push({ dir: "setup/", page: "module", title: "Set up your tools", main });
      continue;
    }
    const m = curriculum.modules.find((x) => x.id === page.id)!;
    out.push({ dir: moduleUrl(m).slice("/learn/".length), page: "module", title: `${m.title} (${m.id})`, main: moduleFrame(m, curriculum, main) });
  }
  return out;
}

/** A page: `main` (HTML) inside `layout`. Pure. */
export function renderPage(layout: string, style: string, bundle: BundleUrls, page: Pick<LearnPage, "page" | "title" | "main">): string {
  return fillSlots(layout, {
    title: esc(page.title),
    style,
    css: `<link rel="stylesheet" href="${esc(bundle.css)}">`,
    js: `<script type="module" src="${esc(bundle.js)}"></script>`,
    page: esc(page.page),
    main: page.main,
  }, "site/learn/layout.html");
}

const SCHEMA_TITLES = { schema: "Schema: the browser's tables", lab: "Lab schema: the PostGIS tables", star: "Star schema: what Power BI reads" };

const TEMPLATES = ["map", "track", "playground", "schema-schema", "schema-lab", "schema-star"] as const;
export type Templates = Record<(typeof TEMPLATES)[number], string>;

export async function readTemplates(): Promise<Templates> {
  const texts = await Promise.all(TEMPLATES.map((t) => readFile(new URL(`pages/${t}.html`, learnDir), "utf8")));
  return Object.fromEntries(TEMPLATES.map((t, i) => [t, texts[i]!])) as Templates;
}

/** Writes each page under `out`/learn/<dir>index.html. */
export async function writePages(out: URL, bundle: BundleUrls, pages: readonly LearnPage[]): Promise<void> {
  const [layout, style] = await Promise.all([readFile(new URL("layout.html", learnDir), "utf8"), readFile(styleSheet, "utf8")]);
  for (const p of pages) {
    const dir = new URL(`learn/${p.dir}`, out);
    await mkdir(dir, { recursive: true });
    await writeFile(new URL("index.html", dir), renderPage(layout, style, bundle, p));
  }
}
