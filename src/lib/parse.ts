// Contract views return JSON strings.
import type { Desk, Ticket } from "./types.ts";

function parseObject(raw: string): Record<string, unknown> | null {
  try {
    let value: unknown = JSON.parse(raw);
    if (typeof value === "string") value = JSON.parse(value);
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

const strings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");

export function parseDesk(raw: string): Desk | null {
  const o = parseObject(raw);
  if (!o || typeof o.desk_id !== "string" || typeof o.owner !== "string" || !strings(o.front) || !strings(o.back) ||
      !strings(o.in_progress) || typeof o.ticket_count !== "number") return null;
  return o as unknown as Desk;
}

export function parseTicket(raw: string): Ticket | null {
  const o = parseObject(raw);
  if (!o || typeof o.ticket_id !== "string" || typeof o.filer !== "string" || typeof o.lane !== "string" ||
      typeof o.state !== "string" || typeof o.position !== "number" || typeof o.seq !== "number") return null;
  return o as unknown as Ticket;
}

export type Limits = {
  rubric_hash?: string; contract_name?: string; version?: string; max_waiting_per_wallet?: number;
  max_request_length?: number; front_tickets_open_per_wallet?: number;
};

export function parseLimits(raw: string): Limits | null {
  return parseObject(raw) as Limits | null;
}
