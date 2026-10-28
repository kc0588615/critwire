// SQL text by statement (port of the spike's src/sql.ts): splits at top-level `;`, outside strings (dollar-quoted too),
// quoted identifiers and comments. Pure. The loader uses it to check its hand-written parts (loader.ts).

export interface Statement {
  /** 1-based among the non-empty statements. */
  n: number;
  text: string;
}

const lineAt = (sql: string, i: number) => sql.slice(0, i).split("\n").length;

// Index just past the closing `quote`, where a doubled quote is an escape. Throws if unterminated.
function skipQuoted(sql: string, start: number, quote: string, what: string): number {
  for (let i = start + 1; i < sql.length; i++) {
    if (sql[i] !== quote) continue;
    if (sql[i + 1] === quote) i++;
    else return i + 1;
  }
  throw new Error(`unterminated ${what} starting on line ${lineAt(sql, start)}`);
}

// A run of SQL text of one kind; `code` is everything outside strings, quoted identifiers and comments.
interface Span { kind: "code" | "string" | "ident" | "comment"; start: number; end: number }

// A dollar quote's opening tag: `$$` or `$tag$` (a tag doesn't start with a digit).
const DOLLAR_TAG = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/;

// Cuts SQL text into spans. Throws on an unterminated string, quoted identifier or block comment.
function lex(sql: string): Span[] {
  const spans: Span[] = [];
  let code = 0; // start of the current code span
  const push = (kind: Span["kind"], start: number, end: number) => {
    if (code < start) spans.push({ kind: "code", start: code, end: start });
    spans.push({ kind, start, end });
    code = end;
  };
  let i = 0;
  while (i < sql.length) {
    const c = sql[i]!;
    if (c === "'") push("string", i, (i = skipQuoted(sql, i, "'", "string")));
    else if (c === "$" && !/[A-Za-z0-9_$]/.test(sql[i - 1] ?? "") && DOLLAR_TAG.test(sql.slice(i))) {
      // `$$ … $$` or `$tag$ … $tag$` (a DO body); `$1` is a parameter, `a$b$` part of a name.
      const tag = DOLLAR_TAG.exec(sql.slice(i))![0];
      const close = sql.indexOf(tag, i + tag.length);
      if (close < 0) throw new Error(`unterminated dollar-quoted string starting on line ${lineAt(sql, i)}`);
      push("string", i, (i = close + tag.length));
    } else if (c === '"') push("ident", i, (i = skipQuoted(sql, i, '"', "quoted identifier")));
    else if (c === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      push("comment", i, (i = nl < 0 ? sql.length : nl + 1));
    } else if (c === "/" && sql[i + 1] === "*") {
      const close = sql.indexOf("*/", i + 2);
      if (close < 0) throw new Error(`unterminated comment starting on line ${lineAt(sql, i)}`);
      push("comment", i, (i = close + 2));
    } else i++;
  }
  if (code < sql.length) spans.push({ kind: "code", start: code, end: sql.length });
  return spans;
}

// The statements of sql, trimmed, comments-only segments skipped.
export function splitStatements(sql: string): Statement[] {
  const out: Statement[] = [];
  let start = 0;
  let hasCode = false; // the current segment has something besides whitespace and comments
  const flush = (end: number) => {
    if (hasCode) out.push({ n: out.length + 1, text: sql.slice(start, end).trim() });
    start = end + 1;
    hasCode = false;
  };
  for (const span of lex(sql)) {
    if (span.kind === "comment") continue;
    if (span.kind !== "code") {
      hasCode = true;
      continue;
    }
    for (let i = span.start; i < span.end; i++) {
      if (sql[i] === ";") flush(i);
      else if (!/\s/.test(sql[i]!)) hasCode = true;
    }
  }
  flush(sql.length);
  return out;
}

// The SQL with comments and string literals blanked to spaces (newlines kept, same length), quoted identifiers kept.
export function codeOnly(sql: string): string {
  return lex(sql)
    .map(({ kind, start, end }) => {
      const text = sql.slice(start, end);
      return kind === "code" || kind === "ident" ? text : text.replace(/[^\n]/g, " ");
    })
    .join("");
}
