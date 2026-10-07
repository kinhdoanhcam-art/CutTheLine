# SECURITY

## No money, no clock

The contract holds no GEN and moves none; every write sends value 0. No time is read.

## Where the central rule lives

Whether a problem stops others is decided only by validators inside `file_ticket`. What follows is deterministic in the
contract: BLOCKS_OTHERS goes FRONT while the filer's front slot at this desk is free, otherwise BACK with note
`front_lane_taken`; SELF_ONLY goes BACK; `take_next` always takes the earliest FRONT ticket first. The app never decides
the outcome or the lane: it reads both back from `get_ticket` and reports a filing only when they agree with the
filer's front slot (checked by `tests/js/verify.test.ts`).

## Fail-safe

Unusable or unclear output reads SELF_ONLY: a ticket never jumps the queue on a guess.

## Gaming the verdict

One open FRONT ticket per wallet per desk and three waiting tickets per wallet per desk, so a filer cannot fill the front
lane by overstating every problem. The model never sees a wallet, a lane, a position or a state. A request cannot be
filed twice by the same wallet at the same desk.

## Prompt fence

The desk name and the request sit inside their own `<UNTRUSTED_…>` tags. The four tags and both labels are refused in
any letter case on input and stripped to a fixed point inside the prompt.

## Frontend

- No MetaMask Snap: the app switches the network with `wallet_switchEthereumChain` / `wallet_addEthereumChain`.
- One same-origin RPC proxy (`/genlayer-rpc`, in `vite.config.ts` and `vercel.json`) for reads, receipts and writes.
- A write is reported only after the leader receipt says SUCCESS **and** consensus has reached ACCEPTED, and only after
  the reloaded state shows the change; otherwise "confirmation delayed" with a Check again button that re-reads state.
- Every revert predictable from state disables the button with the contract's own sentence.
- Contract text is rendered as React text; no raw HTML. Local storage holds desk ids and the ids of tickets filed from
  this browser — nothing else.

## Remaining limits

See "Honest limitation" in the README.
