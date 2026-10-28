// Moving between Learn pages without a full load (plan D11 "one start per visit"; 004 §7.2): a click on a same-origin
// Learn page (/learn/…/, not /learn/data/ or /learn/assets/, and no file such as .svg or .sql) fetches it, swaps its
// <main> in, takes its title and <body data-page>, pushes the URL, focuses the <h1> and announces the page in
// #nav-status; Back and Forward (popstate) swap the same way. `onSwap` then runs the new page's init, so the running
// database stays. Any failure (a non-2xx answer, no <main>, a network error) loads the page in full instead.
const LEARN_PAGE = /^\/learn\/(?!data\/|assets\/)([a-z0-9-]+\/)*$/;

export const isLearnPage = (url: URL) => url.origin === location.origin && LEARN_PAGE.test(url.pathname);

function learnLink(e: MouseEvent): URL | undefined {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return undefined;
  const a = (e.target as Element | null)?.closest?.("a[href]");
  if (!(a instanceof HTMLAnchorElement) || a.target || a.hasAttribute("download")) return undefined;
  const url = new URL(a.href);
  if (!isLearnPage(url)) return undefined;
  // A link within this page only scrolls.
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return undefined;
  return url;
}

export function installNav(onSwap: () => void): void {
  let latest = 0; // a swap overtaken by a newer click mustn't land

  async function swap(url: URL, push: boolean): Promise<void> {
    const me = ++latest;
    try {
      const response = await fetch(url, { headers: { Accept: "text/html" } });
      if (!response.ok) throw new Error(`${url.pathname} answered ${response.status}`);
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const main = doc.querySelector("main");
      if (!main || doc.body.dataset.page === undefined) throw new Error(`${url.pathname} is no Learn page`);
      if (me !== latest) return;
      if (push) history.pushState(null, "", url);
      document.querySelector("main")!.replaceWith(main);
      document.title = doc.title;
      document.body.dataset.page = doc.body.dataset.page;
      const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
      if (target) target.scrollIntoView();
      else window.scrollTo(0, 0);
      const h1 = main.querySelector("h1");
      if (h1) {
        h1.tabIndex = -1;
        h1.focus({ preventScroll: Boolean(target) });
      }
      document.getElementById("nav-status")!.textContent = doc.title;
      onSwap();
    } catch {
      if (me === latest) location.assign(url);
    }
  }

  document.addEventListener("click", (e) => {
    const url = learnLink(e);
    if (!url) return;
    e.preventDefault();
    void swap(url, true);
  });
  window.addEventListener("popstate", () => void swap(new URL(location.href), false));
}
