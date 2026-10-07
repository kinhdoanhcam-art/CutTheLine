// Calldata size of every write method, encoded exactly as genlayer-js 1.1.8 does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calldataBytes, CALLDATA_LIMIT } from "../../src/lib/calldata.ts";
import { CASES, hardBlockRows, ID } from "../../tools/calldata-rows.mjs";

test("ten case requests + every write at its cap stay under 255 bytes", () => {
  assert.equal(Object.keys(CASES).length, 10);
  for (const row of hardBlockRows()) {
    const n = calldataBytes(row.method, row.args);
    assert.ok(n <= CALLDATA_LIMIT, `${row.name}: ${n} bytes`);
  }
});

test("non-ASCII requests can pass the cliff, so the meter must catch them", () => {
  assert.ok(calldataBytes("file_ticket", [ID, "é".repeat(150)]) > CALLDATA_LIMIT);
});
