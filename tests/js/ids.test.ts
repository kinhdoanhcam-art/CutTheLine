import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deskIdOf, idsFromInput, ticketIdOf } from "../../src/lib/ids.ts";

const v = JSON.parse(readFileSync(new URL("./id-vectors.json", import.meta.url), "utf8"));

test("desk ids match the contract, including whitespace and Unicode", () => {
  assert.ok(v.desks.length >= 5);
  for (const row of v.desks) assert.equal(deskIdOf(v.owner, row.name), row.desk_id, JSON.stringify(row.name));
});

test("ticket ids match the contract", () => {
  const did = v.desks[0].desk_id;
  for (const row of v.tickets) {
    assert.equal(ticketIdOf(did, v.filer, row.text), row.ticket_id, JSON.stringify(row.text));
    assert.equal(ticketIdOf(did.toUpperCase(), v.filer.toLowerCase(), row.text), row.ticket_id);
  }
});

test("the desk and tickets of the on-chain run are reproduced", () => {
  const A = "0x3065E31B1D993d7C0D59E6786844cBa56780B2d3", B = "0xdaE8968571C6E84f44F86d06F1071bbc8F807500", C = "0x579265b5718049eC4D07EED310C86E308B6d9AE1";
  const D = deskIdOf(A, "Platform help desk");
  assert.equal(D, "7d134e00b2ec562453f4f2d8e0e88593328a127598c4f180b029f1fc8d653604");
  assert.equal(ticketIdOf(D, C, "Main won't build on my laptop, so my branch can't merge."), "87bf1e94af8a950665c15d710772b9bbf96246cc311d1e29433500d838e5b9b7");
  assert.equal(ticketIdOf(D, B, "Main won't build, so my branch can't merge and neither can anyone else's."), "62e8a9d2c625c340c4e7e8981f40cadb4db184af3464f463ab6cecd578fd2cd5");
});

test("ids from links and lists", () => {
  const a = "7d134e00b2ec562453f4f2d8e0e88593328a127598c4f180b029f1fc8d653604";
  assert.deepEqual(idsFromInput(`https://x.app/?d=${a}`), [a]);
  assert.deepEqual(idsFromInput(a + "ab"), []);
});
