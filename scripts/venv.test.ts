// The venv check's rules (plan L4 §1, D18), pure: venvProblems over a probed state. Failure modes first:
// V1: a pin the file lists is missing from the venv, or installed at another version, and the command runs anyway (a
//     block's result then depends on whichever version is there) → refused, naming the package, its pin, what's
//     installed and pnpm learn:venv; a Python other than 3.12 (3.11, 3.13) → refused the same way; a state with every
//     pin matching → no problem.
import assert from "node:assert/strict";
import { test } from "node:test";
import { venvProblems, type VenvState } from "./venv.ts";

const state = (pins: VenvState["pins"], python = "3.12.3"): VenvState => ({ file: "site/learn/labs/requirements.txt", python, pins });
const numpy = { name: "numpy", pin: "2.5.4", installed: "2.5.4" };

test("V1: every pin matching on Python 3.12 passes", () => {
  assert.equal(venvProblems(state([numpy, { name: "esda", pin: "2.10.0", installed: "2.10.0" }]), "learn:check"), null);
});

test("V1: a missing pin is refused, naming the package, its pin and pnpm learn:venv", () => {
  const p = venvProblems(state([numpy, { name: "esda", pin: "2.10.0", installed: null }]), "learn:check");
  assert.match(p ?? "", /^learn:check: \.venv-learn doesn't match site\/learn\/labs\/requirements\.txt: esda==2\.10\.0 is missing: run pnpm learn:venv$/);
});

test("V1: a wrong-version pin is refused, naming the package, its pin and what's installed", () => {
  const p = venvProblems(state([{ name: "numpy", pin: "2.5.4", installed: "2.4.0" }]), "ingest habitat");
  assert.match(p ?? "", /^ingest habitat: .*: numpy==2\.5\.4 has 2\.4\.0 installed: run pnpm learn:venv$/);
});

test("V1: every problem is named, in the file's order", () => {
  const p = venvProblems(state([{ name: "numpy", pin: "2.5.4", installed: "2.4.0" }, { name: "esda", pin: "2.10.0", installed: null }]), "learn:check");
  assert.match(p ?? "", /numpy==2\.5\.4 has 2\.4\.0 installed; esda==2\.10\.0 is missing: run pnpm learn:venv$/);
});

for (const python of ["3.11.9", "3.13.1"]) {
  test(`V1: Python ${python} is refused`, () => {
    assert.match(venvProblems(state([numpy], python), "learn:check") ?? "", new RegExp(`Python ${python.replaceAll(".", "\\.")} \\(3\\.12 needed\\): run pnpm learn:venv$`));
  });
}
