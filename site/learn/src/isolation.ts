// How an editor's SQL runs (plan D11), on any `exec` that runs one script and throws ScriptError ("statement n of m").
// Lesson, exercise, probe and reference runs are isolated, as learn:check runs a PostGIS block: BEGIN, the blocks
// they run after, the SQL, ROLLBACK (after an error too). Only the playground keeps its changes. The engine queues
// these one at a time; this module knows nothing of DuckDB. Tests: scripts/learn/isolation.test.ts.
import { isolatedRefusal, playgroundRefusal, readsOnly, scriptStatements, statementError } from "../../../scripts/build/learn/sql.ts";
import type { Result } from "./query-result.ts";

/** A block an isolated run runs first, by its id (or "your answer"). */
export interface Script {
  id: string;
  sql: string;
}

export type Exec = (sql: string) => Promise<Result>;

/** A block the SQL runs after failed: not the SQL's own error, so a check never reads it as the learner's. */
export class AfterError extends Error {
  readonly id: string;
  constructor(id: string, cause: Error) {
    super(`${id}, which this runs after, failed: ${cause.message}`, { cause });
    this.name = "AfterError";
    this.id = id;
  }
}

/** BEGIN or ROLLBACK itself failed: the transaction state can't be trusted, so the engine restarts. */
export class TransactionLost extends Error {
  constructor(step: "BEGIN" | "ROLLBACK", cause: Error) {
    super(`${step} failed: ${cause.message}`, { cause });
    this.name = "TransactionLost";
  }
}

/** Throws the first statement `refusal` refuses, as "statement n of m: why". */
function refuse(sql: string, refusal: (statement: string) => string | undefined): void {
  const statements = scriptStatements(sql);
  for (const s of statements) {
    const why = refusal(s.text);
    if (why) throw statementError(s, statements.length, why);
  }
}

/** Refuses, before anything runs, a statement an isolated run can't roll back, in the SQL or a block it runs after. */
function assertIsolatable(after: readonly Script[], sql: string): void {
  for (const a of after) {
    try {
      refuse(a.sql, isolatedRefusal);
    } catch (e) {
      throw new Error(`${a.id}: ${(e as Error).message}`);
    }
  }
  refuse(sql, isolatedRefusal);
}

/** BEGIN; the `after` blocks as written, in order; `sql`; ROLLBACK. The SQL's result, or its error as thrown. */
export async function runIsolated(exec: Exec, after: readonly Script[], sql: string): Promise<Result> {
  assertIsolatable(after, sql);
  try {
    await exec("BEGIN");
  } catch (e) {
    throw new TransactionLost("BEGIN", e as Error);
  }
  let result: Result | undefined;
  let error: Error | undefined;
  try {
    for (const a of after) {
      try {
        await exec(a.sql);
      } catch (e) {
        throw new AfterError(a.id, e as Error);
      }
    }
    result = await exec(sql);
  } catch (e) {
    error = e as Error;
  }
  try {
    await exec("ROLLBACK");
  } catch (e) {
    throw new TransactionLost("ROLLBACK", e as Error);
  }
  if (error) throw error;
  return result!;
}

/** The playground's refusal: transaction control, before anything runs. */
export function assertPersistable(sql: string): void {
  refuse(sql, playgroundRefusal);
}

/** Whether a playground script may change the tables: any statement that isn't readsOnly. */
export const changesTables = (sql: string) => !scriptStatements(sql).every((s) => readsOnly(s.text));
