// Environment for the CLIs. .env is optional: a fresh clone or the offline build sets DATABASE_URL in the environment.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// Loads the file (./.env) when it exists; variables already set win. Each one both set to different values is logged
// by name and winning source only, never a value or any part of one.
export function loadEnv(file = ".env"): void {
  if (!existsSync(file)) return;
  for (const [name, value] of Object.entries(parseEnv(readFileSync(file, "utf8")))) {
    const current = process.env[name];
    if (current === undefined) process.env[name] = value;
    else if (current !== value) console.error(`env: ${name} from the environment (overrides ${file})`);
  }
}

// The variable's value; throws naming it when unset or empty.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} not set`);
  return value;
}
