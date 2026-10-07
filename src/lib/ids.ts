import { keccak256, stringToBytes } from "viem";
import { pyLen, pyNormalize, pyStrip } from "./pytext.ts";

// Keccak-256 (Ethereum), not NIST SHA3-256. Same payloads as the contract:
//   desk   = keccak256("BLOCKS_OTHERS:DESK:V1|" + owner_lower + "|" + len(n) + "|" + n)
//   ticket = keccak256("BLOCKS_OTHERS:TICKET:V1|" + desk_id + "|" + filer_lower + "|" + len(t) + "|" + t)
// where n and t are the desk name and the request, Python-stripped with whitespace collapsed.
export function deskIdOf(owner: string, name: string): string {
  const n = pyNormalize(pyStrip(name));
  return keccak256(stringToBytes("BLOCKS_OTHERS:DESK:V1|" + owner.toLowerCase() + "|" + pyLen(n) + "|" + n)).slice(2);
}

export function ticketIdOf(deskId: string, filer: string, text: string): string {
  const t = pyNormalize(pyStrip(text));
  return keccak256(stringToBytes("BLOCKS_OTHERS:TICKET:V1|" + deskId.toLowerCase() + "|" + filer.toLowerCase() + "|" + pyLen(t) + "|" + t)).slice(2);
}

/** Every 64-hex id found in a bare id, a 0x id, a link or a comma list. */
export function idsFromInput(value: string): string[] {
  const out: string[] = [];
  for (const m of value.matchAll(/(?<![0-9a-fA-F])([0-9a-fA-F]{64})(?![0-9a-fA-F])/g)) {
    const id = m[1].toLowerCase();
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

export function short(value: string, head = 6, tail = 4): string {
  if (!value || value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
