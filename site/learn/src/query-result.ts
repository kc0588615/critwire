// A query's result as the engine returns it (plan D11). Import-free, so the pure modules (cards, check, csv,
// isolation) and their Node tests use it without the engine.

/** Rows a statement keeps; the rest of its result is never read. */
export const ROW_CAP = 10_000;

export interface Result {
  columns: string[];
  rows: unknown[][];
  /** Set when the last statement had more than ROW_CAP rows; `rows` holds the first ROW_CAP. */
  truncated?: true;
}
