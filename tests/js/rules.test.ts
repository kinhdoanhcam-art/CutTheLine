// Every predictable revert, in the contract's own order, with its exact sentence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  fileBlock, frontSlotTaken, myWaiting, nextUp, openBlock, placeLine, RESERVED_TOKENS, resolveBlock, REVERTS, takeBlock, UI, withdrawBlock,
} from "../../src/lib/rules.ts";
import { A, B, C, desk, T2, T3, ticket } from "./fixture.ts";

const contract = readFileSync(new URL("../../contracts/BlocksOthers.py", import.meta.url), "utf8");

test("every revert sentence is the contract's own, and every contract revert is mirrored", () => {
  const inContract = [...contract.matchAll(/UserError\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(Object.values(REVERTS))].sort(), [...new Set(inContract)].sort());
});

test("reserved tokens equal the contract's", () => {
  for (const t of RESERVED_TOKENS) assert.ok(contract.includes(`"${t}"`), t);
});

test("open_desk: name -> reserved -> exists", () => {
  assert.equal(openBlock(A, "Platform help desk", false), null);
  assert.equal(openBlock("", "x", false), UI.noWallet);
  assert.equal(openBlock(A, " 　 ", false), REVERTS.nameEmpty);
  assert.equal(openBlock(A, "n".repeat(61), false), REVERTS.nameTooLong);
  assert.equal(openBlock(A, "a self_only desk", false), REVERTS.reserved);
  assert.equal(openBlock(A, "x", true), REVERTS.deskExists);
});

test("file_ticket: three waiting -> desk full -> text -> reserved -> filed before -> bytes", () => {
  const ok = { me: B, desk: desk(), mine: 0, text: "Main won't build.", exists: false, bytes: 120 };
  assert.equal(fileBlock(ok), null);
  assert.equal(fileBlock({ ...ok, desk: null }), UI.noDesk);
  assert.equal(fileBlock({ ...ok, mine: 3 }), REVERTS.threeWaiting);
  assert.equal(fileBlock({ ...ok, mine: 3, text: "" }), REVERTS.threeWaiting, "cap is checked before the text");
  assert.equal(fileBlock({ ...ok, desk: desk({ ticket_count: 200 }) }), REVERTS.deskFull);
  assert.equal(fileBlock({ ...ok, text: "  " }), REVERTS.requestEmpty);
  assert.equal(fileBlock({ ...ok, text: "r".repeat(151) }), REVERTS.requestTooLong);
  assert.equal(fileBlock({ ...ok, text: "it blocks_others" }), REVERTS.reserved);
  assert.equal(fileBlock({ ...ok, exists: true }), REVERTS.alreadyFiled);
  assert.equal(fileBlock({ ...ok, bytes: 256 }), UI.tooManyBytes);
});

test("take_next: owner, then something waiting; FRONT before BACK (the on-chain rows 6–8)", () => {
  const d = desk({ front: [T3], back: [T2] });
  assert.equal(takeBlock(d, A), null);
  assert.equal(takeBlock(d, B), REVERTS.onlyOwnerTake);
  assert.equal(takeBlock(desk(), A), REVERTS.noneWaiting);
  assert.equal(nextUp(d), T3);
  assert.equal(nextUp(desk({ back: [T2] })), T2);
  assert.equal(nextUp(desk()), "");
});

test("resolve and withdraw (the on-chain row 9)", () => {
  assert.equal(resolveBlock(ticket({ state: "IN_PROGRESS" }), desk(), A), null);
  assert.equal(resolveBlock(ticket({ state: "IN_PROGRESS" }), desk(), C), REVERTS.onlyOwnerResolve);
  assert.equal(resolveBlock(ticket(), desk(), A), REVERTS.notInProgress);
  assert.equal(withdrawBlock(ticket(), B), null);
  assert.equal(withdrawBlock(ticket(), C), REVERTS.onlyFiler);
  assert.equal(withdrawBlock(ticket({ filer: C, state: "IN_PROGRESS" }), C), REVERTS.onlyWaiting);
});

test("my waiting count, my front slot, and the place line", () => {
  const ts = [ticket(), ticket({ ticket_id: "x", lane: "BACK", note: "front_lane_taken" }), ticket({ ticket_id: "y", filer: C, lane: "BACK", outcome: "SELF_ONLY" })];
  assert.equal(myWaiting(ts, B), 2);
  assert.ok(frontSlotTaken(ts, B));
  assert.ok(!frontSlotTaken(ts, C));
  assert.ok(frontSlotTaken([ticket({ state: "IN_PROGRESS" })], B), "held while in progress");
  assert.ok(!frontSlotTaken([ticket({ state: "RESOLVED" })], B), "freed on resolve");
  assert.equal(placeLine(ticket()), "Next up");
  assert.equal(placeLine(ticket({ lane: "BACK", position: 3, ahead_total: 3 })), "3 ahead · #3 in BACK");
});
