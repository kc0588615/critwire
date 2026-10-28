// Local state for GBIF writes (plan §6, D8): a lock around each run and the intent written before its POST, one pair
// per name (gbif:register's countries target, the sample download, …). Outside git (the tree must stay clean), in
// ${XDG_STATE_HOME:-~/.local/state}/critwire/: shared by every checkout of this OS user on this machine, which is why
// these runs happen on the Oracle VPS only.
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { formatJson } from "../json.ts";
import type { Intent } from "./register.ts";

export const stateDir = () => join(process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"), "critwire");

const code = (error: unknown) => (error as NodeJS.ErrnoException).code;

// The lock and intent helpers for `name` (files <name>.lock and <name>-intent.json); `label` names the run in errors.
export function namedState<T>(name: string, label: string) {
  const lockFile = () => join(stateDir(), `${name}.lock`);
  const intentFile = () => join(stateDir(), `${name}-intent.json`);

  // Runs fn holding the lock (O_EXCL create). A held or leftover lock throws; it is never broken automatically, because
  // two runs breaking it at once could both POST.
  async function withLock<R>(fn: () => Promise<R>): Promise<R> {
    await mkdir(stateDir(), { recursive: true });
    const path = lockFile();
    let handle;
    try {
      handle = await open(path, "wx");
    } catch (error) {
      if (code(error) !== "EEXIST") throw error;
      const pid = (JSON.parse(await readFile(path, "utf8").catch(() => "{}")) as { pid?: number }).pid ?? "unknown";
      throw new Error(`${label} is running (pid ${pid}) or was killed; if pid ${pid} isn't running, delete ${path} ` +
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
  async function readIntent(): Promise<T | null> {
    const path = intentFile();
    let text: string;
    try {
      text = await readFile(path, "utf8");
    } catch (error) {
      if (code(error) === "ENOENT") return null;
      throw error;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`the intent ${path} is unreadable; a POST may have created something; delete it only when sure nothing was created`);
    }
  }

  async function createIntent(intent: T): Promise<void> {
    await mkdir(stateDir(), { recursive: true });
    try {
      await writeFile(intentFile(), formatJson(intent), { flag: "wx" });
    } catch (error) {
      if (code(error) === "EEXIST") throw new Error(`the intent ${intentFile()} already exists`);
      throw error;
    }
  }

  // Replaces an existing intent whole (temp file, then rename: a crash leaves the old one or the new one).
  async function replaceIntent(intent: T): Promise<void> {
    const path = intentFile();
    if ((await readIntent()) === null) throw new Error(`no intent ${path} to replace`);
    const tmp = `${path}.tmp-${process.pid}`;
    await writeFile(tmp, formatJson(intent));
    await rename(tmp, path);
  }

  async function deleteIntent(): Promise<void> {
    await rm(intentFile(), { force: true });
  }

  return { lockFile, intentFile, withLock, readIntent, createIntent, replaceIntent, deleteIntent };
}

// gbif:register's countries target: gbif-register.lock and gbif-register-intent.json.
export const { lockFile, intentFile, withLock, readIntent, createIntent, deleteIntent } = namedState<Intent>("gbif-register", "gbif:register");
