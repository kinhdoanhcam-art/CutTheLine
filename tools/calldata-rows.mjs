// Shared rows for tools/calldata-bytes.mjs, tools/probe-calldata.mjs and tests.
export const ID = "f".repeat(64);
export const WALLET = "0x" + "1".repeat(40);

// Every request of the test cases (each pair shares its surface).
export const CASES = {
  B1: "Main won't build, so my branch can't merge and neither can anyone else's.",
  B2: "The shared test database is down for everyone on the floor.",
  B3: "The VPN certificate expired, so remote staff can't reach the wiki.",
  B4: "Deploys to staging fail for every squad since this morning.",
  B5: "The office printer queue is jammed and the whole sales floor is waiting.",
  S1: "Main won't build on my laptop, so my branch can't merge.",
  S2: "The test database copy I reset is down after the reset.",
  S3: "The VPN certificate on this laptop expired, so the wiki won't load from home.",
  S4: "Deploys from my fork to staging fail since this morning.",
  S5: "The printer jammed on my job and I am waiting for my slides.",
};

/** HARD BLOCK: any of these over 255 bytes stops the release. */
export function hardBlockRows() {
  const rows = Object.entries(CASES).map(([name, text]) => ({ name: `file_ticket ${name}`, method: "file_ticket", args: [ID, text] }));
  rows.push({ name: "file_ticket (150-character request, the contract cap)", method: "file_ticket", args: [ID, "r".repeat(150)] });
  rows.push({ name: "open_desk (60-character name)", method: "open_desk", args: ["n".repeat(60)] });
  rows.push({ name: "take_next (id)", method: "take_next", args: [ID] });
  rows.push({ name: "resolve (id)", method: "resolve", args: [ID] });
  rows.push({ name: "withdraw_ticket (id)", method: "withdraw_ticket", args: [ID] });
  return rows;
}

/** MEASURE ONLY: non-ASCII requests take more bytes per character. */
export function measureOnlyRows() {
  return [{ name: "file_ticket with a 150-character request of 2-byte letters", method: "file_ticket", args: [ID, "é".repeat(150)] }];
}
