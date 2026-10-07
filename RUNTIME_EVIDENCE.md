# RUNTIME_EVIDENCE

```
COMPILE PASS ≠ RUNTIME PASS
SUBMITTED ≠ ACCEPTED ≠ FINALIZED ≠ EXECUTION SUCCESS ≠ POSTCONDITION PASS
```

Both deployments run the same frozen source, SHA-256 `00ef977e0d60b14a09b56e785f861503b24a68ea70ac136e1f9d6c988bda2f01`.

## Project run (address `0x14A9da6B5566f79C38b79368f6d109e43fEa792a`, through this app)

Deploy tx [`0x2b499ddf…2a9f58eb`](https://explorer-studio.genlayer.com/tx/0x2b499ddf08701eb92c5f69be8fe3cce2946ba3afd89644c2f306ff642a9f58eb). The run through the app is recorded here once it has been made.

## Intelligent Contract run (address `0xaD4Da7C64122D5F228F937b5d1532686468c5cCA`, Studio)

Wallets: **A** = desk owner `0x3065E31B1D993d7C0D59E6786844cBa56780B2d3` · **B** = filer `0xdaE8968571C6E84f44F86d06F1071bbc8F807500` · **C** = filer `0x579265b5718049eC4D07EED310C86E308B6d9AE1`. Contract [`0xaD4Da7C64122D5F228F937b5d1532686468c5cCA`](https://explorer-studio.genlayer.com/address/0xaD4Da7C64122D5F228F937b5d1532686468c5cCA) · deploy tx [`0x90c8ece7…b3b918fe`](https://explorer-studio.genlayer.com/tx/0x90c8ece7dfe7a3a8d466538f0e75e5da75a0061d7c3651f3e89a32eab3b918fe) · source SHA-256 `00ef977e0d60b14a09b56e785f861503b24a68ea70ac136e1f9d6c988bda2f01`. Run date 2026-10-07, GenLayer Studio, Normal (Full Consensus).

Every ticket is filed at the desk `Platform help desk` (D) and judged together with that desk name. The verdict (`outcome`) and the lane (`lane`) are separate fields: row 4 expects `BLOCKS_OTHERS` in the BACK lane with note `front_lane_taken`, because B's first ticket already holds B's one front slot at this desk. Ticket ids T2–T11 are named after the row that files them.

The table has 13 rows and 12 transactions, all FINALIZED.

| # | Wallet | Call | Expected | Tx hash | Result |
|---|---|---|---|---|---|
| 1 | A | `open_desk("Platform help desk")` | desk D, no tickets | [`0x58973c4a…16264b16`](https://explorer-studio.genlayer.com/tx/0x58973c4a9dc61361681f936d9ec2c1d177050a4ec2aae7fbfbb9054c16264b16) | SUCCESS; get_desk(D): no tickets, front [], back [] |
| 2 | C | `file_ticket(D, S1)` | SELF_ONLY → BACK lane, position 1 — **Check 1b** | [`0x4624da0c…c5451a34`](https://explorer-studio.genlayer.com/tx/0x4624da0cf7262772b73ecd9b1a023afd3c2a4468aac870a40d11ea71c5451a34) | **SELF_ONLY**; lane BACK, position 1, ahead_total 0 |
| 3 | B | `file_ticket(D, B1)` | BLOCKS_OTHERS → FRONT lane, position 1 (ahead_total 0, though filed after C) — **Check 1a** | [`0xb7aa0426…891a424e`](https://explorer-studio.genlayer.com/tx/0xb7aa0426dc45dcac451bcad5a99d6208c214963d84ec2a6107e9f5ea891a424e) | **BLOCKS_OTHERS**; lane **FRONT**, position 1, ahead_total 0 (filed after C) |
| 4 | B | `file_ticket(D, B2)` | outcome BLOCKS_OTHERS but BACK lane, note front_lane_taken — **Check 2a** | [`0x053f5f99…e841a5ee`](https://explorer-studio.genlayer.com/tx/0x053f5f993d5abf0eeaf3219a0650f4abc8937345b4c0bcee1bf5260fe841a5ee) | **BLOCKS_OTHERS**; lane **BACK**, note **front_lane_taken**, position 2 |
| 5 | C | `file_ticket(D, S2)` | SELF_ONLY → BACK lane (position 3) — **Check 2b** | [`0x88cbf4f2…145fd274`](https://explorer-studio.genlayer.com/tx/0x88cbf4f2fbf8a46221b6db39b5ee53b44a8ca93df1825a4f95ae476d145fd274) | **SELF_ONLY**; lane BACK, position 3, ahead_total 3 |
| 6 | A | `take_next(D)` | takes B's ticket T3 (row 3) → IN_PROGRESS — **Check 3** | [`0xe104bfe7…60b29699`](https://explorer-studio.genlayer.com/tx/0xe104bfe7f568df36fb99ade7e68808b40feeb7fe7d111644e5866ba160b29699) | SUCCESS; T3 (B, FRONT) IN_PROGRESS — taken before C's earlier T2 |
| 7 | A | `take_next(D)` | takes C's ticket T2 (row 2) → IN_PROGRESS — **Check 3** | [`0xad7d5c5a…a1189f69`](https://explorer-studio.genlayer.com/tx/0xad7d5c5a471e919aa0ca5135c9f9ea7e2cfd62812ce6146458f8ae67a1189f69) | SUCCESS; T2 (C, BACK) IN_PROGRESS |
| 8 | B | `take_next(D)` | revert *Only the desk owner may take tickets* | [`0xdec1ef90…04d32bae`](https://explorer-studio.genlayer.com/tx/0xdec1ef90eb3bf90683cb528aeebaddb691936980a87a78c06bff842204d32bae) | reverted, *Only the desk owner may take tickets* |
| 9 | C | `withdraw_ticket(T2)` | revert *Only a waiting ticket can be withdrawn* | [`0xe8818377…f7670bb8`](https://explorer-studio.genlayer.com/tx/0xe8818377763a9cd1e42499ba629f549084540fad4cc178138026535bf7670bb8) | reverted, *Only a waiting ticket can be withdrawn* |
| 10 | A | `resolve(T3)` | T3 RESOLVED; B's front slot is free, T4 stays in BACK | [`0xaf9ef968…9e55ce26`](https://explorer-studio.genlayer.com/tx/0xaf9ef968a99b71bf3d0c9cf8696f6cce3e677a9c9134a11edf1917ef9e55ce26) | SUCCESS; T3 RESOLVED |
| 11 | C | `file_ticket(D, B4)` | BLOCKS_OTHERS → FRONT lane (C's own slot) — **Check 3** | [`0x62d310d8…a758116b`](https://explorer-studio.genlayer.com/tx/0x62d310d8ad219db19006026ae3491ae59764930c57d137ccd1a4da03a758116b) | **BLOCKS_OTHERS**; lane **FRONT** (C's own slot), position 1 |
| 12 | A | `take_next(D)` | takes T11 (row 11) before T4 and T5; get_desk(D): front [], back [T4, T5] — **Check 3** | [`0xbccaae88…f96260c8`](https://explorer-studio.genlayer.com/tx/0xbccaae885cd10f3d1faf829163449d04f90b3188fab8ec96fa36fae6f96260c8) | SUCCESS; T11 IN_PROGRESS — taken before T4 and T5 |
| 13 | — | `get_desk(D)` | read: front [], back [T4, T5], in_progress [T2, T11] | — (read) | front **[]**, back **[T4, T5]**, in_progress **[T2, T11]**, waiting_total 2 |

Must-verify rows:

- **Check 1** — S1 → SELF_ONLY in BACK and B1 → BLOCKS_OTHERS in FRONT (rows 2, 3): **PASS**
- **Check 2** — B2 → BLOCKS_OTHERS but BACK with note front_lane_taken; S2 → SELF_ONLY in BACK (rows 4, 5): **PASS**
- **Check 3** — take_next serves B's FRONT ticket before C's older BACK ticket (rows 6, 7); a second wallet still has its own front slot (rows 11, 12): **PASS**

Notes from the run:

- Ticket ids (keccak of desk, filer and text): D `7d134e00b2ec562453f4f2d8e0e88593328a127598c4f180b029f1fc8d653604` · T2 `87bf1e94af8a950665c15d710772b9bbf96246cc311d1e29433500d838e5b9b7` · T3 `62e8a9d2c625c340c4e7e8981f40cadb4db184af3464f463ab6cecd578fd2cd5` · T4 `33c7d9c24ea9d0d5ae8a8f1b2d2ddb84c9a02254c3e31a13c984d0c1efb0c8ee` · T5 `a8e072a09f0f9862eb3941a90984a1d1a19b705e1638c093fa3f3d0925697eb1` · T11 `93aa95becf8f244ceadc3c6798b523cd992a7669cc16a37b10c449b2ccd6b884`.
- Two extra transactions were sent from the wrong wallet and reverted as the contract requires; they changed nothing: `take_next` from C before row 6 ([`0xd3056b78…e87a419e`](https://explorer-studio.genlayer.com/tx/0xd3056b78c097ba8ec91c44217ad6cf36b2e8597c6f7bb5a70ad3af9ae87a419e), *Only the desk owner may take tickets*) and `resolve` from C before row 10 ([`0x92f127f3…9a26033f`](https://explorer-studio.genlayer.com/tx/0x92f127f33c78187db7e1c4fc1f7d6ffec536de47b75aa0952cc1b16a9a26033f), *Only the desk owner may resolve tickets*). With the deploy, the contract shows 15 transactions.
