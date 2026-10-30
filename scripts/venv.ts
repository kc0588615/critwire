// The lab venv (.venv-learn, pnpm learn:venv) and its check (plan L4 §1, D18). Two requirements files, one venv: the
// labs' (published as /learn/labs/requirements.txt) and the ingests' (rasterio, constrained by the labs' pins). Each
// command checks the file it needs: learn:check the labs', ingest shapes/habitat the ingests'.
import { execFile } from "node:child_process";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
export const VENV_PYTHON = fileURLToPath(new URL("../.venv-learn/bin/python", import.meta.url));
export const LABS_REQUIREMENTS = fileURLToPath(new URL("../site/learn/labs/requirements.txt", import.meta.url));
export const INGEST_REQUIREMENTS = fileURLToPath(new URL("ingest/requirements.txt", import.meta.url));
const PYTHON_MINOR = "3.12";

export type VenvPin = { name: string; pin: string; installed: string | null };
// The venv's Python and, for each pin of `file` whose marker holds there, the installed version (null: missing).
export type VenvState = { file: string; python: string; pins: VenvPin[] };

// Reads `name==version[ ; marker]` lines (comments and `# via` lines skipped) through packaging, as pip would.
const PROBE = `
import json, platform, sys
from importlib.metadata import PackageNotFoundError, version
from packaging.requirements import InvalidRequirement, Requirement
pins = []
for line in open(sys.argv[1], encoding="utf-8"):
    if not line.strip() or line[0] in "# \\t": continue
    try: r = Requirement(line.strip())
    except InvalidRequirement: r = None
    spec = list(r.specifier) if r else []
    if len(spec) != 1 or spec[0].operator != "==": sys.exit(f"{sys.argv[1]}: not a pin: {line.strip()}")
    if r.marker and not r.marker.evaluate(): continue
    try: installed = version(r.name)
    except PackageNotFoundError: installed = None
    pins.append({"name": r.name, "pin": spec[0].version, "installed": installed})
print(json.dumps({"python": platform.python_version(), "pins": pins}))
`;

// One isolated probe in the venv. Throws when it can't run (no venv, no packaging, a line that isn't a pin).
export function venvState(file: string, python = VENV_PYTHON): Promise<VenvState> {
  return new Promise((resolve, reject) => {
    execFile(python, ["-I", "-c", PROBE, file], { timeout: 60_000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim().split("\n").at(-1) || error.message));
      else resolve({ file, ...(JSON.parse(stdout) as Omit<VenvState, "file">) });
    });
  });
}

// The refusal for `who` when the venv breaks a rule (a pin missing or at another version, a Python other than 3.12),
// else null.
export function venvProblems({ file, python, pins }: VenvState, who: string): string | null {
  const problems = [
    ...(python.split(".").slice(0, 2).join(".") === PYTHON_MINOR ? [] : [`Python ${python} (${PYTHON_MINOR} needed)`]),
    ...pins.filter((p) => p.installed !== p.pin).map((p) => `${p.name}==${p.pin} ${p.installed === null ? "is missing" : `has ${p.installed} installed`}`),
  ];
  return problems.length ? `${who}: .venv-learn doesn't match ${relative(repo, file)}: ${problems.join("; ")}: run pnpm learn:venv` : null;
}

// The venv's state once it matches `file`; throws venvProblems' refusal, or why the check couldn't run.
export async function readVenv(file: string, who: string, python = VENV_PYTHON): Promise<VenvState> {
  const state = await venvState(file, python).catch((e: Error) => {
    throw new Error(`${who}: .venv-learn: the venv check couldn't run (${e.message}): run pnpm learn:venv`);
  });
  const problem = venvProblems(state, who);
  if (problem) throw new Error(problem);
  return state;
}

// Throws readVenv's refusal.
export async function assertVenv(file: string, who: string, python = VENV_PYTHON): Promise<void> {
  await readVenv(file, who, python);
}
