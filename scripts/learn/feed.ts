// c1's feed (plan T4): the one constant the feed hangs off. learn:check writes `file` from block `block`'s one
// `column` cell; the build binds it to that block's recorded result and publishes it, with `schema`, under /learn/labs/;
// Power BI blocks read it as the `// input:` `input`; `sources` are the credits it carries. Pure.

export const FEED = {
  block: "c1-feed-file",
  column: "feed",
  file: "site/learn/labs/checked/c1-feed.json",
  schema: "site/learn/labs/c1-feed.schema.json",
  input: "labs/c1-feed.json",
  sources: ["critwire", "gbif-sample"],
} as const;
