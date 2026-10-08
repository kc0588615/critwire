# Embedding critwire on your site

A studio pastes one `<script>` tag into its own site and gets the
game's feedback board or its updates there, in the game's colours and
the page's font. The embed is the **Embed** tab of the "Put critwire
on your site" panel (`docs/share.md`), which builds the snippets and
shows a live preview.

There's no build step, no account on the host site and no API key.

Code: the loader `public/embed/v1.js`, the widgets under
`src/app/(embed)/` and `src/components/embed/`, the helpers in
`src/lib/embed/` (snippets, protocol, cache headers, theme,
platforms), and the feeds in `src/lib/game-portal/feeds.ts`.

## The widgets

- **Board** (`/g/<game>/embed/board`): the public feedback items with
  their votes, ten at a time, with a stage filter (All plus the four
  public stages, each with its count) and a type filter (All, Bugs
  and, when the game takes ideas, Ideas). Filters switch instantly,
  with no request and no change to the host page's address or history.
  Past ten items, "See all N" opens the portal's list for the same
  filter. "Report a bug" and "Suggest an idea" open the portal's form.
- **Updates** (`/g/<game>/embed/updates`): the three latest updates,
  each with its version, date, summary and up to five "From your
  feedback" items ("More in this update" past five), then "All
  updates" and RSS.
- **Floating button**: a "Feedback" button in the page's bottom-right
  corner that opens the board in a dialog. Escape or Close shuts it,
  and focus returns to the button.

Every link opens the game's portal page in a new tab, tagged
`?ref=embed`, so arrivals count under "Embed" in "Where players come
from"; only "Powered by Critwire" leads elsewhere, to critwire's
repository. The
embed contains no forms and no images, and downloads no font file.

## The snippets

```html
<script src="https://critwire.example/embed/v1.js" data-game="critter-connect" data-widget="board" data-theme="auto" async></script>
```

The script frames the widget right where the tag sits; for the
floating button, anywhere in the page works.

| Attribute | Values | Default |
| --- | --- | --- |
| `data-game` | The game's slug. Required: without it the loader logs an error to the console and adds nothing. | — |
| `data-widget` | `board`, `updates` or `button` | `board` |
| `data-theme` | `auto` (follows the visitor's light or dark setting), `light` or `dark` | `auto` |
| `data-stage` | The board's first stage filter: `under-review`, `planned`, `in-progress` or `shipped` | All |
| `data-type` | The board's first type filter: `bug` or `idea` | All |

Unknown `data-stage` and `data-type` values are ignored (the board
shows All). An unknown `data-widget` logs an error and adds nothing.

### The iframe only

Where a site builder takes no scripts (Wix), paste the iframe or its
URL instead. The Embed tab gives both for the board and updates:

```html
<iframe src="https://critwire.example/g/critter-connect/embed/board?theme=auto" title="Feedback" loading="lazy" style="width:100%;height:600px;border:0"></iframe>
```

A bare iframe can't resize to its content, so it has a fixed height
(600 px in the snippet; change it to suit). The floating button needs
the script. `?theme=`, `?stage=` and `?type=` work as the attributes
do.

## Modes and fonts

- **Mode:** the game's own palette serves the scheme it was made for
  (dark or light). The other scheme is a neutral palette in the game's
  accent colour, or the neutral accent where the game's wouldn't read
  on it. `auto` follows the visitor's setting live. The neutral
  palettes are the theme's own neutrals (`src/lib/theme/tokens.ts`):
  white in light, Critter Connect's dark teal `#051411` in dark. A game
  on the default palette (cc dark) gets cc light and cc dark as they
  are, as its portal does.
- **The loader's own pieces:** the floating button and its dialog sit
  on the host page, so they don't take the game's colours. They're
  white with black text in light and dark teal `#051411` with white
  text in dark (cc's neutral-1 and neutral-10), flat with no shadow.
  The button is a full pill padded 24 px at the sides, with a thin
  translucent grey edge, which shows on any page background; the
  dialog has a 22 px radius and 24 px padding, and 12 px under Close.
- **Font:** the widget uses the font the host page gives its own
  iframe (`font-family: inherit`). Web fonts the host page loads
  (Google Fonts, `@font-face`) don't exist inside an iframe, so the
  next font in the page's stack applies, or the generic family
  (`serif`, `sans-serif`). System font stacks match exactly. Without
  the script, the widget uses `system-ui, sans-serif`.

## Voting

The embed itself can't vote. Its vote link ("▲ 12") opens the item's
page on critwire in a small popup, or a new tab where popups are
blocked, and the player votes there with the portal's own Upvote
button.

- **One vote per browser per item,** across the portal and every site
  that embeds the game. The portal's vote cookie is the only record:
  a player who already voted on the portal sees "Upvoted" in the
  popup, and voting again from the embed adds nothing.
- **No site can vote for a player.** The vote happens on critwire's
  own page, which no site can frame, and only after the player clicks
  there. `/api/vote` accepts nothing from other sites.
- **"Voted"** on the embed's row, with the new count, appears straight
  away when the popup can report back to the embed. It's best effort,
  and only for that page view. It needs the popup, because a tab
  opened where popups are blocked can't report back, and a host page
  without a strict `Cross-Origin-Opener-Policy` of its own. After a
  reload, the row shows the cached count (see Caching).
- **Sandboxed frames:** some builders put pasted code in a sandboxed
  iframe. Without `allow-popups`, the vote popup and the embed's links
  can't open there.

## Caching

The widgets and both JSON feeds send
`Cache-Control: public, max-age=60, s-maxage=240`, their empty and 404
answers included, and keep no copy on the server:

- a shared cache in front (Cloudflare) keeps a copy at most 4 minutes,
  then a browser at most 1 minute more;
- so every visitor sees a version at most **5 minutes** old: votes,
  edits to items and updates, a held game and a suspended studio alike;
- a vote clears no cache, but the voter sees "Voted" at once (see
  Voting).

The loader, `/embed/v1.js`, is cached a day
(`public, max-age=86400, s-maxage=86400`). The Cloudflare rule that
caches embeds and feeds is in `docs/deploy.md`.

**A held game or a suspended studio** gets an empty embed with no text
and no theme, which shrinks to nothing on the host page, and a 404 from
both feeds. An unknown game looks the same, so the embed never tells
the two apart.

## The JSON feeds

Two public feeds per game, readable from any site
(`Access-Control-Allow-Origin: *`) and never with credentials. They
contain only what the portal shows: public stages, never internal
statuses, categories, studios' notes, private reports or emails. An
unknown, held or suspended game answers `404 {"error":"Not found."}`.

**Stability:** both are contracts. Fields may be added, but never
removed, renamed or retyped; anything incompatible gets a new URL
(`feedback.v2.json`).

### `/g/<game>/updates.json`

[JSON Feed 1.1](https://jsonfeed.org/version/1.1), served as
`application/feed+json; charset=utf-8`: the 20 newest published
updates, as in the RSS feed.

```json
{ "version": "https://jsonfeed.org/version/1.1",
  "title": "Critter Connect — Updates",
  "home_page_url": "https://critwire.example/g/critter-connect/updates",
  "feed_url": "https://critwire.example/g/critter-connect/updates.json",
  "description": "The latest updates for Critter Connect.", "language": "en",
  "items": [{ "id": "42", "url": "https://critwire.example/g/critter-connect/updates/harbor-hotfix",
              "title": "v1.4 — Harbor hotfix", "summary": "…",
              "content_text": "…", "date_published": "2026-10-01T12:00:00.000Z" }] }
```

- `id` is the update's database ID, so it survives a slug change.
- `summary` is left out when the update has none; `content_text` is
  the summary, or the title.

### `/g/<game>/feedback.json`

Contract version 1, served as `application/json; charset=utf-8`.

```json
{ "version": 1, "title": "Critter Connect feedback",
  "home_page_url": "https://critwire.example/g/critter-connect/feedback",
  "feed_url": "https://critwire.example/g/critter-connect/feedback.json",
  "items": [{ "id": "123", "url": "https://critwire.example/g/critter-connect/feedback/map-crash",
              "title": "Crash when opening the map", "summary": null,
              "type": "bug", "stage": "shipped", "votes": 12,
              "date_created": "2026-09-20T09:30:00.000Z",
              "shipped_in": { "version": "v1.4", "title": "Harbor hotfix",
                              "url": "https://critwire.example/g/critter-connect/updates/harbor-hotfix" } }] }
```

- `type` is `bug` or `idea`.
- `stage` is `under-review`, `planned`, `in-progress` or `shipped`.
- `shipped_in` is `null`, or the published update that shipped the
  item; its `version` may be `null`.
- Every item has every key, `null` when empty.
- Items are the public, non-archived ones: pinned first, then by
  votes, then newest. The feed holds at most **500**; the portal's
  list has the rest.

## Privacy

- **No cookies.** The loader and the widgets set none, and the loader
  keeps nothing in the browser's storage. If the instance's Cloudflare
  zone has Bot Fight Mode on, Cloudflare may add its own `__cf_bm`
  cookie.
- **Nothing read from the host page** but the font its own iframe
  inherits. The font travels in the iframe address's `#` part, which
  stays in the browser: it never reaches the server, its logs or a
  cache.
- The loader makes no requests of its own and leaves no globals
  behind.
- Votes keep the portal's model (`docs/patterns.md`, Voting model);
  the embed adds no tracking.

## "Powered by Critwire"

Each embed ends with a muted "Powered by Critwire" line, linking to
critwire's repository (`CRITWIRE_REPO_URL` in `src/lib/hosting.ts`),
since `/` is the site's own game. It follows the portal footer's rule:

- the hosted instance (`CRITWIRE_OPEN_SIGNUP=1`) always shows it;
- a self-hosted instance hides it, in the embeds and the portal footer
  alike, with `CRITWIRE_HIDE_POWERED_BY=1`. Any other non-empty value,
  or `1` together with open signup, stops the server at startup.

## Protocol v1

The loader and the widget talk through `postMessage`. Every message
has `critwire: 1`. The loader accepts a message only from its own
iframe, from the instance's origin.

| From → to | Message | Sent to |
| --- | --- | --- |
| widget → loader | `{ critwire: 1, type: 'resize', height }`, whenever the widget's height changes | `'*'`: the host can be any site, and it carries only a height |
| widget → loader | `{ critwire: 1, type: 'close' }`, on Escape (closes the floating button's dialog) | `'*'` |
| item page → widget | `{ critwire: 1, type: 'vote', issueId, votes, voted }`, after a vote or a withdrawal | The page's own origin, so only a critwire embed receives it |

The loader clamps heights to 0–20,000 px. The floating button's dialog
keeps a fixed height and scrolls.

**Versioning:** `v1.js` and protocol 1 may only gain optional
attributes and new message types. Anything incompatible ships as
`/embed/v2.js`, and the widgets keep answering v1 for good. The loader
stays under 5 KB gzipped, with no cookies, storage or requests:
`tests/int/embed-loader` checks it, and `pnpm build` runs that test
first (`prebuild`).

## What works where

"Should work" means the snippet follows the platform's documented
format but hasn't been tried there yet.

| Where | What works | Where to paste |
| --- | --- | --- |
| Your own site | The script | Where the widget goes; the floating button can go anywhere |
| Carrd (Pro Standard and up) | The script (should work) | An Embed element, type Code |
| Ghost | The script (should work) | An HTML card |
| WordPress (self-hosted) | The script (should work) | A Custom HTML block |
| WordPress.com (paid plans) | The script (should work) | A Custom HTML block |
| Framer | The script (should work) | An Embed, HTML |
| Webflow (paid plans) | The script (should work) | A Code Embed element |
| Squarespace (Core and up) | The script (should work) | A Code block |
| Wix | The iframe only (should work) | Embed Code → Embed a site, then paste the URL and give it a height. No floating button. |
| itch.io, Steam, Linktree, Carrd (free and Pro Lite) | Use the link kit and the badge instead (`docs/share.md`) | — |

The Embed tab shows the same instructions, from `EMBED_PLATFORMS` in
`src/lib/embed/platforms.ts`; change both together.
