// gbif:register's local state (plan §6): a lock around each run and the intent written before its POST. Outside git
// (the tree must stay clean), in ${XDG_STATE_HOME:-~/.local/state}/critwire/: shared by every checkout of this OS user
// on this machine, which is why registering runs on the Oracle VPS only.
import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { formatJson } from "../json.ts";
import type { Intent } from "./register.ts";

export const stateDir = () => join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "critwire");
export const lockFile = () => join(stateDir(), "gbif-register.lock");
export const intentFile = () => join(stateDir(), "gbif-register-intent.json");

const exists = (error: unknown) => (error as NodeJS.ErrnoException).code === "EEXIST";

// Runs fn holding the lock (O_EXCL create). A held or leftover lock throws; it is never broken automatically, because
// two runs breaking it at once could both POST.
export async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  await mkdir(stateDir(), { recursive: true });
  const path = lockFile();
  let handle;
  try {
    handle = await open(path, "wx");
  } catch (error) {
    if (!exists(error)) throw error;
    const pid = (JSON.parse(await readFile(path, "utf8").catch(() => "{}")) as { pid?: number }).pid ?? "unknown";
    throw new Error(`gbif:register is running (pid ${pid}) or was killed; if pid ${pid} isn't running, delete ${path} ` +
      "and re-run (the intent still guards any POST)");
  }
  try {
    try {
      await handle.writeFile(formatJson({ pid: process.pid, startedAt: new Date().toISOString() }));
    } finally {
      await handle.close();
    }
    return await fn();
  } finally {
    await rm(path, { force: true });
  }
}

// The intent, or null when there is none. An unreadable intent throws: it counts as present.
export async function readIntent(): Promise<Intent | null> {
  const path = intentFile();
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  try {
    return JSON.parse(text) as Intent;
  } catch {
    throw new Error(`the intent ${path} is unreadable; a POST may have registered; delete it only when sure nothing was created`);
  }
}

export async function createIntent(intent: Intent): Promise<void> {
  await mkdir(stateDir(), { recursive: true });
  try {
    await writeFile(intentFile(), formatJson(intent), { flag: "wx" });
  } catch (error) {
    if (exists(error)) throw new Error(`the intent ${intentFile()} already exists`);
    throw error;
  }
}

export async function deleteIntent(): Promise<void> {
  await rm(intentFile(), { force: true });
}
