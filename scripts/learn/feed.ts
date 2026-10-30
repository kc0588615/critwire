// c1's feed (plan T4): the one constant the feed hangs off. learn:check writes `file` from block `block`'s one
// `column` cell; the build binds it to that block's recorded result and publishes it, with `schema`, under /learn/labs/;
// Power BI blocks read it as the `// input:` `input`; `sources` are the credits it carries. The build's checks
// (feedErrors) apply only when the course has `block` (plan S4, deviation 2); feedAttributionErrors checks the license
// and credits it carries (plan S10), in the build and on the served files. Pure. Tests: feed.test.ts.
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

/** What the feed must credit (plan T4): critwire's credit and the sample's (FEED.sources), and the sample's datasets. */
export interface FeedAttribution {
  critwire: { license: string; licenseUrl: string | null; citation: string };
  sample: { citation: string };
  datasets: readonly { title: string | null; publisher: string | null; doi: string | null }[];
}

type Row = { title: unknown; publisher: unknown; doi: unknown };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const show = (v: unknown) => (v === undefined ? "missing" : JSON.stringify(v));
// Postgres' ORDER BY title, publisher, doi under the C collation: UTF-8 bytes, a null doi last.
const text = (v: unknown) => Buffer.from(String(v));
const order = (a: Row, b: Row) =>
  Buffer.compare(text(a.title), text(b.title)) || Buffer.compare(text(a.publisher), text(b.publisher)) ||
  (a.doi === b.doi ? 0 : a.doi === null ? 1 : b.doi === null ? -1 : Buffer.compare(text(a.doi), text(b.doi)));
const same = (a: Row, b: Row) => a.title === b.title && a.publisher === b.publisher && a.doi === b.doi;

/**
 * Every way the feed `doc` fails to carry its license and credits (FD3–FD6): license, license_url and attribution are
 * critwire's credit; source the sample's citation; each credit row one sample dataset's (title, publisher, doi), unique,
 * in (title, publisher, doi) order. Which datasets it lists is the SQL's, bound by c1-feed's recorded datasets_to_credit.
 */
export function feedAttributionErrors(doc: unknown, { critwire, sample, datasets }: FeedAttribution): string[] {
  const at = `${FEED.file}:`;
  if (!isObject(doc)) return [`${at} not a JSON object`];
  const errors: string[] = [];
  const want: [string, unknown][] = [["license", critwire.license], ["license_url", critwire.licenseUrl], ["attribution", critwire.citation], ["source", sample.citation]];
  for (const [field, value] of want) if (doc[field] !== value) errors.push(`${at} ${field} is ${show(doc[field])}, not ${JSON.stringify(value)}`);
  if (!Array.isArray(doc.credit)) return [...errors, `${at} credit is not an array`];
  const rows: (Row & { i: number })[] = [];
  doc.credit.forEach((row: unknown, i) => {
    if (!isObject(row)) return errors.push(`${at} credit[${i}] is not an object`);
    if (!("doi" in row)) return errors.push(`${at} credit[${i}] has no doi`);
    const r = row as Row;
    if (!datasets.some((d) => same(d, r))) errors.push(`${at} credit[${i}] ${JSON.stringify(row)} is no sample dataset's (title, publisher, doi)`);
    const earlier = rows.find((p) => same(p, r));
    if (earlier) errors.push(`${at} credit[${i}] repeats credit[${earlier.i}]`);
    else if (rows.length && order(rows.at(-1)!, r) > 0) errors.push(`${at} credit[${i}] is out of (title, publisher, doi) order`);
    rows.push({ ...r, i });
  });
  return errors;
}
