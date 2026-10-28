// The one module of rules on what a block may run (plan D2; spike scripts/privilege.ts, ported). Pure.
// - blockRuleErrors (PV1–PV8): role and schema statements only in PostGIS blocks, every role and schema they name
//   `learn_…`, PUBLIC only as a grantee on objects in a named learn_ schema; never ALTER SYSTEM, ALTER DATABASE or
//   GRANT ON PARAMETER; never learn_spatial (any engine, any status); SET only in PostGIS (and not past an unwrapped
//   block's COMMIT); random() only after setseed(); transaction control only in unwrapped blocks (`-- tx: own`,
//   `-- sessions:`). An untested block never runs: only the learn_spatial rule applies to it (a learner's one-time setup may show anything, RP14). A DuckDB block's
//   SET, RESET and transaction control are refused once, by the isolated run's rule (sql.ts isolatedRefusal, D11).
// - cleanupErrors (CL1–CL9): a block drops the roles and schemas it creates, DROP OWNED BY before DROP ROLE for a role
//   that was granted or owns anything, RESET ROLE after SET ROLE: each block cleans up as a learner runs it.
// The leak check after each block is the runner's (leaks.ts learnObjects). blocks.ts's lintPage calls both rules.
// Tests: privilege.test.ts.
import { codeOnly, type Statement } from "../build/learn/sql.ts";

/** A2's schema: only the canary reads it; no block may name it (PV4). */
export const A2_SCHEMA = "learn_spatial";
/** Every role and schema a block names starts with this (PV1, PV2). */
const PREFIX = "learn_";

/** What the rules read of a block (blocks.ts's Block has these fields). */
export interface RuleBlock {
  id: string;
  engine: "duckdb" | "postgis" | "powerbi";
  status: "ran" | "untested";
  txOwn: boolean;
  /** `-- sessions:`: like `tx: own`, the block runs unwrapped. */
  sessions: readonly string[];
  /** The block's code as learners see it. */
  code: string;
  statements: Statement[];
}

/** One role or schema statement: its kind, every role and schema it names, and what it creates, drops or sets. */
export interface RoleStatement {
  kind: string;
  roles: string[];
  schemas: string[];
  /** PUBLIC named as a grantee. */
  public: boolean;
  /** CREATE ROLE / DROP ROLE / DROP OWNED / SET ROLE: the roles acted on; CREATE / DROP SCHEMA: the schemas. */
  targets: string[];
  /** Why the statement is refused whatever it names (PUBLIC misuse, ALTER DEFAULT PRIVILEGES without FOR ROLE …). */
  refused?: string;
  /** Refused in every engine (PV3). */
  never?: string;
}

// ---------------------------------------------------------------------------------------------------------------
// Tokens

interface Token {
  text: string;
  /** Unquoted word, lower case (keywords match on this only). */
  word?: string;
  /** The identifier's value: an unquoted word folded to lower case, a quoted one as written. */
  name?: string;
}

const TOKEN = /"(?:[^"]|"")*"|[A-Za-z_\u0080-￿][A-Za-z0-9_$\u0080-￿]*|\S/g;

/** The statement's tokens, comments and string literals left out (PV8). */
function tokens(statement: string): Token[] {
  return [...codeOnly(statement).matchAll(TOKEN)].map(([text]) => {
    if (text.startsWith('"')) return { text, name: text.slice(1, -1).replaceAll('""', '"') };
    if (/^[A-Za-z_\u0080-￿]/.test(text)) return { text, word: text.toLowerCase(), name: text.toLowerCase() };
    return { text };
  });
}

/** Index of the `)` closing the `(` at `i`. */
function closeParen(t: Token[], i: number): number {
  let depth = 0;
  for (let j = i; j < t.length; j++) {
    if (t[j]!.text === "(") depth++;
    else if (t[j]!.text === ")" && --depth === 0) return j;
  }
  return t.length;
}

/** First index ≥ `from` of an unquoted word in `words`, outside parentheses; -1 if none. */
function find(t: Token[], from: number, ...words: string[]): number {
  for (let j = from; j < t.length; j++) {
    if (t[j]!.text === "(") j = closeParen(t, j);
    else if (t[j]!.word && words.includes(t[j]!.word!)) return j;
  }
  return -1;
}

/**
 * A comma list of (possibly qualified) names from `i`: each item's parts (`a.b` → [a, b]), its argument list skipped,
 * and a leading word in `skip` dropped (`GROUP x`). `public` marks an unquoted PUBLIC item.
 */
function names(t: Token[], i: number, skip: string[] = []): { items: { parts: string[]; isPublic: boolean }[]; end: number } {
  const items: { parts: string[]; isPublic: boolean }[] = [];
  let j = i;
  for (;;) {
    if (t[j]?.word && skip.includes(t[j]!.word!) && t[j + 1]?.name !== undefined) j++;
    const isPublic = t[j]?.word === "public";
    const parts: string[] = [];
    while (t[j]?.name !== undefined) {
      parts.push(t[j++]!.name!);
      if (t[j]?.text !== ".") break;
      j++;
    }
    if (!parts.length) break;
    if (t[j]?.text === "(") j = closeParen(t, j) + 1;
    items.push({ parts, isPublic: isPublic && parts.length === 1 });
    if (t[j]?.text !== ",") break;
    j++;
  }
  return { items, end: j };
}

const firstParts = (items: { parts: string[] }[]) => items.map((x) => x.parts[0]!);

// ---------------------------------------------------------------------------------------------------------------
// Role and schema statements

/** Objects that belong to the database or the server, not a schema: never granted on (PV3). */
const DATABASE_OBJECTS = ["database", "tablespace", "language", "foreign", "large", "parameter"];
const OBJECT_CLASSES = ["table", "sequence", "function", "procedure", "routine", "domain", "type"];

/** GRANT / REVOKE from `i` (the word GRANT or REVOKE), as ALTER DEFAULT PRIVILEGES uses it too. */
function grant(t: Token[], i: number, r: RoleStatement): void {
  const verb = t[i]!.word!;
  const to = find(t, i + 1, verb === "grant" ? "to" : "from");
  const on = find(t, i + 1, "on");
  if (on >= 0 && (to < 0 || on < to)) {
    const cls = t[on + 1]?.word;
    let qualified = true;
    if (cls && DATABASE_OBJECTS.includes(cls)) r.never = `${verb.toUpperCase()} … ON ${cls.toUpperCase()}`;
    else if (cls === "schema") r.schemas.push(...firstParts(names(t, on + 2).items));
    else if (cls === "all") {
      const s = find(t, on + 1, "schema");
      if (s >= 0) r.schemas.push(...firstParts(names(t, s + 1).items));
    } else if (r.kind !== "ALTER DEFAULT PRIVILEGES") {
      for (const { parts } of names(t, on + 1 + (cls && OBJECT_CLASSES.includes(cls) ? 1 : 0)).items) {
        if (parts.length > 1) r.schemas.push(parts[0]!);
        else qualified = false;
      }
    } else qualified = r.schemas.length > 0; // ON TABLES …: the IN SCHEMA list
    if (to >= 0) grantees(t, to + 1, r);
    if (r.public && !(qualified && r.schemas.length)) r.refused = "grants to PUBLIC on an object outside a named learn_ schema (qualify it, or name a learn_ role)";
  } else {
    // role membership: GRANT a, b TO c / REVOKE [ADMIN OPTION FOR] a FROM c
    let j = i + 1;
    while (["admin", "inherit", "set", "option", "for"].includes(t[j]?.word ?? "") && t[j + 1]?.name !== undefined && t[j + 1]?.text !== ",") j++;
    r.roles.push(...firstParts(names(t, j).items));
    if (to >= 0) grantees(t, to + 1, r);
    if (r.public) r.refused = "makes PUBLIC a member of a role";
  }
  const by = find(t, i + 1, "granted");
  if (by >= 0 && t[by + 1]?.word === "by") r.roles.push(...firstParts(names(t, by + 2).items));
}

function grantees(t: Token[], i: number, r: RoleStatement): void {
  for (const { parts, isPublic } of names(t, i, ["group"]).items) {
    if (isPublic) r.public = true;
    else r.roles.push(parts[0]!);
  }
}

/** The statement as a role or schema statement (PV1, PV2, CL), or undefined if it's neither. */
export function roleStatement(statement: string): RoleStatement | undefined {
  const t = tokens(statement);
  const w = (i: number) => t[i]?.word;
  const r = (kind: string): RoleStatement => ({ kind, roles: [], schemas: [], public: false, targets: [] });
  const skipIfExists = (i: number) => (w(i) === "if" && w(i + 1) === "exists" ? i + 2 : i);

  if (w(0) === "create" && ["role", "user", "group"].includes(w(1)!)) {
    const s = r("CREATE ROLE");
    const { items, end } = names(t, 2);
    s.targets = firstParts(items.slice(0, 1));
    s.roles.push(...s.targets);
    for (let j = end; j < t.length; j++) if (["role", "group", "admin", "user"].includes(w(j)!)) s.roles.push(...firstParts(names(t, j + 1).items));
    return s;
  }
  if (w(0) === "alter" && ["role", "user", "group"].includes(w(1)!)) {
    const s = r("ALTER ROLE");
    s.roles.push(...firstParts(names(t, 2).items.slice(0, 1)));
    const to = find(t, 3, "rename");
    if (to >= 0 && w(to + 1) === "to") s.roles.push(...firstParts(names(t, to + 2).items));
    const user = find(t, 3, "user");
    if (user >= 0 && ["add", "drop"].includes(w(user - 1)!)) s.roles.push(...firstParts(names(t, user + 1).items));
    return s;
  }
  if (w(0) === "drop" && ["role", "user", "group"].includes(w(1)!)) {
    const s = r("DROP ROLE");
    s.targets = firstParts(names(t, skipIfExists(2)).items);
    s.roles.push(...s.targets);
    return s;
  }
  if ((w(0) === "drop" || w(0) === "reassign") && w(1) === "owned" && w(2) === "by") {
    const s = r(w(0) === "drop" ? "DROP OWNED" : "REASSIGN OWNED");
    const { items, end } = names(t, 3);
    s.roles.push(...firstParts(items));
    if (s.kind === "DROP OWNED") s.targets = [...s.roles];
    else if (w(end) === "to") s.roles.push(...firstParts(names(t, end + 1).items));
    return s;
  }
  if (w(0) === "create" && w(1) === "schema") {
    const s = r("CREATE SCHEMA");
    let j = w(2) === "if" && w(3) === "not" && w(4) === "exists" ? 5 : 2;
    if (w(j) !== "authorization") {
      s.targets = firstParts(names(t, j).items.slice(0, 1));
      j++;
    }
    if (w(j) === "authorization") {
      const owner = firstParts(names(t, j + 1).items.slice(0, 1));
      s.roles.push(...owner);
      if (!s.targets.length) s.targets = owner; // CREATE SCHEMA AUTHORIZATION r: the schema is named r
    }
    s.schemas.push(...s.targets);
    return s;
  }
  if (w(0) === "alter" && w(1) === "schema") {
    const s = r("ALTER SCHEMA");
    s.schemas.push(...firstParts(names(t, 2).items.slice(0, 1)));
    if (w(3) === "rename" && w(4) === "to") s.schemas.push(...firstParts(names(t, 5).items));
    if (w(3) === "owner" && w(4) === "to") s.roles.push(...firstParts(names(t, 5).items));
    return s;
  }
  if (w(0) === "drop" && w(1) === "schema") {
    const s = r("DROP SCHEMA");
    s.targets = firstParts(names(t, skipIfExists(2)).items);
    s.schemas.push(...s.targets);
    return s;
  }
  if (w(0) === "grant" || w(0) === "revoke") {
    const s = r(w(0)!.toUpperCase());
    grant(t, 0, s);
    return s;
  }
  if (w(0) === "alter" && w(1) === "default" && w(2) === "privileges") {
    const s = r("ALTER DEFAULT PRIVILEGES");
    const g = find(t, 3, "grant", "revoke");
    const head = g < 0 ? t : t.slice(0, g);
    const forRole = find(head, 3, "for");
    if (forRole >= 0) s.roles.push(...firstParts(names(head, forRole + 2).items));
    else s.refused = "ALTER DEFAULT PRIVILEGES without FOR ROLE learn_… changes the current role's defaults";
    const inSchema = find(head, 3, "in");
    if (inSchema >= 0 && w(inSchema + 1) === "schema") s.schemas.push(...firstParts(names(head, inSchema + 2).items));
    if (g >= 0) {
      const refused = s.refused;
      grant(t, g, s);
      s.refused = refused ?? s.refused;
    }
    return s;
  }
  if (w(0) === "set" || w(0) === "reset") {
    const j = ["session", "local"].includes(w(1)!) ? 2 : 1;
    if (w(j) === "authorization" || w(j + 1) === "authorization") return { ...r("SESSION AUTHORIZATION"), refused: "SET SESSION AUTHORIZATION: use SET ROLE learn_… and RESET ROLE" };
    if (w(j) !== "role") return undefined;
    if (w(0) === "reset" || w(j + 1) === "none") return r("RESET ROLE");
    const s = r("SET ROLE");
    s.targets = firstParts(names(t, j + 1).items.slice(0, 1));
    s.roles.push(...s.targets);
    if (!s.targets.length) s.refused = "SET ROLE takes a role name (not a string)";
    return s;
  }
  if ((w(0) === "create" || w(0) === "alter") && w(1) === "policy") {
    const s = r("POLICY");
    const on = find(t, 2, "on");
    const to = on >= 0 ? find(t, on, "to") : -1;
    if (to >= 0) for (const { parts, isPublic } of names(t, to + 1).items) if (!isPublic) s.roles.push(parts[0]!);
    return s;
  }
  const owner = find(t, 0, "owner");
  if (owner >= 0 && w(owner + 1) === "to") {
    const s = r("OWNER TO");
    s.roles.push(...firstParts(names(t, owner + 2).items));
    return s;
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// Block rules (PV1–PV8)

/** Transaction control: first word(s) → name; ROLLBACK TO is a savepoint operation (PV7). */
function transactionControl(t: Token[]): { word: string; twoPhase: boolean } | undefined {
  const w = (i: number) => t[i]?.word;
  if (w(0) === "prepare" && w(1) === "transaction") return { word: "PREPARE TRANSACTION", twoPhase: true };
  if ((w(0) === "commit" || w(0) === "rollback") && w(1) === "prepared") return { word: `${w(0)!.toUpperCase()} PREPARED`, twoPhase: true };
  if (w(0) === "rollback" && (w(1) === "to" || w(2) === "to")) return undefined;
  if (["begin", "commit", "rollback", "start", "end", "abort"].includes(w(0)!)) return { word: w(0)!.toUpperCase(), twoPhase: false };
  return undefined;
}

const NONDETERMINISTIC: [RegExp, string][] = [
  [/\bhash\s*\(/i, "hash("],
  [/\buuid\s*\(/i, "uuid("],
  [/\bgen_random_uuid\s*\(/i, "gen_random_uuid("],
  [/\bnow\s*\(/i, "now("],
  [/\bcurrent_date\b/i, "current_date"],
  [/\bcurrent_timestamp\b/i, "current_timestamp"],
  [/\bclock_timestamp\s*\(/i, "clock_timestamp("],
  [/\bstatement_timestamp\s*\(/i, "statement_timestamp("],
  [/\btransaction_timestamp\s*\(/i, "transaction_timestamp("],
  [/\btimeofday\s*\(/i, "timeofday("],
  [/\btablesample\b/i, "TABLESAMPLE"],
];
const RANDOM = /\brandom\s*\(/i;
const SETSEED = /\bsetseed\s*\(/i;
const SET_CONFIG = /\bset_config\s*\(/i;

/**
 * Every rule a block breaks (PV1–PV8), as `q <id>: …`. `chain`: the statements its `-- after:` blocks run first, in
 * order (PV6: a setseed() there counts).
 */
export function blockRuleErrors(b: RuleBlock, chain: readonly Statement[] = []): string[] {
  const q = `q ${b.id}`;
  const errors: string[] = [];
  if (b.code.toLowerCase().includes(A2_SCHEMA)) errors.push(`${q}: names ${A2_SCHEMA} (A2's schema, which only the canary reads); never`);
  if (b.status === "untested" || b.engine === "powerbi") return errors;
  const pg = b.engine === "postgis";
  const unwrapped = b.txOwn || b.sessions.length > 0;
  let seeded = pg && chain.some((s) => SETSEED.test(codeOnly(s.text)));
  for (const s of b.statements) {
    const at = `${q}: statement ${s.n}`;
    const code = codeOnly(s.text);
    const t = tokens(s.text);
    const tx = transactionControl(t);
    if (tx?.twoPhase) errors.push(`${at} is two-phase commit (${tx.word}); never`);
    else if (tx && pg && !unwrapped) errors.push(`${at} is transaction control (${tx.word}); every block already runs inside BEGIN … ROLLBACK (else \`-- tx: own\`)`);
    if (t[0]?.word === "alter" && (t[1]?.word === "system" || t[1]?.word === "database"))
      errors.push(`${at} changes the server or the database (ALTER ${t[1].word.toUpperCase()}); never`);
    const r = roleStatement(s.text);
    if (r) {
      if (r.never) errors.push(`${at} changes privileges beyond a schema (${r.never}); never`);
      else if (!pg) errors.push(`${at} (${r.kind}) is for engine postgis`);
      else {
        for (const role of new Set(r.roles)) if (!role.startsWith(PREFIX)) errors.push(`${at} names role ${role}: every role and schema a block names starts with ${PREFIX}`);
        for (const schema of new Set(r.schemas)) if (!schema.startsWith(PREFIX)) errors.push(`${at} names schema ${schema}: every role and schema a block names starts with ${PREFIX}`);
        if (r.refused) errors.push(`${at} ${r.refused}`);
      }
    } else if (SET_CONFIG.test(code) || (pg && (t[0]?.word === "set" || t[0]?.word === "reset"))) {
      const what = SET_CONFIG.test(code) && t[0]?.word !== "set" && t[0]?.word !== "reset" ? "set_config" : t[0]!.word!.toUpperCase();
      const local = t[0]?.word === "set" && t[1]?.word === "local";
      if (!pg) errors.push(`${at} changes a setting (${what}); DuckDB keeps it past the block's ROLLBACK`);
      else if (unwrapped && !local) errors.push(`${at} changes a setting (${what}) that outlives the block's COMMIT; use SET LOCAL inside its transaction`);
    }
    for (const [re, name] of NONDETERMINISTIC) if (re.test(code)) errors.push(`${q}: not deterministic: ${name}`);
    if (RANDOM.test(code) && !seeded) errors.push(`${q}: not deterministic: random(${pg ? " without an earlier setseed(…) in the block or its `-- after:` blocks" : ""}`);
    if (pg && SETSEED.test(code)) seeded = true;
  }
  return [...new Set(errors)];
}

// ---------------------------------------------------------------------------------------------------------------
// Cleanup pairing (CL1–CL9)

/** What a block leaves behind as a learner runs it, statement by statement (`q <id>: …`; a `ran` PostGIS block). */
export function cleanupErrors(id: string, statements: readonly Statement[]): string[] {
  const q = `q ${id}`;
  const rs = statements.map((s) => roleStatement(s.text));
  const errors: string[] = [];
  const later = (i: number, kind: string, name?: string) => rs.findIndex((r, j) => j > i && r?.kind === kind && (name === undefined || r.targets.includes(name)));
  rs.forEach((r, i) => {
    if (r?.kind === "CREATE ROLE")
      for (const role of r.targets) {
        const drop = later(i, "DROP ROLE", role);
        if (drop < 0) {
          errors.push(`${q}: creates role ${role} but doesn't drop it: end the block with DROP OWNED BY ${role}; DROP ROLE ${role}`);
          continue;
        }
        // CL3: granted anything, owning anything, or set as the current role in between: DROP OWNED BY after the last use
        const uses = rs.flatMap((u, k) => (k > i && k < drop && u?.roles.includes(role) && !(["DROP OWNED", "DROP ROLE"].includes(u.kind) && u.targets.includes(role)) ? [k] : []));
        if (uses.length && !rs.some((u, m) => m > uses.at(-1)! && m < drop && u?.kind === "DROP OWNED" && u.targets.includes(role)))
          errors.push(`${q}: role ${role} was granted or owns something (statement ${statements[uses.at(-1)!]!.n}): DROP OWNED BY ${role} before its DROP ROLE`);
      }
    if (r?.kind === "CREATE SCHEMA")
      for (const schema of r.targets) if (later(i, "DROP SCHEMA", schema) < 0) errors.push(`${q}: creates schema ${schema} but doesn't drop it: end the block with DROP SCHEMA ${schema} CASCADE`);
    if (r?.kind === "SET ROLE" && later(i, "RESET ROLE") < 0) errors.push(`${q}: statement ${statements[i]!.n}: SET ROLE with no later RESET ROLE`);
  });
  return errors;
}

