// Environment for the CLIs. .env is optional: a fresh clone or the offline build sets DATABASE_URL in the environment.
import { existsSync } from "node:fs";

// Loads ./.env when it exists; variables already set win.
export function loadEnv(): void {
  if (existsSync(".env")) process.loadEnvFile(".env");
}

// The variable's value; throws naming it when unset or empty.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} not set`);
  return value;
}
