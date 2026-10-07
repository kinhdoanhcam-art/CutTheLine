// The Project's own deployment of the frozen BlocksOthers source (a separate
// address from the Intelligent Contract submission). VITE_CONTRACT_ADDRESS
// overrides it, e.g. for a fork.
export const PROJECT_DEPLOYMENT = "0x14A9da6B5566f79C38b79368f6d109e43fEa792a";
export const CONTRACT_ADDRESS = (String(import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim() || PROJECT_DEPLOYMENT) as `0x${string}` | "";

// Same-origin proxy declared in BOTH vite.config.ts and vercel.json.
// Every read, every receipt poll and the write client use this one URL.
export const RPC_PATH = "/genlayer-rpc";

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_HEX = "0xf22f";
// Only used when MetaMask must add the network (wallet_addEthereumChain needs an absolute URL).
export const WALLET_ADD_RPC = "https://studio.genlayer.com/api";
export const EXPLORER_BASE = "https://explorer-studio.genlayer.com";

export const SOURCE_SHA256 = "00ef977e0d60b14a09b56e785f861503b24a68ea70ac136e1f9d6c988bda2f01";

export const RECEIPT_TIMEOUT_MS = 150_000;
export const RECEIPT_POLL_MS = 3_000;
