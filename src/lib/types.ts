// Shapes of the contract's JSON views.

export type Desk = {
  desk_id: string;
  owner: string;
  name: string;
  ticket_count: number;
  max_tickets: number;
  front_len: number;
  back_len: number;
  front_head: number;
  back_head: number;
  front: string[];
  back: string[];
  waiting_total: number;
  in_progress: string[];
};

export type Ticket = {
  ticket_id: string;
  desk_id: string;
  filer: string;
  text: string;
  outcome: "BLOCKS_OTHERS" | "SELF_ONLY" | string;
  lane: "FRONT" | "BACK" | string;
  note: "front_lane_taken" | "" | string;
  state: "WAITING" | "IN_PROGRESS" | "RESOLVED" | "WITHDRAWN" | string;
  seq: number;
  position: number;
  ahead_total: number;
};

export type TxPhase = "idle" | "checking" | "signing" | "submitted" | "delayed" | "success" | "error";

export type TxStatus = { phase: TxPhase; message: string; hash?: string; action?: string };
