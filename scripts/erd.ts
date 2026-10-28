// pnpm erd (plan D10): draws site/learn/erd/{schema,lab,star}.svg from their .mmd, offline (learn/erd-render.ts).
// The sources are checked first (build/learn/erd.ts erdErrors, as the build checks them); only a stale SVG is drawn.
// Commit the SVGs: the build refuses a missing or stale one ("site/learn/erd/lab.svg is stale: run pnpm erd").
// Usage: pnpm erd [--force]   (--force draws all three)
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { DRAWN_ERDS, ERD_DIR, erdErrors, readErds } from "./build/learn/erd.ts";
import { writeErds } from "./learn/erd-render.ts";

try {
  const { values } = parseArgs({ options: { force: { type: "boolean", default: false } }, strict: true });
  const { texts } = await readErds();
  const errors = erdErrors(texts);
  if (errors.length) throw new Error(errors.join("\n"));
  await writeErds(fileURLToPath(new URL(`../${ERD_DIR}`, import.meta.url)), DRAWN_ERDS, { force: values.force });
} catch (e) {
  console.error(`erd: ${(e as Error).message}`);
  process.exit(1);
}
