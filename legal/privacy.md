---
version: 0.1
effective: 2026-10-04
status: draft
---

critwire.com is run by Haunted Pavement LLC, a Wisconsin limited liability company ("we" and "us"). You can reach us at admin@critwire.com, or by post at [LLC street address].

This policy covers only the hosted service at critwire.com. Critwire's code is open source under the MIT License, so anyone can run their own copy. Each self-hosted copy is run by its own operator under its own terms and privacy policy, and this policy doesn't apply to it.

It says what critwire collects, why, where it's kept, for how long, and which outside services handle it. It's written from what the code actually does.

## The short version

- Players don't have accounts. The feedback form doesn't ask for an email.
- Studios have accounts: an email, an optional name and a password.
- No ads, no analytics, and we don't sell anyone's data.
- IP addresses are used briefly to stop abuse, and never kept in our database or logs.
- Critwire's server is run on Oracle Cloud in Chicago, in the United States.

## Studio accounts

- **What:** your email address, your name if you give one, a hash of your password (never the password itself), your sign-in sessions, the tokens in your verification and password-reset emails, and a count of failed sign-ins with any lock time.
- **Why:** to let you sign in, and to send you account emails (verifying your address and resetting your password).
- **Where:** critwire's database, on our server on Oracle Cloud in Chicago. Account emails are sent through Resend.
- **How long:** until the account is deleted. That includes a signup that was never finished, which leaves an account holding only the email address. See "Deleting an account, a game or a studio" below.

## Cookies

Critwire sets only these cookies. Each one does something you asked for, and none is used for ads or analytics.

| Cookie | What it's for | How long |
|---|---|---|
| `payload-token` | Keeps an account holder signed in | 2 hours after your last activity |
| `payload-tenant` | Remembers which studio you're working on in the admin | Up to 1 year |
| `payload-theme` | Remembers the admin's light or dark theme | Up to 1 year |
| `cw_vote_token` | A random token that lets one browser vote once per item. Set only when you first vote | 1 year |
| `__prerender_bypass` | Lets critwire's own staff preview a draft page. Never set for anyone else | Until the browser closes |

The bot check on public forms (Cloudflare Turnstile) and any Tally form a studio adds run in your browser under Cloudflare's and Tally's own policies.

## Your agreement to our Terms and this policy

- **What:** your account, the version numbers of the Terms of Service and the Privacy Policy you accepted, a fingerprint (a SHA-256 digest) of each document's exact text, and the time. No IP address.
- **Why:** to show what you agreed to, and the exact text you agreed to.
- **Where:** critwire's database. Only our own administrators can see it.
- **How long:** for as long as the account exists, and after it's deleted. A deleted account's records no longer show its email or name, but we keep them because they record the terms that applied to studio content that stays on critwire.

## Studio content

- **What:** your studios and games, their contact settings, your updates, how you triage feedback, and the images you upload.
- **Why:** to run your portals.
- **Where:** critwire's database, and images on our server's disk.
- **How long:** until you delete it or the studio is deleted. Deleting a game deletes its updates and its feedback. Deleting one person's account keeps the studio's content.
- **Images are kept exactly as uploaded,** including any metadata embedded in the file, such as the place a photo was taken. Remove it before you upload if you don't want it shared.

## Player feedback

- **What:** a title and a description, the type (bug or idea), a category, and the platform and game version if you give them. Critwire doesn't ask for your name or email.
- **Why:** to put your feedback on the studio's board.
- **Where:** critwire's database.
- **How long:** until the studio deletes it or the game, or the studio is deleted. Studios review feedback before it's public, unless they choose to publish it automatically. Published feedback is public.

## Feedback sent from Discord

When a studio connects its Discord server, players there can send feedback with the `/feedback` command, and the server's moderators can send a message to critwire with "Send to critwire".

- **What:** the feedback above, plus the Discord user ID and username of the person who wrote it, and for "Send to critwire" a link to the original message. A moderator can send someone else's message, so its author may never have used critwire themselves.
- **Why:** so the studio can follow up with the player on Discord.
- **Where:** critwire's database. The studio's members can see the Discord details. The public never sees them.
- **How long:** as for other feedback.
- **Who handles it:** Discord.

## Contact messages to a studio

- **What:** your name and email if you give them (both optional, and the email only if you're 13 or older), a subject and your message.
- **Why:** to deliver your message to the studio, by email or to the studio's Discord channel.
- **Where:** critwire's job queue, in our database, until it's delivered.
- **How long:**
  - Once your message is delivered, critwire deletes it, your email included. If that delete ever fails, a cleanup that runs every 10 minutes deletes it.
  - A message that couldn't be delivered is kept for retries until a retry delivers it (then it's deleted as above), one of our administrators deletes it, its game or studio is deleted, or 30 days have passed since you sent it, whichever comes first.
  - A delivered message lives on in the studio's own inbox or Discord, under the studio's control.
- **Who handles it:** Resend, when it's sent by email (your email address is the reply-to address and appears in the message), or Discord, when it's sent to the studio's channel (your email appears in the post).

## Abuse reports

- **What:** the address of the page you report, the reason, the details you write, the game it's about, and your email if you give it (optional, 13 or older).
- **Why:** to moderate critwire.
- **Where:** critwire's database. Only our own administrators can see reports.
- **How long:** until one of our administrators deletes the report. Reports stay after their game is deleted, with the page address, because they're our record of moderation.

## Votes

- **What:** when you first vote, your browser gets a random token in the `cw_vote_token` cookie. Our database keeps only a hash of that token, with the item and the time of each vote. Votes from one browser can be linked to each other, but not to a person.
- **Why:** one vote per browser.
- **How long:** the cookie lasts 1 year. A vote stays until it's withdrawn, or the item, game or studio is deleted.

## IP addresses and rate limits

- **IP addresses:** when you send a form, vote, or follow a link that counts referrals, your IP address is used as a key to limit how often that can happen. The keys are held by Upstash ([Upstash region]) and expire within about 2 hours.
- **Bot checks:** public forms use Cloudflare Turnstile. The check loads from Cloudflare in your browser, and critwire sends Cloudflare your IP address to confirm it.
- IP addresses are never kept in critwire's database or logs.
- **Discord user IDs:** used the same way to limit how often someone sends feedback from Discord, at Upstash, for about 20 minutes.
- **Account emails:** a hash (SHA-256) of an email address is used at Upstash to limit how many account emails go to one address, for about 2 hours.
- **Referral counts:** how many visits a game got from each source, per day. These are counts, not personal data. Each day's count is kept at Upstash for 35 days after its last visit.

## Forms a studio runs on Tally

A studio can choose to show a form hosted by Tally on its portal instead of critwire's. What you send there goes to Tally and the studio, under their terms, not to critwire.

## Server logs

- **What:** events about what the server did, with internal ID numbers, and error details when something fails. Error details can include technical details of the request that failed. The logs don't hold IP addresses or players' names.
- **Why:** to run critwire and fix it.
- **Where:** our server's system log.
- **How long:** [log retention].

## Email to admin@critwire.com

Email you send to admin@critwire.com is forwarded by Namecheap to [mailbox provider], and kept for [retention of emails to admin@critwire.com].

## Backups

Critwire itself doesn't make backups of its database. [backups], kept for [backup retention].

## Outside services

| Service | What it does for critwire | What it receives |
|---|---|---|
| Oracle Cloud (us-chicago-1, Chicago, USA) | Runs critwire's server, database and storage | Everything critwire keeps |
| Cloudflare Turnstile | Bot checks on public forms | Your IP address and what the check reads from your browser |
| Upstash ([Upstash region]) | Rate limits and referral counts | IP addresses, Discord user IDs and email hashes, briefly; referral counts |
| Resend (us-east-1) | Sends account emails, and contact messages by email | The recipient's address, the email, and a player's email as reply-to |
| Discord | Feedback from a studio's Discord server, and posts to the studio's channel, when a studio connects it | What's posted to the studio's channel, including a contact message's email |
| Namecheap | critwire.com's domain name, and forwarding mail to admin@critwire.com | Email sent to admin@critwire.com |
| Tally | Forms, only on portals whose studio chose one | What you type into that form |

## No ads, no analytics, no selling

Critwire shows no ads, runs no analytics or tracking, and doesn't sell or rent anyone's data.

## Children

Players don't have accounts, and studio accounts are for people aged 18 or older. Critwire isn't directed at children under 13, and we don't knowingly collect personal information from them. The contact form's email field says it's for people 13 or older. If you believe a child under 13 has sent us personal information, email admin@critwire.com and we'll delete it.

## Your requests

Email admin@critwire.com to ask what we hold about you, or to have it corrected or deleted. We may need to confirm you control the account or the address the request is about. Feedback doesn't carry your name or email, so tell us which item you mean. A studio decides what happens on its own board, and to messages already delivered to it.

## Deleting an account, a game or a studio

- **An account:** email admin@critwire.com. Deleting an account replaces its email, name and password, ends every sign-in, and blocks it from signing in again. It then shows as "Deleted user". The studios it belonged to and their content stay, and so do its acceptance records, as described above.
- **A game:** deleting a game deletes its updates, its feedback and their votes, its Discord post records, and any contact messages still waiting to be delivered.
- **A studio:** deleting a studio deletes its games, with everything above, and all its other content, images included. Abuse reports about it stay, as described above.

## Changes to this policy

When we change this policy, it gets a new version number and date, and we publish it here. Account holders accept the new version before they can keep managing their studio.

## Contact

Haunted Pavement LLC, [LLC street address]. Email: admin@critwire.com.
