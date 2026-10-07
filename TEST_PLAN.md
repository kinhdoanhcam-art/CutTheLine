# TEST_PLAN

## Cases (each pair shares its surface and carries opposite labels)

| Case | Request | Expected |
|---|---|---|
| B1 | Main won't build, so my branch can't merge and neither can anyone else's. | BLOCKS_OTHERS |
| B2 | The shared test database is down for everyone on the floor. | BLOCKS_OTHERS |
| B3 | The VPN certificate expired, so remote staff can't reach the wiki. | BLOCKS_OTHERS |
| B4 | Deploys to staging fail for every squad since this morning. | BLOCKS_OTHERS |
| B5 | The office printer queue is jammed and the whole sales floor is waiting. | BLOCKS_OTHERS |
| S1 | Main won't build on my laptop, so my branch can't merge. | SELF_ONLY |
| S2 | The test database copy I reset is down after the reset. | SELF_ONLY |
| S3 | The VPN certificate on this laptop expired, so the wiki won't load from home. | SELF_ONLY |
| S4 | Deploys from my fork to staging fail since this morning. | SELF_ONLY |
| S5 | The printer jammed on my job and I am waiting for my slides. | SELF_ONLY |

- **Kill tests:** B1/S1 … B5/S5 — the rubric does not hint at the mechanism.
- `BLOCKSOTHERS_KILLSET_CHECK.py` proves no word or word pair separates the classes, and that the rubric shares no
  content word with any case.

## Deterministic behaviour → test (`tests/contract/test_blocksothers.py`, Direct Mode, model mocked)

| Behaviour | Test |
|---|---|
| The tooth: a later blocking ticket is taken first | `test_tooth_later_blocking_ticket_is_taken_first`, `test_outcome_and_lane_are_separate_fields` |
| Lanes | `test_front_lane_beats_every_back_ticket_and_each_lane_is_fifo`, `test_back_ticket_is_not_promoted_when_the_slot_frees`, `test_take_next_skips_withdrawn_tickets_in_both_lanes` |
| The front slot | `test_front_slot_is_per_wallet_and_per_desk`, `test_front_slot_held_while_in_progress_and_freed_on_resolve`, `test_withdrawing_a_front_ticket_frees_the_slot`, `test_withdrawing_a_back_ticket_keeps_the_front_slot_taken` |
| The waiting cap | `test_waiting_cap_counts_only_waiting_tickets`, `test_waiting_cap_is_per_desk` |
| Roles | `test_third_wallet_is_refused_by_every_write`, `test_owner_may_file_at_own_desk` |
| Ids | `test_whitespace_variants_share_one_desk_id`, `test_whitespace_variants_share_one_ticket_id`, `test_same_text_from_another_filer_or_desk_is_another_ticket` |
| Fail-safe and validator | `test_fail_safe_on_unparseable_output`, `test_fail_safe_on_unknown_label`, `test_validator_rejects_disagreement_and_bad_shapes` |
| Prompt never sees wallets or state; fence is a fixed point | `test_prompt_never_sees_wallets_or_state`, `test_fence_strip_is_fixed_point` |
| Positions and views | `test_positions_and_ahead_totals`, `test_views_on_unknown_ids` |
| Every revert string has a dedicated test; check order | `test_every_revert_string_has_exactly_one_dedicated_test`, `test_check_order_file_ticket`, `test_check_order_caller_before_state` |
| The planned on-chain table, replayed in order | `test_runtime_table_in_order` |
| Ids shared with the frontend | `test_vectors_match_contract` |

Frontend (`tests/js/*.test.ts`): Python-string parity, desk and ticket ids against the contract vectors, view parsing,
every revert sentence equal to the source and fired in the source's order, the next-up ticket, the front slot, the
waiting count, postconditions for every write, receipt classification, calldata sizes, source hash, repository rules.
