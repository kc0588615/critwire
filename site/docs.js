// The docs page (dist/index.html)'s script: a plain ES module, inlined through the template's script slot (scripts/build/docs.ts), with
// no dependencies. Progressive enhancement only: the page is complete without it (plan 2026-11-25-critwire-web-modernize
// §4). Copy buttons here; the section index that follows the reader comes in S6.

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
