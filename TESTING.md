# TESTING

```
COMPILE PASS ≠ RUNTIME PASS
SUBMITTED ≠ ACCEPTED ≠ FINALIZED ≠ EXECUTION SUCCESS ≠ POSTCONDITION PASS
```

## Automated gates (run before release; CI runs them on every push)

| Gate | Command | Result |
|---|---|---|
| Kill-set + rubric gate | `python3 BLOCKSOTHERS_KILLSET_CHECK.py contracts/BlocksOthers.py` | rc 0 — no word or word pair separates the classes; the rubric shares no content word with any case |
| genvm-linter | `python3 -m genvm_linter.cli lint contracts/BlocksOthers.py` | pass |
| Contract tests (Direct Mode: the real py-genlayer v0.2.16 SDK, model mocked) | `python3 -m pytest tests/contract -q -p no:cacheprovider` | 56 passed |
| Mutation check | `python3 tools/mutate.py .` | 33/33 deliberate faults caught |
| Frontend build | `npm run build` | rc 0 |
| Frontend tests | `npm test` | 45 passed |
| Source hash | `npm run verify:source` | `contracts/BlocksOthers.py` matches `SOURCE_SHA256.txt` |
| Calldata table | `node tools/calldata-bytes.mjs` | every write ≤ 255 bytes (largest: `file_ticket` at the 150-character cap, 249) |
| Calldata on the RPC | `node tools/probe-calldata.mjs <address>` | runs in CI against both addresses in `deployments.json` |

The mocked model labels drive the deterministic code paths; they say nothing about what the real model returns. The
on-chain runs do.

### What the mutation check catches

Each fault is applied to the contract alone and the suite must go red (`tests/mutations.py`): BLOCKS_OTHERS never
reaching FRONT, SELF_ONLY also going FRONT, no per-wallet front slot, the front slot not recorded, the note
`front_lane_taken` not set, the lane overwriting the outcome, BACK served before FRONT, the BACK lane served last-in
first-out, the head pointer not skipping withdrawn tickets, the front slot freed on take or not freed on resolve or
withdraw, a BACK withdrawal freeing the front slot, the waiting cap off by one or not reduced on take or withdraw, the
desk cap off by one or checked before the waiting cap, the fail-safe flipped, an unknown label read as BLOCKS_OTHERS,
the validator accepting any label, anyone taking, resolving or withdrawing, an in-progress ticket withdrawn, a waiting
ticket resolved, the same request filed twice, the ticket id ignoring whitespace, the reserved-token check dropped on
desk names, the request cap off by one, a single-pass fence, and a wallet or the lane state leaking into the prompt.

### Calldata

Encoded exactly as genlayer-js 1.1.8 `writeContract` does. The ten case requests measure 154–176 bytes; `file_ticket` at
the 150-character cap 249. A request of non-ASCII letters takes more bytes per character, so the ticket box shows a byte
meter and disables *File ticket* above 255 bytes.

## Frontend checks

- **Revert sentences** (`tests/js/rules.test.ts`): the set in `src/lib/rules.ts` equals the 17 sentences in the source,
  and for every write the UI reports the earliest failing check in the source's order — the waiting cap before the text,
  the owner before the state.
- **Ids** (`tests/js/ids.test.ts`): desk and ticket ids equal to vectors produced by the contract on the real SDK
  (whitespace, Unicode) and to the on-chain run.
- **Postconditions** (`tests/js/verify.test.ts`): a filing is reported only when the verdict and the lane agree with the
  filer's front slot (FRONT when free; BACK with `front_lane_taken` when taken; SELF_ONLY always BACK); a take only when
  the next-up ticket is in progress and no longer waiting.
- **Receipts** (`tests/js/receipt.test.ts`): a leader SUCCESS while validators are still proposing, committing or
  revealing is pending, not success.
- **Interface check** (Playwright against `vite preview`, the RPC mocked by decoding calldata): overview, a desk seen by
  the owner (next-up ticket, *Take next*) and by two filers (waiting count, front slot, *Withdraw*, *Take next* refused),
  typing a request key by key, and 390 px — no page error, no horizontal scroll.

## On-chain runs

See `RUNTIME_EVIDENCE.md`: the Intelligent Contract run (12 transactions in the table, every must-verify row PASS) and
the Project run through this app, one hash per row.

Intelligent Contract run: S1 (filed first) → SELF_ONLY in BACK and B1 (filed after) → BLOCKS_OTHERS in FRONT; B2 from the
same wallet → BLOCKS_OTHERS in BACK with `front_lane_taken`; `take_next` served B1 before S1; a second wallet's B4 got
its own front slot and was taken before two BACK tickets: **PASS**.

## Consensus behaviour

The model is called once per ticket. Validators re-run the reading and must agree on the exact label; a disagreement
rotates the leader or ends the transaction without recording the ticket. Every other write is deterministic.

## What this run does NOT prove

- Each case is sent once; label stability across repeated runs or validator sets is not measured.
- Prompt-injection resistance rests on the fence and the reserved-token check; no adversarial model run is done.
