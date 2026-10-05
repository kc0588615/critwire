# Discord

Players send feedback from a studio's Discord server, and the server
hears back when an update ships or an item moves. It all runs through
Discord's HTTP interactions and webhooks: there's no bot user, no bot
token and no always-on process.

Code: `src/lib/discord/` (configuration, signatures, interactions,
commands, OAuth, the game's link, posts, webhooks), the three routes
under `src/app/api/discord/`, the post tasks in `src/jobs/discord.ts`,
the post log `src/collections/DiscordPosts.ts`, and the tab in
`src/components/share/DiscordKit.tsx`.

## What it does

- **Players** type `/feedback` and pick Bug or Idea. Discord opens a
  form: a title and the details, plus platform and game version for
  bugs. The report reaches the game's review queue like one from the
  web form, through the same content filter and the game's "review
  before public" setting (on by default). The player gets a private
  reply with a link to the board.
- **Moderators** right-click a player's message, then **Apps → Send to
  critwire**. A form opens, prefilled with the message: they pick Bug
  or Idea, edit the title and details, and send. The report is
  credited to the message's author. Only members with Manage Messages
  (or Administrator) in that channel can use it.
- **Posts:** critwire posts in a channel the studio chooses when an
  update is published, and when a feedback item reaches Planned, In
  progress or Shipped. Each post links to the update or the item on
  the portal.
- **Privacy:** a report keeps the Discord username and user ID for the
  studio, never shown publicly. Every reply from critwire is visible
  only to the person who used the command, and no post or reply can
  ping `@everyone` or anyone else.
- **No voting from Discord.** A Discord account would be a second
  vote for the same person. Players vote on the portal.
- **Terms notice and sensitive-info warning:** `/feedback`'s
  description says that sending accepts critwire's Terms and Privacy
  Policy, every text field in both forms carries the warning "Don’t
  include passwords, keys, tokens, payment or health details, or
  anything sensitive.", and both confirmations end with the web form's
  notice, linking the Terms of Service and the Privacy Policy. Discord
  allows 100 characters in a field's description and a command's, so
  Discord shows this shorter warning, not the web forms' full sentence;
  the copy lives in `src/lib/legal/copy.ts`, shared with the web.

When a server has several of a studio's games, the form starts with a
**Game** select. Only games that are public and take that kind of
report are listed, by name, at most 25.

## Setting it up as a studio

1. In the admin, open the game, then its **Share** tab → **Discord**.
   (The welcome page after onboarding shows the same tab.)
2. Click **Add critwire to your Discord**. Discord asks which server
   to add critwire to and which channel it posts in. You need Manage
   Server and Manage Webhooks on that server.
3. Authorize. You come back to the Share tab, which says the game is
   linked and offers **Open the posts channel**.

That one authorization installs the commands, links the server to the
game, and creates the webhook critwire posts through.

- **Several games:** add critwire from each game's Share tab and pick
  the same server. Each game posts to its own channel, and
  `/feedback` asks players which game.
- **Changing the channel:** click **Add critwire again** and pick
  another channel (critwire deletes the old webhook), or move the
  webhook in Discord: Server Settings → Integrations → Webhooks. Moving
  it keeps its URL, so nothing changes on critwire.
- **Disconnect** unlinks the game and deletes its webhook. Posts and
  `/feedback` stop for that game. The commands stay in the server
  until you remove critwire in Server Settings → Integrations.
- **Who can use Send to critwire:** Discord shows it only to members
  with Manage Messages by default. A server admin can change that in
  Server Settings → Integrations → critwire, but critwire still checks
  Manage Messages or Administrator on every use.

## What gets posted, and when

| Event | Posted | Not posted |
| --- | --- | --- |
| An update becomes visible: published, or a held update approved by a super admin | Once per update, ever | Drafts, edits to a published update, a republish of an update already posted |
| A public feedback item's public stage changes to Planned, In progress or Shipped | Once per stage change | New items, private items, moves to Under review or out of the board, moves within one stage, kanban reordering |

- **Timing:** a post waits a minute. A later change to the same update
  or item replaces the waiting post and starts the minute again, so
  quick changes become one post. The queue runs every minute, so a
  post goes out one to two minutes after the last change.
- **The post says what's true when it's sent:** a stage post names the
  item's stage at that moment. If an item moves Planned → In progress
  → Planned within the minute, and Planned was already posted, nothing
  is posted.
- **Never posted:** held updates, held games, suspended studios'
  games, and private items. The post job reads the update or item as
  an anonymous visitor would, so whatever the portal hides, Discord
  never hears about.
- **What a post looks like:** one embed with the game's name, the
  update's title (with its version) and summary, or the item's title
  and "Now planned", "Now in progress" or "Shipped". The link carries
  `?ref=discord`, so visits count under "Where players come from"
  (`docs/share.md`). Posts never name who reported an item.
- **A webhook deleted in Discord** turns the game's posts off: critwire
  clears the channel and webhook and keeps the server link, so
  `/feedback` still works. The Share tab says "Posts are off"; add
  critwire again to choose a channel.

## What's stored and who sees it

- **On the game** (`GameProject.discord`): the server ID, the channel
  ID and the webhook URL. The studio's members can read them; only the
  "Add critwire" flow, Disconnect and a super admin write them, so a
  studio can't link a server through the API. The admin shows them
  read-only in the sidebar while linked.
- **On a report** (`IssueReport.discord`): the sender's Discord user ID
  and username (for Send to critwire, the message's author) and, for
  imports, a link to the message. The studio sees them read-only in
  the submission's sidebar. They're never public: submissions aren't
  public, and publishing one copies only its title, description, type
  and category to the item. A fourth field, the interaction's ID, is
  super-admin only; it makes a replayed request create nothing.
- **The post log** (`discord-posts`): which updates and stages were
  posted, per game. Super admins only.
- **Not stored:** message text beyond what the report holds, the
  studio's Discord access token (discarded after the authorization),
  and anything about players who only read posts.
- **Logs** record the interaction type, the server, game and report
  IDs, and durations; never usernames, tokens or message text.

## Self-hosting, step by step

Discord is optional. With none of the three variables set, nothing
about Discord shows and the routes answer 404. You need a public HTTPS
address: Discord must reach your instance.

1. **Create the application.** Open
   <https://discord.com/developers/applications> → **New Application**,
   name it (players see this name), and accept the terms.
2. **General Information:** copy the **Application ID** and the
   **Public Key**. Add an icon and a description if you like.
3. **OAuth2:**
   - **Reset Secret**, then copy the **Client Secret**. Discord shows
     it once.
   - Under **Redirects**, add `<site>/api/discord/callback`, where
     `<site>` is your `NEXT_PUBLIC_SERVER_URL` exactly (for example
     `https://feedback.example.com/api/discord/callback`), then
     **Save Changes**.
4. **Installation:** under Installation Contexts, tick **Guild
   Install** only, and set **Install Link** to **None**. Studios add
   critwire from the Share tab, which links their game.
5. **Bot:** leave the privileged gateway intents off and **Requires
   OAuth2 Code Grant** off. Keep **Public Bot** on if studios other
   than yours will add the app; with it off, only you can.
6. **Set the variables** in your `.env`, then restart the app:
   ```
   DISCORD_APPLICATION_ID=<Application ID>
   DISCORD_PUBLIC_KEY=<Public Key>
   DISCORD_CLIENT_SECRET=<Client Secret>
   ```
   All three or none: a partial or malformed set stops the server at
   startup, naming the variable. At startup the app registers
   `/feedback` and Send to critwire with Discord, and the log shows
   `Discord commands registered`.
7. **Set the Interactions Endpoint URL.** Back in General Information,
   set it to `<site>/api/discord/interactions` and **Save Changes**.
   Discord checks it straight away, with one valid and one invalid
   signed request; saving fails unless the app is running with the
   right public key.
8. **Cloudflare:** Discord's requests come from its servers, not a
   browser, so they can't pass a challenge. If Bot Fight Mode or a
   WAF or challenge rule covers your site, add a rule that skips it
   for the path `/api/discord/interactions`. (Super Bot Fight Mode can
   skip a path with a WAF custom rule; the free plan's Bot Fight Mode
   can't, so turn it off.)
9. **Check that it works:**
   - In a game's Share tab, open **Discord** → **Add critwire to your
     Discord**, pick a test server and a channel.
   - In that server, run `/feedback` for a bug and an idea; both
     appear under Submissions in the admin.
   - Right-click a message → Apps → Send to critwire, as a member with
     Manage Messages, then as one without (refused).
   - Publish an update and wait about two minutes for the post.

The app's server clock must be NTP-synced: requests whose timestamp is
more than 5 minutes off are refused.

## Troubleshooting

- **The endpoint URL won't save.** Discord couldn't reach it, or it
  answered wrongly.
  - The app must be running with the three variables set (otherwise
    the route answers 404), and `DISCORD_PUBLIC_KEY` must be this
    application's.
  - `<site>` must be your public HTTPS address, reachable from the
    internet.
  - Cloudflare must not challenge the path (step 8).
  - A clock more than 5 minutes off refuses every request.
- **`/feedback` is missing.**
  - Look for `Discord commands registered` in the log after startup.
    A network error, a 429 or a Discord outage logs
    `Discord command registration failed; retrying` and retries after
    1, 5 and 30 minutes. Any other failure (a wrong secret, a
    rejected command) logs `Discord command registration failed` and
    goes to Sentry; fix it and restart.
  - Discord can take a few minutes to show new commands; reload
    Discord (Ctrl+R or Cmd+R).
  - The server must have critwire added through a game's Share tab.
  - "This server isn't linked to a game on critwire that takes bugs
    here" means no linked game in this server is public and takes
    that type: the game isn't linked, it's held, its studio is
    suspended, its feedback form isn't critwire's own, or ideas are
    off.
- **Posts are missing.**
  - Wait two minutes after the last change.
  - Only the changes in "What gets posted" are posted, and each only
    once.
  - The Share tab saying "Posts are off" means the webhook was deleted
    in Discord; add critwire again.
  - As a super admin, open Payload's jobs in the admin
    (`/admin/collections/payload-jobs`) and look for
    `discord-update-post` or `discord-stage-post` jobs on the
    `discord` queue with an error. A failed post is retried 3 times,
    a minute apart and then longer; after that the job keeps its
    error, and unticking `hasError` retries it.
- **Players see "The application did not respond".** Discord waits
  3 seconds. Look in the log for `Slow Discord form submission`, which
  marks submissions over 2 seconds, and for errors around it. A cold
  start right after a deploy can be slow; the Docker healthcheck warms
  the app within 30 seconds. A slow submission may still have been
  saved, so check Submissions before asking the player to send it
  again.
- **"Discord feedback isn't available right now."** Upstash isn't
  configured. In production, Discord reports need it for their rate
  limits, as the web forms do (`docs/self-hosting.md`).
- **The hub's welcome panel shows no Discord tab** right after you set
  the variables. A cached hub keeps the old answer for up to an hour,
  or until the game is saved. The admin's Share tab isn't affected.

## Limits

- **Rate limits** (Upstash, per Discord account, per game):
  `/feedback`, 5 reports per 10 minutes; Send to critwire, 30 per
  10 minutes per moderator. Over the limit, the reply says to try
  again later and nothing is created.
- **25 games per server** in the Game select, the first 25 by name.
- **Discord takes about 30 posts a minute per webhook.** The `discord`
  queue runs at most 10 jobs a minute, so bulk triage stays under it;
  a 429 is retried.
- **Text:** Discord's form fields take at most 4000 characters; the
  title 3 to 160, the details at least 10.
- **The clock:** requests more than 5 minutes old or ahead are
  refused.
- **One server per game.** Adding critwire again to another server
  moves the game there.

## Deleting a game

Deleting a game deletes its submissions, Discord ones included, and its
post log rows. It leaves its webhook in the Discord server. Nothing posts
to it any more; remove it in Server Settings → Integrations → Webhooks.
Disconnect the game first to have critwire remove it for you.
