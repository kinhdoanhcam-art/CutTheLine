// Postconditions checked AFTER the receipt says SUCCESS, against reloaded
// accepted state. A write is reported as done only when the state shows it.

import { pyStrip } from "./pytext.ts";
import type { Desk, Ticket } from "./types.ts";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function openVerified(d: Desk | null, s: { id: string; me: string; name: string }): boolean {
  return !!d && d.desk_id === s.id && same(d.owner, s.me) && d.name === pyStrip(s.name) && d.ticket_count === 0;
}

export type FileCheck = { ok: true; ticket: Ticket } | { ok: false };

/**
 * My ticket, my text, WAITING. SELF_ONLY is always BACK; BLOCKS_OTHERS is FRONT when my
 * front slot was free, otherwise BACK with note front_lane_taken.
 */
export function fileVerified(t: Ticket | null, s: { id: string; me: string; text: string; slotTaken: boolean }): FileCheck {
  if (!t || t.ticket_id !== s.id || !same(t.filer, s.me) || t.text !== pyStrip(s.text) || t.state !== "WAITING") return { ok: false };
  if (t.outcome === "SELF_ONLY" && t.lane === "BACK" && t.note === "") return { ok: true, ticket: t };
  if (t.outcome === "BLOCKS_OTHERS") {
    if (!s.slotTaken && t.lane === "FRONT" && t.note === "") return { ok: true, ticket: t };
    if (s.slotTaken && t.lane === "BACK" && t.note === "front_lane_taken") return { ok: true, ticket: t };
  }
  return { ok: false };
}

/** The ticket that was next up is now IN_PROGRESS and no longer waiting. */
export function takeVerified(after: Desk | null, expected: string, t: Ticket | null): boolean {
  return !!after && !!t && t.ticket_id === expected && t.state === "IN_PROGRESS" && after.in_progress.includes(expected) &&
    !after.front.includes(expected) && !after.back.includes(expected);
}

export function resolveVerified(t: Ticket | null): boolean {
  return !!t && t.state === "RESOLVED";
}

export function withdrawVerified(t: Ticket | null): boolean {
  return !!t && t.state === "WITHDRAWN";
}
