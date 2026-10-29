// The lab venv's Python for the ingests' raster and geometry work (shapes.py, habitat.py): .venv-learn/bin/python -I.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { VENV_PYTHON } from "../venv.ts";

// The command that runs `script` (a file in scripts/ingest/) with the venv's Python, isolated (-I).
export const venvPython = (script: string): string[] =>
  [VENV_PYTHON, "-I", fileURLToPath(new URL(script, import.meta.url))];

// Runs python + args; returns its stdout. Throws on a spawn error, a non-zero exit or `signal`'s abort (the child is
// killed). Its stderr goes to ours. `name` labels the errors.
export function runPython(name: string, python: string[], args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(python[0], [...python.slice(1), ...args], { stdio: ["ignore", "pipe", "inherit"], signal });
    let out = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => { out += d; });
    child.on("error", (e) => reject(new Error(`${name}: ${e.message}${e.name === "AbortError" ? "" : " (run pnpm learn:venv)"}`)));
    child.on("close", (code, sig) => (code === 0 ? resolve(out) : reject(new Error(`${name} exited ${code ?? sig}`))));
  });
}
