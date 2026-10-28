// One text form for a result cell (spike src/format.ts cellText): the recorded results (result.ts), the E2E test hook and
// the page's cards and tables all print a value this way. Pure and import-free, so the browser bundle shares it.
// NULL as `NULL`, lists as `[a, b]`, structs as `{k: v}`, BigInt as its digits.
export function cellText(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (Array.isArray(v)) return `[${v.map(cellText).join(", ")}]`;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return `{${Object.entries(v).map(([k, x]) => `${k}: ${cellText(x)}`).join(", ")}}`;
  return String(v);
}
