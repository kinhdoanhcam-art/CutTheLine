// get_desk / get_ticket views as the contract returns them.
import type { Desk, Ticket } from "../../src/lib/types.ts";

export const A = "0x3065e31b1d993d7c0d59e6786844cba56780b2d3";
export const B = "0xdae8968571c6e84f44f86d06f1071bbc8f807500";
export const C = "0x579265b5718049ec4d07eed310c86e308b6d9ae1";
export const D = "7d134e00b2ec562453f4f2d8e0e88593328a127598c4f180b029f1fc8d653604";
export const T2 = "87bf1e94af8a950665c15d710772b9bbf96246cc311d1e29433500d838e5b9b7";
export const T3 = "62e8a9d2c625c340c4e7e8981f40cadb4db184af3464f463ab6cecd578fd2cd5";

export function desk(over: Partial<Desk> = {}): Desk {
  return {
    desk_id: D, owner: A, name: "Platform help desk", ticket_count: 0, max_tickets: 200, front_len: 0, back_len: 0,
    front_head: 0, back_head: 0, front: [], back: [], waiting_total: 0, in_progress: [], ...over,
  };
}

export function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    ticket_id: T3, desk_id: D, filer: B, text: "Main won't build, so my branch can't merge and neither can anyone else's.",
    outcome: "BLOCKS_OTHERS", lane: "FRONT", note: "", state: "WAITING", seq: 2, position: 1, ahead_total: 0, ...over,
  };
}
