---
version: 0.2
effective: 2026-10-08
status: draft
---

critwire.com is Critter Connect's feedback and updates site. It's run by Haunted Pavement LLC, a Wisconsin limited liability company ("we" and "us"). You can reach us at admin@critwire.com, or by post at [LLC street address].

This policy covers only this site at critwire.com: its pages, and the Feedback button and widgets that show its pages inside the game and on critterconnect.org. It doesn't cover the game itself at play.critterconnect.org, or critterconnect.org. Your game account isn't connected to this site, and this site doesn't learn who you are in the game.

It says what the site collects, why, where it's kept, for how long, and which outside services handle it. It's written from what the site's code actually does. The site runs on critwire, open-source software; anyone else who runs a copy of it has their own privacy policy, and this one doesn't apply to them.

## The short version

- Players don't have accounts, and the site never asks for your name.
- Feedback doesn't ask for your email. The contact form's email is optional, only for people 13 or older, and deleted once your message is delivered.
- Don't write your real name, email, school, where you live or any password in feedback. The team reads feedback before anyone else can see it.
- When you vote, your browser keeps a random code, so you can vote once per item. It doesn't say who you are.
- Your IP address is used for a few minutes to stop spam, and never kept in our database.
- No ads, no analytics, no tracking, and we don't sell anyone's data.
- The site's server is run on Oracle Cloud in Chicago, in the United States.

## Players under 13

Critter Connect is made for students in grades 6–12, so some players are under 13. Players don't need an account, and the site collects as little as it can from everyone:

- **Feedback:** what you write, and the details you choose (bug or idea, a category, and for a bug the platform and game version). No name or email.
- **Votes:** a random code in a cookie, so one browser votes once per item.
- **Contact messages:** your message, and a nickname and subject if you give them. The email field is only for people 13 or older; if you're under 13, leave it empty.
- **For a few minutes:** your IP address, to limit how often forms are sent and to check you're not a bot.

The sections below say more about each. [COPPA: the lawyer's advice on what this site must do for players under 13, such as notice to parents or schools, or parental consent, goes here.]

**Parents, guardians and teachers:** if you believe a child under 13 sent us personal information, such as an email address or a real name in feedback, email admin@critwire.com and we'll delete it. Tell us the page or the item, since feedback doesn't carry a name.

## Feedback

- **What:** a title and a description, the type (bug or idea), a category, and for a bug the platform and game version if you give them. The site doesn't ask for your name or email.
- **Why:** so the game's team can fix bugs and consider ideas, and to show feedback on the site's board.
- **Review:** the team reads each piece of feedback before it's public. Our content filter, which runs on our own server, also flags words and links, and holds flagged feedback for the team. The filter's result is kept with the feedback.
- **Public:** publishing copies the title, description, type and category to a public item on the board, which can also show in the site's widgets, its feeds and inside the game. The platform and game version stay private.
- **Where:** the site's database.
- **How long:** until we delete it, whether we published it or not. Deleting a public item removes it from the site's pages.

## Votes

- **What:** when you first vote, your browser gets a random code in the `cw_vote_token` cookie. Our database keeps only a scrambled form of that code (a SHA-256 hash), with the item and the time of each vote. Votes from one browser can be linked to each other, but not to a person.
- **Why:** one vote per browser.
- **How long:** the cookie lasts 1 year. A vote stays until it's withdrawn or the item is deleted.

## Contact messages to the game's team

- **What:** your nickname, subject and email if you give them (all optional, and the email only if you're 13 or older), and your message.
- **Why:** to deliver your message to the game's team by email, with a way to reply if you gave an email.
- **Where:** the site's job queue, in our database, until it's delivered.
- **How long:**
  - Once your message is delivered, the site deletes it, your email included. If that delete ever fails, a cleanup that runs every 10 minutes deletes it.
  - A message that couldn't be delivered is tried 3 times within a few minutes. If none of them delivers it, it's kept until one of our admins retries it (once it's delivered, it's deleted as above) or deletes it, or 30 days have passed since you sent it, whichever comes first.
  - A delivered message is an email to admin@critwire.com, kept as "Email to admin@critwire.com" describes.
- **Who handles it:** Resend sends the email. Your email address, if you gave one, is its reply-to address and appears in it.

## IP addresses, rate limits and bot checks

- **Rate limits:** when you send a form, vote, or arrive through a link that counts visits, your IP address is used as a key to limit how often that can happen. The keys are held by Upstash ([Upstash region]) and expire after about 2 minutes. Keys from the admins' sign-in and password forms expire after about 2 hours.
- **Bot checks:** the feedback and contact forms use Cloudflare Turnstile. The check loads from Cloudflare in your browser, reads signals from it to tell people from bots, and the site sends Cloudflare your IP address to confirm the result. Cloudflare handles that under its own policy.
- IP addresses are never kept in the site's database, and the site itself doesn't log them. Our web server's error messages can include one, as "Server logs" describes.

## Visit counts

When you arrive through a link tagged with its source (such as `?ref=website`), the site adds one to that source's count for the day. These are counts, not personal data: they don't record who visited. Each day's count is kept at Upstash for 35 days after its last visit.

## The Feedback button and widgets

The Feedback button inside the game and the widgets on critterconnect.org show this site's pages inside those pages. They set no cookies, store nothing in your browser, and send the site only what any web page request does (your IP address, your browser's name and the page you're on). They don't pass on who you are in the game. Voting opens the item's page on this site, where the vote cookie above applies.

## Cookies

The site sets only these cookies. Each one does something you asked for, and none is used for ads or analytics.

| Cookie | What it's for | How long |
|---|---|---|
| `cw_vote_token` | A random code that lets one browser vote once per item. Set only when you first vote | 1 year |
| `payload-token` | Keeps an admin signed in | 2 hours, renewed while they use the admin |
| `payload-tenant` | Remembers which studio an admin is working on | Up to 1 year |
| `payload-theme` | Remembers the admin's light or dark theme, if an admin chooses one | Up to 1 year |
| `payload-lng` | Remembers the admin's language, if an admin chooses one | 1 year |
| `__prerender_bypass` | Lets an admin preview a draft page. Never set for anyone else | Until the browser closes |

The bot check (Cloudflare Turnstile) runs in your browser under Cloudflare's own policy.

## Server logs

- **What:** events about what the server did, with internal ID numbers, and error details when something fails.
  - Error details can include technical details of the request that failed, and rarely what was sent in it: when saving to the database fails, the error can repeat what was being saved, such as a piece of feedback.
  - When our web server can't reach the site, or a visitor's connection breaks off mid-reply, its error message includes the visitor's IP address and the page they asked for.
  - A contact message's nickname, email and text are removed from the error logged when its delivery fails.
  - Otherwise, the logs don't hold IP addresses, emails or names.
- **Why:** to run the site and fix it.
- **Where:** our server's system log.
- **How long:** [log retention].

## Email to admin@critwire.com

Contact messages, and email you send to admin@critwire.com yourself, are forwarded by Namecheap to [mailbox provider], and kept for [retention of emails to admin@critwire.com].

## Backups

The site itself doesn't make backups of its database. [backups], kept for [backup retention].

## Admin accounts

Only the people who run this site for Haunted Pavement LLC have accounts, and they must be 18 or older.

- **What:** an admin's email address, their name if they give one, a hash of their password (never the password itself), their sign-in sessions, the tokens in their verification and password-reset emails, a count of failed sign-ins with any lock time, their studio and role, when the account was created and changed, and their settings in the admin. To limit account emails, a hash (SHA-256) of an email address is kept at Upstash for about 2 hours.
- **Agreement records:** the versions of the Terms of Service and the Privacy Policy an admin accepted, a fingerprint (a SHA-256 digest) of each document's exact text, and the time. No IP address. They're kept after the account is deleted, without its email or name, because they record the terms that applied to content that stays on the site.
- **Why:** to let admins sign in, send them account emails, and show what they agreed to.
- **Where:** the site's database. Account emails are sent through Resend.
- **How long:** until the account is deleted, except the agreement records, as above.
- **Images admins upload:** JPEG and PNG images are kept exactly as uploaded, including any metadata in the file, such as where a photo was taken. GIF, WebP and AVIF images, and images cropped in the admin, are saved again without it.

## Not used on this site

The software behind the site can do more than this site uses. None of these is on: player accounts, Discord, forms hosted by Tally, the abuse-report form, error reporting to Sentry, and storage outside our server. If we turn one on, we'll update this policy first.

## Outside services

| Service | What it does for the site | What it receives |
|---|---|---|
| Oracle Cloud (us-chicago-1, Chicago, USA) | Runs the site's server, database and storage | Everything the site keeps |
| Cloudflare Turnstile | Bot checks on the feedback and contact forms | Your IP address and what the check reads from your browser |
| Upstash ([Upstash region]) | Rate limits and visit counts | IP addresses and admins' email hashes, for minutes to hours; visit counts |
| Resend (us-east-1) | Sends contact messages and admins' account emails | The recipient's address, the email, and a player's email as reply-to |
| Namecheap | critwire.com's domain name, and forwarding mail to admin@critwire.com | Email sent to admin@critwire.com, contact messages included |
| [mailbox provider] | The inbox behind admin@critwire.com | Email sent to admin@critwire.com, contact messages included |

## No ads, no analytics, no selling

The site shows no ads, runs no analytics or tracking, and doesn't sell or rent anyone's data.

## Your requests

Email admin@critwire.com to ask what we hold about you, or to have it corrected or deleted. A parent or guardian can ask for a child. Feedback doesn't carry your name or email, so tell us which item or page you mean. We may need to confirm you control the account or the address the request is about.

## Deleting an account

Email admin@critwire.com. Deleting an admin account replaces its email, name and password, ends every sign-in, and blocks it from signing in again. It then shows as "Deleted user". The site's content stays, and so do the account's agreement records, as described above.

## Changes to this policy

When we change this policy, it gets a new version number and date, and we publish it here. Admins accept the new version before they can use the admin again.

## Contact

Haunted Pavement LLC, [LLC street address]. Email: admin@critwire.com.
