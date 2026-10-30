// The .ipynb writer (L4 plan §5): nbformat 4.5, kernelspec python3, every code cell unrun (no outputs, no execution
// count), `source` as lines; JSON with sorted keys, a 1-space indent (Jupyter's own) and a final newline, so the same
// cells always give the same bytes. Which cells, in which order, is assemble.ts's. Pure. Tests: notebook.test.ts.
import { sortKeys } from "../json.ts";

export interface Cell {
  /** nbformat 4.5's cell id: unique in the notebook. */
  id: string;
  type: "code" | "markdown";
  /** Its text, without a final newline. */
  source: string;
}

const CELL_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Lines as nbformat stores them: each keeps its "\n" but the last. */
const lines = (text: string) => text.split("\n").map((l, i, all) => (i < all.length - 1 ? `${l}\n` : l));

/** The notebook's file text; throws on an id nbformat refuses, or one used twice. */
export function notebook(cells: readonly Cell[]): string {
  const seen = new Set<string>();
  for (const { id } of cells) {
    if (!CELL_ID.test(id)) throw new Error(`notebook: cell id "${id}" isn't [A-Za-z0-9_-]{1,64}`);
    if (seen.has(id)) throw new Error(`notebook: cell id "${id}" twice`);
    seen.add(id);
  }
  const nb = {
    cells: cells.map(({ id, type, source }) =>
      type === "code"
        ? { cell_type: "code", execution_count: null, id, metadata: {}, outputs: [], source: lines(source) }
        : { cell_type: "markdown", id, metadata: {}, source: lines(source) }),
    metadata: { kernelspec: { display_name: "Python 3", language: "python", name: "python3" }, language_info: { name: "python" } },
    nbformat: 4,
    nbformat_minor: 5,
  };
  return JSON.stringify(sortKeys(nb), null, 1) + "\n";
}
