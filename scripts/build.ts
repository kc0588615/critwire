// Writes the static site to dist/. Placeholder until step 3 (Postgres load + /v1 export).
import { mkdir, rm, writeFile } from "node:fs/promises";

const out = new URL("../dist/", import.meta.url);

await rm(out, { recursive: true, force: true });
await mkdir(new URL("v1/", out), { recursive: true });
await writeFile(
  new URL("index.html", out),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>critwire</title>
</head>
<body>
<h1>critwire</h1>
<p>Open species data for nature apps. Coming soon.</p>
</body>
</html>
`,
);
console.log("built dist/");
