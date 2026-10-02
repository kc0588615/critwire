/**
 * The embed document's boot script, run in `<head>` before first paint.
 * - `<html data-mode>` from `?theme=`: `light`, `dark`, or `auto` for
 *   anything else; `embed.css` picks the palette from it.
 * - `--cw-font` from `#font=`, the host page's font as the loader read it.
 *   The fragment never reaches the server, a log or a cache key. A value
 *   is used only when it's a valid `font-family` of at most 200
 *   characters, so it can't carry other CSS.
 */
export const EMBED_BOOT_SCRIPT = `(function () {
  var root = document.documentElement;
  var mode = new URLSearchParams(location.search).get('theme');
  root.dataset.mode = mode === 'light' || mode === 'dark' ? mode : 'auto';
  var font = new URLSearchParams(location.hash.slice(1)).get('font');
  if (font && font.length <= 200 && CSS.supports('font-family', font)) {
    root.style.setProperty('--cw-font', font);
  }
})();`
