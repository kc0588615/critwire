// Cell text the engine and the cards need beyond scripts/learn/cell.ts's cellText (spike src/format.ts, plan D11): a DECIMAL
// as DuckDB writes it, and HTML escaping. Pure. Tests: scripts/learn/format.test.ts, cards.test.ts.

/** A DECIMAL cell as DuckDB writes it (`2464.91`, `-0.01`): arrow-js's little-endian 32-bit words (two's complement) and the scale. */
export function decimalText(words: Uint32Array, scale: number): string {
  if (!(words instanceof Uint32Array) || words.length === 0 || words.length % 2 !== 0)
    throw new Error(`DECIMAL cell: expected an even run of 32-bit words, got ${Object.prototype.toString.call(words)} of ${(words as ArrayLike<number>).length}`);
  if (!Number.isInteger(scale) || scale < 0) throw new Error(`DECIMAL cell: bad scale ${scale}`);
  let n = 0n;
  for (let i = words.length - 1; i >= 0; i--) n = (n << 32n) | BigInt(words[i]!);
  const bits = BigInt(words.length * 32);
  if (n >> (bits - 1n)) n -= 1n << bits;
  const digits = (n < 0n ? -n : n).toString().padStart(scale + 1, "0");
  const whole = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits;
  return n < 0n ? `-${whole}` : whole;
}

/** HTML-escapes text for element content and double-quoted attributes. */
export function esc(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
