// Mirrors every revert of contracts/BlocksOthers.py that can be predicted from state
// already read, in the SAME order the contract checks them. Whether a problem stops
// others is NEVER decided here: only validators decide that, inside file_ticket().
// The outcome and the lane are read back from the view.

import { pyContainsToken, pyLen, pyStrip } from "./pytext.ts";
import type { Desk, Ticket } from "./types.ts";

export const MAX_DESK_NAME_LENGTH = 60;
export const MAX_REQUEST_LENGTH = 150;
export const MAX_WAITING_PER_WALLET = 3;
export const MAX_TICKETS_PER_DESK = 200;

export const RESERVED_TOKENS = [
  "<UNTRUSTED_DESK>", "</UNTRUSTED_DESK>", "<UNTRUSTED_REQUEST>", "</UNTRUSTED_REQUEST>", "BLOCKS_OTHERS", "SELF_ONLY",
] as const;

export const REVERTS = {
  nameEmpty: "Desk name is empty",
  nameTooLong: "Desk name is too long",
  reserved: "Text contains a reserved token",
  deskExists: "This desk already exists",
  unknownDesk: "Unknown desk id",
  threeWaiting: "You already have three tickets waiting",
  deskFull: "This desk is full",
  requestEmpty: "Request is empty",
  requestTooLong: "Request is too long",
  alreadyFiled: "You have already filed this request",
  onlyOwnerTake: "Only the desk owner may take tickets",
  noneWaiting: "No tickets are waiting",
  unknownTicket: "Unknown ticket id",
  onlyOwnerResolve: "Only the desk owner may resolve tickets",
  notInProgress: "This ticket is not in progress",
  onlyFiler: "Only the filer may withdraw this ticket",
  onlyWaiting: "Only a waiting ticket can be withdrawn",
} as const;

/** UI-only reasons (the contract never sees these calls). */
export const UI = {
  noWallet: "Connect a wallet first",
  noDesk: "Open a desk first",
  tooManyBytes: "This text is over the 255-byte calldata limit; shorten it",
} as const;

const same = (a: string, b: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** open_desk order: name 1–60 -> reserved -> not opened before. */
export function openBlock(me: string, name: string, exists: boolean): string | null {
  if (!me) return UI.noWallet;
  const n = pyStrip(name);
  if (pyLen(n) === 0) return REVERTS.nameEmpty;
  if (pyLen(n) > MAX_DESK_NAME_LENGTH) return REVERTS.nameTooLong;
  if (pyContainsToken(n, RESERVED_TOKENS)) return REVERTS.reserved;
  if (exists) return REVERTS.deskExists;
  return null;
}

/** How many of my tickets wait at this desk (every waiting ticket is listed in front or back). */
export function myWaiting(waiting: Ticket[], me: string): number {
  return waiting.filter((t) => t.state === "WAITING" && same(t.filer, me)).length;
}

export type FileInput = { me: string; desk: Desk | null; mine: number; text: string; exists: boolean; bytes: number };

/** file_ticket order: desk -> fewer than 3 waiting -> desk not full -> text 1–150 -> reserved -> not filed before. */
export function fileBlock(i: FileInput): string | null {
  if (!i.me) return UI.noWallet;
  if (!i.desk) return UI.noDesk;
  if (i.mine >= MAX_WAITING_PER_WALLET) return REVERTS.threeWaiting;
  if (i.desk.ticket_count >= MAX_TICKETS_PER_DESK) return REVERTS.deskFull;
  const t = pyStrip(i.text);
  if (pyLen(t) === 0) return REVERTS.requestEmpty;
  if (pyLen(t) > MAX_REQUEST_LENGTH) return REVERTS.requestTooLong;
  if (pyContainsToken(t, RESERVED_TOKENS)) return REVERTS.reserved;
  if (i.exists) return REVERTS.alreadyFiled;
  if (i.bytes > 255) return UI.tooManyBytes;
  return null;
}

/** take_next order: owner -> something waiting. */
export function takeBlock(d: Desk, me: string): string | null {
  if (!me) return UI.noWallet;
  if (!same(d.owner, me)) return REVERTS.onlyOwnerTake;
  if (d.front.length + d.back.length === 0) return REVERTS.noneWaiting;
  return null;
}

/** The ticket take_next will take: the earliest FRONT ticket, else the earliest BACK one. */
export function nextUp(d: Desk): string {
  return d.front[0] ?? d.back[0] ?? "";
}

/** resolve order: owner -> IN_PROGRESS. */
export function resolveBlock(t: Ticket, d: Desk | null, me: string): string | null {
  if (!me) return UI.noWallet;
  if (!d || !same(d.owner, me)) return REVERTS.onlyOwnerResolve;
  if (t.state !== "IN_PROGRESS") return REVERTS.notInProgress;
  return null;
}

/** withdraw_ticket order: filer -> WAITING. */
export function withdrawBlock(t: Ticket, me: string): string | null {
  if (!me) return UI.noWallet;
  if (!same(t.filer, me)) return REVERTS.onlyFiler;
  if (t.state !== "WAITING") return REVERTS.onlyWaiting;
  return null;
}

/** Whether my front slot at this desk is taken (an open FRONT ticket, waiting or in progress). */
export function frontSlotTaken(open: Ticket[], me: string): boolean {
  return open.some((t) => t.lane === "FRONT" && (t.state === "WAITING" || t.state === "IN_PROGRESS") && same(t.filer, me));
}

export function placeLine(t: Ticket): string {
  if (t.state === "WAITING") return t.ahead_total === 0 ? "Next up" : `${t.ahead_total} ahead · #${t.position} in ${t.lane}`;
  if (t.state === "IN_PROGRESS") return "Being handled";
  if (t.state === "RESOLVED") return "Resolved";
  return "Withdrawn";
}
