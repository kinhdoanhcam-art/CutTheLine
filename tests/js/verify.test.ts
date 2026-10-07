// Postconditions: a write is reported as done only when the reloaded state shows it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileVerified, openVerified, resolveVerified, takeVerified, withdrawVerified } from "../../src/lib/verify.ts";
import { A, B, D, desk, T2, T3, ticket } from "./fixture.ts";

test("open desk", () => {
  assert.ok(openVerified(desk(), { id: D, me: A, name: " Platform help desk " }));
  assert.ok(!openVerified(desk({ ticket_count: 1 }), { id: D, me: A, name: "Platform help desk" }));
});

test("file: BLOCKS_OTHERS is FRONT with a free slot, BACK + front_lane_taken without; SELF_ONLY always BACK", () => {
  const s = { id: T3, me: B, text: "Main won't build, so my branch can't merge and neither can anyone else's.", slotTaken: false };
  assert.equal(fileVerified(ticket(), s).ok, true);
  assert.equal(fileVerified(ticket({ lane: "BACK", note: "front_lane_taken" }), { ...s, slotTaken: true }).ok, true);
  assert.equal(fileVerified(ticket({ lane: "BACK", note: "front_lane_taken" }), s).ok, false);
  assert.equal(fileVerified(ticket({ outcome: "SELF_ONLY", lane: "BACK" }), s).ok, true);
  assert.equal(fileVerified(ticket({ outcome: "SELF_ONLY", lane: "FRONT" }), s).ok, false);
  assert.equal(fileVerified(null, s).ok, false);
});

test("take, resolve, withdraw", () => {
  assert.ok(takeVerified(desk({ back: [T2], in_progress: [T3] }), T3, ticket({ state: "IN_PROGRESS" })));
  assert.ok(!takeVerified(desk({ front: [T3] }), T3, ticket()));
  assert.ok(resolveVerified(ticket({ state: "RESOLVED" })));
  assert.ok(!resolveVerified(ticket({ state: "IN_PROGRESS" })));
  assert.ok(withdrawVerified(ticket({ state: "WITHDRAWN" })));
});
