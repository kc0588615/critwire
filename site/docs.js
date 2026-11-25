// The docs page (dist/index.html)'s script: a plain ES module, inlined through the template's script slot (scripts/build/docs.ts), with
// no dependencies. Progressive enhancement only: the page is complete without it (plan 2026-11-25-critwire-web-modernize
// §4): copy buttons, then the section index that follows the reader.

// Copy buttons (copy-button guide). Only where the Async Clipboard API exists (D2): elsewhere every button could only fail.
// Each code sample's <pre> is wrapped in div.example, with the button and its status after the <pre>, outside both <pre>
// and <code>: e2e/duckdb.spec.ts and range-listings.spec.ts run the <code>'s textContent.
const timers = new WeakMap();
let lastMessage = "";

// Shows the outcome in the button's status, which is both the visible bubble and the live region; clears it after 2 s.
// A message equal to the last one gets a no-break space, so screen readers announce it again. Never disables the button.
function report(button, ok) {
  const status = button.nextElementSibling;
  clearTimeout(timers.get(button));
  button.removeAttribute("data-copied");
  button.removeAttribute("data-failed");
  let message = ok ? "Copied" : "Copy failed";
  if (message === lastMessage) message += " ";
  lastMessage = message;
  button.setAttribute(ok ? "data-copied" : "data-failed", "");
  status.textContent = message;
  timers.set(button, setTimeout(() => {
    button.removeAttribute("data-copied");
    button.removeAttribute("data-failed");
    status.textContent = "";
  }, 2000));
}

// textContent, not innerText (D3): a <code> in a <pre> has literal newlines only, and it's what the e2e specs run.
async function copy(button, code) {
  try {
    await navigator.clipboard.writeText(code.textContent);
    report(button, true);
  } catch {
    report(button, false); // a refused write (denied permission) is shown and announced too
  }
}

if (navigator.clipboard?.writeText) {
  for (const code of document.querySelectorAll("pre > code")) {
    const pre = code.parentElement;
    const example = document.createElement("div");
    example.className = "example";
    const ui = document.createElement("span");
    ui.className = "copy";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Copy"; // the visible text is the accessible name: no aria-label
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    ui.append(button, status);
    pre.before(example);
    example.append(pre, ui);
  }
  // One wiring path for every browser (D10): Enter and Space reach it as the button's native click.
  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest(".copy button") : null;
    if (button) copy(button, button.closest(".example").querySelector("pre > code"));
  });
}

// Section index that follows the reader (scrollspy guide). The highlight is CSS (`:is(:target-current, .target-current)`);
// this mirrors it in aria-current, which :target-current doesn't expose, and keeps the current chip in view at 375 px.
const nav = document.querySelector("nav.toc");
const row = nav.querySelector("ul");
const links = [...nav.querySelectorAll('a[href^="#"]')];
let current;

// Scrolls only the chip row, never the page (no scrollIntoView, which moves every ancestor), and only when `link` isn't
// fully inside the row's box minus its scroll-padding (the fade's size where the fade runs, else 0). Always instant: a
// short sideways nudge after the page has stopped. Physical sides, so it holds in either direction.
function reveal(link) {
  if (row.scrollWidth <= row.clientWidth) return;
  const style = getComputedStyle(row);
  const box = row.getBoundingClientRect();
  const chip = link.getBoundingClientRect();
  const left = box.left + (parseFloat(style.scrollPaddingLeft) || 0);
  const right = box.right - (parseFloat(style.scrollPaddingRight) || 0);
  const delta = chip.left < left ? chip.left - left : chip.right > right ? chip.right - right : 0;
  if (delta) row.scrollTo({ left: row.scrollLeft + delta, behavior: "instant" });
}

// Marks `link` (or none) as the current section and reveals its chip; nothing when it already is.
function setCurrent(link) {
  if (link === current) return;
  current = link;
  for (const a of links) {
    if (a === link) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  }
  if (link) reveal(link);
}

// `fn` once, 100 ms after the last call (performance guide: debounce).
function debounce(fn) {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, 100);
  };
}

// A resize can make the chip row overflow (wide to narrow) without a change of section, which setCurrent skips: reveal
// the current chip once the window settles. Both paths; the fallback's own resize update runs first (registered first).
const revealCurrent = debounce(() => current && reveal(current));

if (CSS.supports("scroll-target-group: auto")) {
  // Native (Chromium 140+): the browser tracks the target; mirror it at start, after load and once scrolling stops.
  // Chromium updates :target-current while rendering a frame, after rAF callbacks: at module run and at load it still
  // matches nothing, and at an instant jump's scrollend it can still name the old section. So each sync runs in a task
  // queued from the next frame.
  const sync = () => requestAnimationFrame(() => setTimeout(() => setCurrent(nav.querySelector("a:target-current"))));
  sync();
  document.addEventListener("scrollend", sync);
  addEventListener("load", sync);
  document.addEventListener("toggle", sync, true); // a <details> moves the sections without a scroll (captured: no bubbling)
} else {
  // Fallback (D9): the section at the anchor landing line, not the guide's -50% observer band, which picks the wrong
  // section in tall windows. scroll-padding-top is where the browser lands an anchor, below the sticky chip row; it is
  // read on every run, so the 60rem layout switch needs nothing extra.
  const root = document.documentElement;
  const sections = links.map((a) => {
    const section = document.getElementById(a.hash.slice(1));
    if (!section) throw new Error(`docs.js: no section for ${a.hash}`);
    return section;
  });
  const at = () => {
    if (scrollY + root.clientHeight >= root.scrollHeight - 2) return sections.length - 1; // the page end: the last one
    const line = (parseFloat(getComputedStyle(root).scrollPaddingTop) || 0) + 2; // 2 px of sub-pixel slack
    let i = 0; // the header is still in view: the first one
    sections.forEach((section, j) => {
      if (section.getBoundingClientRect().top <= line) i = j;
    });
    return i;
  };
  const update = () => {
    const link = links[at()];
    for (const a of links) a.classList.toggle("target-current", a === link);
    setCurrent(link);
  };
  // Once, 100 ms after the last scroll or resize: a smooth jump updates when it stops.
  const later = debounce(update);
  update();
  addEventListener("scroll", later, { passive: true });
  addEventListener("resize", later, { passive: true });
  // A <details> opening or closing moves the sections without a scroll. toggle doesn't bubble: capture it on document.
  document.addEventListener("toggle", later, true);
}

addEventListener("resize", revealCurrent, { passive: true });
