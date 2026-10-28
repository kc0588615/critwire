// `-- plan:` assertions (plan D4, review SC6): an EXPLAIN block is checked by what its lesson teaches, not by its text,
// which moves with versions and statistics. Three forms, on a block whose last statement is EXPLAIN (ANALYZE …):
//   `-- plan: <text>`     some plan line contains the text (a node, an index, an `Index Cond`);
//   `-- plan: no <text>`  no plan line contains it (`no Sort`, `no Seq Scan`);
//   `-- plan: rows <n>`   the top node's `actual rows=<n>`.
// Pure. blocks.ts parses and lints them; learn:check checks them against the plan PostgreSQL gives. Tests: plan.test.ts.

export type PlanAssertion = { line: number } & ({ kind: "has" | "no"; text: string } | { kind: "rows"; rows: number });

const show = (a: PlanAssertion) => `\`-- plan: ${a.kind === "rows" ? `rows ${a.rows}` : a.kind === "no" ? `no ${a.text}` : a.text}\``;

// The assertion a `-- plan:` header's value states, or why it states none. `line`: the header's 1-based line in its file.
export function parsePlanAssertion(value: string, line: number): PlanAssertion | string {
  const v = value.trim();
  if (!v) return `line ${line}: \`-- plan:\` needs <text>, no <text> or rows <n>`;
  if (v === "no" || v.startsWith("no ")) {
    const text = v.slice(2).trim();
    return text ? { kind: "no", text, line } : `line ${line}: \`-- plan: no\` needs the text no line may contain`;
  }
  if (v === "rows" || v.startsWith("rows ")) {
    const n = v.slice(4).trim();
    return /^\d+$/.test(n) ? { kind: "rows", rows: Number(n), line } : `line ${line}: \`-- plan: rows\` takes a whole number`;
  }
  return { kind: "has", text: v, line };
}

// Each assertion the plan's lines (EXPLAIN's rows, in order, the top node first) break, naming its header line.
export function planErrors(assertions: readonly PlanAssertion[], plan: readonly string[]): string[] {
  const errors: string[] = [];
  for (const a of assertions) {
    const at = `line ${a.line}: ${show(a)}`;
    if (a.kind === "rows") {
      const top = /\(actual rows=(\d+)\b/.exec(plan[0] ?? "")?.[1];
      if (top === undefined) errors.push(`${at}: the top node has no actual rows= (EXPLAIN ANALYZE prints it)`);
      else if (Number(top) !== a.rows) errors.push(`${at}: the top node has actual rows=${top}`);
    } else {
      const i = plan.findIndex((l) => l.includes(a.text));
      if (a.kind === "has" && i < 0) errors.push(`${at}: no plan line has it`);
      if (a.kind === "no" && i >= 0) errors.push(`${at}: plan line ${i + 1} has it: ${JSON.stringify(plan[i])}`);
    }
  }
  return errors;
}
