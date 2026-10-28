// The map (/learn/) and the track pages (/learn/<track>/) (plan D12; 004 §7.1, §7.4), from curriculum.json. Pure.
// - Each module's entry (li[data-module]): id, title linked if built or "in preparation" if planned, a done tick the
//   page's script shows (site/learn/src/pages/map.ts), tool and hours badges, prerequisites.
// - The map: the tracks in order, each with its module and hour counts, inside site/learn/pages/map.html.
// - A track page adds each module's skills and questions, inside site/learn/pages/track.html.
import type { Curriculum, Module, Track } from "../../learn/course.ts";
import { esc, fillSlots } from "../html.ts";
import { badges, hoursText, moduleUrl, prerequisites } from "./module-html.ts";

/** Curriculum text (skills, questions) as HTML: escaped, `code` spans as <code>. */
export const inlineCode = (text: string) => esc(text).replace(/`([^`]+)`/g, "<code>$1</code>");

function entry(m: Module, curriculum: Curriculum, heading: "h2" | "h3", detail: boolean): string {
  const title = m.state === "built" ? `<a href="${moduleUrl(m)}">${esc(m.title)}</a>` : `${esc(m.title)} <span class="planned">in preparation</span>`;
  return [
    `<li data-module="${m.id}" data-state="${m.state}">`,
    `<${heading} class="module-title"><span class="module-id">${m.id}</span> ${title} <span class="done" hidden>✓ done</span></${heading}>`,
    badges(m),
    prerequisites(m, curriculum),
    ...(detail
      ? [`<p class="skill">Skills: ${inlineCode(m.skill)}</p>`, `<ul class="questions">${m.questions.map((q) => `<li>${inlineCode(q)}</li>`).join("")}</ul>`]
      : []),
    `</li>`,
  ].filter(Boolean).join("\n");
}

const trackModules = (curriculum: Curriculum, t: Track) => curriculum.modules.filter((m) => m.track === t.id);

/** "4 modules, 6 hours". */
function counts(modules: readonly Module[]): string {
  return `${modules.length} ${modules.length === 1 ? "module" : "modules"}, ${hoursText(modules.reduce((s, m) => s + m.hours, 0))}`;
}

/** /learn/'s main. */
export function mapMain(curriculum: Curriculum, template: string): string {
  const tracks = curriculum.tracks.map((t) => {
    const modules = trackModules(curriculum, t);
    return [
      `<section class="track" id="${t.id}">`,
      `<h2><a href="/learn/${t.id}/">${esc(t.title)}</a></h2>`,
      `<p class="track-hours">${counts(modules)}</p>`,
      `<ol class="modules">`,
      ...modules.map((m) => entry(m, curriculum, "h3", false)),
      `</ol>`,
      `</section>`,
    ].join("\n");
  });
  return fillSlots(template, { tracks: tracks.join("\n") }, "site/learn/pages/map.html");
}

/** /learn/<track>/'s main. */
export function trackMain(curriculum: Curriculum, t: Track, template: string): string {
  const modules = trackModules(curriculum, t);
  const summary = `${counts(modules)}. Work through them in order: each module lists the ones it needs first.`;
  return fillSlots(template, {
    title: esc(t.title),
    summary: esc(summary),
    modules: modules.map((m) => entry(m, curriculum, "h2", true)).join("\n"),
  }, "site/learn/pages/track.html");
}
