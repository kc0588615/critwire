// Environment for the CLIs. .env is optional: a fresh clone or the offline build sets DATABASE_URL in the environment.
import { chmodSync, existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
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

// The text with the one `name=` line replaced by `name=value`, or the line appended; every other byte kept. Throws
// (naming the variable, never a value) when the text holds the variable more than once.
export function replaceEnvLine(text: string, name: string, value: string): string {
  const line = new RegExp(`^${name}=.*$`, "gm");
  const count = text.match(line)?.length ?? 0;
  if (count > 1) throw new Error(`${name} is set on ${count} lines: keep one`);
  if (count === 1) return text.replace(line, () => `${name}=${value}`);
  return `${text}${text === "" || text.endsWith("\n") ? "" : "\n"}${name}=${value}\n`;
}

// Sets one variable in an existing env file (replaceEnvLine), through a temp file in the same folder with the
// file's mode, then a rename, so a crash leaves the old file or the new one, never half of one.
export function writeEnvLine(file: string, name: string, value: string): void {
  const mode = statSync(file).mode & 0o777;
  const temp = join(dirname(file), `.${basename(file)}.${process.pid}.tmp`);
  writeFileSync(temp, replaceEnvLine(readFileSync(file, "utf8"), name, value), { mode, flag: "wx" });
  chmodSync(temp, mode);
  renameSync(temp, file);
}
