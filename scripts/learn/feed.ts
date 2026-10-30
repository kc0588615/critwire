// c1's feed (plan T4): the one constant the feed hangs off. learn:check writes `file` from block `block`'s one
// `column` cell; the build binds it to that block's recorded result and publishes it, with `schema`, under /learn/labs/;
// Power BI blocks read it as the `// input:` `input`; `sources` are the credits it carries. The build's checks
// (feedErrors) apply only when the course has `block` (plan S4, deviation 2). Pure. Tests: feed.test.ts.
import { renderResult } from "./result.ts";

export const FEED = {
  block: "c1-feed-file",
  column: "feed",
  file: "site/learn/labs/checked/c1-feed.json",
  schema: "site/learn/labs/c1-feed.schema.json",
  input: "labs/c1-feed.json",
  sources: ["critwire", "gbif-sample"],
} as const;

const UPDATE = "run pnpm learn:check --update";

/** Why the feed `text` isn't FEED.block's `recorded` result (checked/c1-feed-file.txt), byte for byte; none if it is. */
export function feedStaleness(text: string, recorded: string | undefined): string[] {
  return renderResult(FEED.block, { columns: [FEED.column], rows: [[text]] }) === recorded ? [] : [`${FEED.file} isn't ${FEED.block}'s result: ${UPDATE}`];
}

/** What the build reads: whether the course has FEED.block, the committed feed and schema, and the block's recorded result. */
export interface FeedState {
  block: boolean;
  feed: string | undefined;
  recorded: string | undefined;
  schema: boolean;
}

/** Every way the committed feed fails to be published (FD2): a plain build refuses each, --draft warns. */
export function feedErrors({ block, feed, recorded, schema }: FeedState): string[] {
  if (!block) return feed === undefined ? [] : [`${FEED.file}: no block ${FEED.block} in the course writes it: delete it`];
  return [
    ...(feed === undefined ? [`${FEED.file} is missing: ${UPDATE}`] : feedStaleness(feed, recorded)),
    ...(schema ? [] : [`${FEED.schema} is missing: run pnpm learn:port c1`]),
  ];
}
