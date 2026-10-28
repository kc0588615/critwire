// DC1–DC5: a DECIMAL cell as DuckDB writes it (site/learn/src/format.ts decimalText; ported from the spike, plan S11). arrow-js gives a DECIMAL as its
// little-endian 32-bit words (two's complement) and the column's scale; without this the cell printed as `[246491, 0, 0, 0]`.
// Written before the code, seen failing first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decimalText } from "../../site/learn/src/format.ts";

const w = (...words: number[]) => Uint32Array.from(words);
const NEG = 0xffffffff;

test("DC1 a positive DECIMAL(12, 2) keeps both decimals", () => {
  assert.equal(decimalText(w(246491, 0, 0, 0), 2), "2464.91");
  assert.equal(decimalText(w(310, 0, 0, 0), 2), "3.10");
});

test("DC2 a value below one keeps its leading zero, and zero prints with its scale", () => {
  assert.equal(decimalText(w(1, 0, 0, 0), 2), "0.01");
  assert.equal(decimalText(w(0, 0, 0, 0), 2), "0.00");
});

test("DC3 a negative value (two's complement) prints with its sign", () => {
  assert.equal(decimalText(w(NEG, NEG, NEG, NEG), 2), "-0.01");
  assert.equal(decimalText(w(2 ** 32 - 246491, NEG, NEG, NEG), 2), "-2464.91");
});

test("DC4 every word counts, and scale 0 prints a whole number", () => {
  assert.equal(decimalText(w(0, 1, 0, 0), 0), "4294967296");
  assert.equal(decimalText(w(5, 0), 1), "0.5");
});

test("DC5 anything that isn't an even run of 32-bit words, or a bad scale, fails loudly", () => {
  assert.throws(() => decimalText(w(), 2), /DECIMAL/);
  assert.throws(() => decimalText(w(1, 0, 0), 2), /DECIMAL/);
  assert.throws(() => decimalText([1, 0, 0, 0] as unknown as Uint32Array, 2), /DECIMAL/);
  assert.throws(() => decimalText(w(1, 0, 0, 0), -1), /scale/);
});
