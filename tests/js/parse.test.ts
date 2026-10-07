import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDesk, parseLimits, parseTicket } from "../../src/lib/parse.ts";
import { desk, T2, T3, ticket } from "./fixture.ts";

const DR = JSON.stringify(desk({ front: [T3], back: [T2], waiting_total: 2, ticket_count: 2 }));
const TR = JSON.stringify(ticket());

test("views are parsed as JSON once, or twice when the RPC double-encodes them", () => {
  assert.deepEqual(parseDesk(DR)?.front, [T3]);
  assert.equal(parseDesk(JSON.stringify(DR))?.waiting_total, 2);
  assert.equal(parseTicket(TR)?.lane, "FRONT");
  assert.equal(parseTicket(JSON.stringify(TR))?.outcome, "BLOCKS_OTHERS");
  assert.equal(parseLimits('{"max_waiting_per_wallet": 3}')?.max_waiting_per_wallet, 3);
});

test("unknown id, broken JSON or a wrong shape read as nothing", () => {
  assert.equal(parseDesk("{}"), null);
  assert.equal(parseTicket("nope"), null);
  assert.equal(parseDesk(DR.replace('"front":[', '"front":[1,')), null);
  assert.equal(parseTicket(TR.replace('"position":1', '"position":"1"')), null);
});
