# Putting critwire on your site

Each game has a "Put critwire on your site" panel: the game's **Share**
tab in the admin, also shown inline on the welcome page after
onboarding (`/g/<game>?welcome=1`). It gives links, button images and a
live badge, with snippets ready to paste for the place you pick. It
links out to the pages a studio already has; it never replaces them.

The panel has up to three tabs: **Links and buttons** (the default,
this page), **Embed** (below, and `docs/embed.md`) and, when the
instance has Discord set up, **Discord** (below, and
`docs/discord.md`).

Code: `src/lib/share/` (the kit, buttons, badge and image renderer),
`src/components/share/` (the panel) and
`src/components/admin/share/` (the Share tab).

## What's in the kit

Pick where you'll put it (Steam, itch.io, Carrd, Linktree, your website
or a README). The panel then shows:

- **Links**, each with a copy button: the hub (`/g/<game>`), the
  feedback list (`/g/<game>/feedback`), the roadmap
  (`/g/<game>/roadmap`), updates (`/g/<game>/updates`) and the RSS feed
  (`/g/<game>/updates/feed.xml`). `/roadmap` is a friendly alias: a 307
  redirect to the board (`/g/<game>/feedback?view=board`) that keeps
  the query string, `ref` included.
- **Buttons**: "Give feedback" (to the feedback list), "Roadmap" (to
  the board) and "What's new" (to updates), in light or dark. Each has
  its snippets and both image URLs.
- **Live badge**: linking to the board, with its snippets and image
  URLs.

Snippets are HTML (`<a href><img src alt></a>`), Markdown
(`[![alt](src)](href)`) or Steam BBCode (`[url=href]text[/url]`),
depending on what the place accepts. Snippets use the SVG, which stays
crisp at any size; the PNG URLs are listed for builders that only take
uploads. Every URL is absolute, on the instance's
`NEXT_PUBLIC_SERVER_URL`.

### Button images

Twelve fixed files: `/buttons/<button>-<scheme>.<format>`, where
`<button>` is `give-feedback`, `roadmap` or `whats-new`, `<scheme>` is
`light` or `dark`, and `<format>` is `svg` or `png`. For example
`/buttons/give-feedback-dark.png`.

- They're the same for every game, in Critwire's colours: light suits
  light pages, dark suits dark ones.
- The PNG is drawn at twice the SVG's size, for sharp screens.
- They're cached for a day (`Cache-Control: public, max-age=86400,
  s-maxage=86400`). Any other file name is a 404.

### The live badge

`/g/<game>/badge.svg` and `/g/<game>/badge.png` have two halves. The
first reads `feedback`; the second gives the number of public items in
each public stage, then the latest update's version, for example
`12 under review · 3 planned · v1.4`.

- Only public items count, by their public stage. Private and archived
  items, and internal statuses, never show. With no public feedback it
  reads `no feedback yet`.
- The version is the newest published update's version label, cut to
  24 characters. Updates without one are skipped.
- It follows the game's theme: its accent, surface, text and border
  colours, and its corner shape.
- **Caching:** every answer is cached for 5 minutes (`max-age=300,
  s-maxage=300`), so a new item, a hold or a suspension shows within
  that. A badge URL with a query string (`?v=2`) gets a 308 to the bare
  URL, so each game and format has one cache entry.
- **The neutral image:** an unknown game, a held game and a suspended
  studio's game all get the same grey image, `feedback` /
  `unavailable`, with status 200. A host page never shows a broken
  image, and the badge never reveals whether a game exists.

Text in the buttons and the badge is drawn as shapes (DejaVu Sans), so
it looks the same everywhere, with or without fonts installed.

## The Embed tab

The board, the updates or the floating button, on the studio's own
site (`docs/embed.md`). Pick a **Widget** (Board, Updates or Floating
button) and a **Mode** (Auto, Light or Dark). The tab then shows:

- the script snippet, with a copy button;
- for Board and Updates, also the iframe snippet and the bare URL, for
  builders that take no scripts (Wix's "Embed a site");
- a live preview of the widget at a fixed 520 px height (the floating
  button previews the board it opens);
- "Where it works": per-platform instructions, grouped by what each
  place takes (the script, the iframe, or links instead), from
  `EMBED_PLATFORMS` in `src/lib/embed/platforms.ts`.

Only the selected tab loads, so the preview loads only when shown.

## The Discord tab

Shown only when the instance sets the three `DISCORD_*` variables
(`docs/discord.md`). **Add critwire to your Discord** sends the studio
to Discord's own screen, where it picks the server and the channel
critwire posts in, then back to this tab. One authorization installs
`/feedback` and Send to critwire in that server and links the server
to the game.

- **Not linked:** what players and moderators can do, the button, and
  what Discord will ask for (Manage Server and Manage Webhooks).
- **Linked:** "Linked to your Discord server", **Open the posts
  channel**, how posts are timed, how several games share a server,
  **Add critwire again** (to change the channel) and **Disconnect**.
  When the webhook was deleted in Discord, the tab says posts are off.
- **On the welcome page** the tab can't show the link: it offers the
  button and points to the admin's Share tab.
- Coming back from Discord, `?discord=linked`, `cancelled` or `failed`
  selects the tab and says what happened.

Links in Discord posts and replies carry `?ref=discord`, counted under
"Discord" in "Where players come from".

## Where players come from

Every kit link except RSS carries `?ref=<place>`: `steam`, `itch`,
`carrd`, `linktree`, `website` or `readme`. The embed's links carry
`?ref=embed`, counted under "Embed", and links in Discord posts and
replies carry `?ref=discord`, counted under "Discord". The game's Share tab shows
the last 30 days (UTC) under "Where players come from": a row per day
with visits and a column per place, plus totals.

How a visit is counted:

- A player arrives at any page of the game's portal through a tagged
  link. A small script on the page removes `ref` from the address and
  sends one `POST /api/referrals`. The page itself is unchanged and
  still served from the cache.
- Each arrival counts once. A reload, back and forward, or a copied
  address no longer has `ref`, so it doesn't count again. Following a
  tagged link again does.
- `ref` values outside the list above are ignored and stay in the
  address.
- Only counts are stored, per game, per day and per place: no
  addresses, cookies or anything about the player. They live in
  Upstash Redis and never touch the database.

Limits, so read the counts as a guide:

- **Tags come from links.** Anyone can add or remove `?ref=`, and a
  link shared on from your Steam page still says `steam`.
- **Players without JavaScript**, and arrivals at the RSS feed, aren't
  counted.
- **Rate limit:** 60 counts a minute per IP address and game. Until
  nginx passes the player's address from Cloudflare (see "Known
  limitation" in `docs/deploy.md`), every player behind one Cloudflare
  edge shares that budget, so a busy period can undercount.
- **Off without Upstash.** A self-hosted instance without Upstash Redis
  doesn't count, and the Share tab says so. Everything else in the kit
  works. Use one Upstash database per instance: the keys aren't
  namespaced (`docs/integrations.md`).

## Steam

Steam doesn't allow outside links in a store page's description. Use:

- **The store page's Website field** (Steamworks → your app → Store
  page admin): paste the hub link. It carries `?ref=steam`; that should
  work, but hasn't been tried yet.
- **Announcements and events:** paste the BBCode snippets. They're text
  links, because outside images in announcements are unverified.

## What works where

"Should work" means the snippet follows the platform's documented
format but hasn't been tried on it yet.

| Place | Links | Button images | Live badge | Where to paste |
| --- | --- | --- | --- | --- |
| Steam store page | The hub link only, should work | No | No | Store page admin → Website field |
| Steam announcements | Yes, as BBCode text links (should work) | No | No | The announcement's body |
| itch.io | Yes | Should work (HTML or Markdown snippet) | Should work | Edit game → Description |
| Carrd (free plan) | Yes, on a Button element | Upload the PNG to an Image element and give it the link | No: an upload is a snapshot | Button and Image elements |
| Carrd Pro | Yes | Yes, HTML snippet (should work) | Should work | An Embed element |
| Linktree | Yes, one link each | Only as a link's thumbnail (upload the PNG) | No | Add link |
| A README | Yes | Yes, Markdown snippet (should work) | Should work | The README file |
| Your own site | Yes | Yes, HTML snippet | Yes | Anywhere in your HTML |
| Discord | Through the Discord tab: `/feedback`, Send to critwire, and posts with links (`docs/discord.md`); not tried on the real Discord yet | No | No | The Discord tab: Add critwire to your Discord |

The badge is live only where the page loads it from your instance's
URL. Where a platform makes you upload an image, the upload is a copy
that won't change.
