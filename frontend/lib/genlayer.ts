"use client";

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type { CalldataEncodable, Hash } from "genlayer-js/types";
import { CONTRACT_ADDRESS } from "./config";

// Minimal EIP-1193 provider typing for the injected wallet.
type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function getInjectedProvider(): Eip1193Provider | undefined {
  if (typeof window === "undefined") return undefined;
  return window.ethereum;
}

// In the browser, route RPC through the same-origin proxy (/api/rpc) so requests
// never hit the RPC domain directly. This avoids "Failed to fetch" errors from
// privacy/ad/wallet extensions that block calls to crypto RPC hosts.
function rpcEndpoint(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/rpc`;
  }
  return "https://rpc-bradbury.genlayer.com";
}

// Read-only client - no wallet needed.
export function getReadClient() {
  return createClient({ chain: testnetBradbury, endpoint: rpcEndpoint() });
}

// Write client - signs through the connected wallet.
export function getWriteClient(address: `0x${string}`) {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No wallet found. Install MetaMask to continue.");
  return createClient({
    chain: testnetBradbury,
    account: address,
    endpoint: rpcEndpoint(),
    // genlayer-js accepts an EIP-1193 provider for browser signing
    provider,
  });
}

export async function connectWallet(): Promise<`0x${string}`> {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No wallet found. Install MetaMask to continue.");
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts || accounts.length === 0) throw new Error("No account authorized.");
  return accounts[0] as `0x${string}`;
}

function requireContract(): `0x${string}` {
  if (!CONTRACT_ADDRESS) {
    throw new Error(
      "Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local after deploying.",
    );
  }
  return CONTRACT_ADDRESS;
}

// --- Reads ---

// GenLayer limits `gen_call` to ~2 requests/second per IP. Space read calls out
// and retry with backoff when the limit is hit, so bursts (e.g. listing several
// campaigns) stay under the cap and recover automatically.
const MIN_READ_GAP_MS = 600;
let lastReadAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttleRead() {
  const now = Date.now();
  const wait = Math.max(0, lastReadAt + MIN_READ_GAP_MS - now);
  if (wait > 0) await sleep(wait);
  lastReadAt = Date.now();
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /rate limit|exceeds defined limit|-32429|\b429\b/i.test(msg);
}

export async function readContract<T = unknown>(
  functionName: string,
  args: CalldataEncodable[] = [],
): Promise<T> {
  const client = getReadClient();
  const address = requireContract();
  const maxAttempts = 6;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await throttleRead();
    try {
      return (await client.readContract({ address, functionName, args })) as T;
    } catch (err) {
      if (isRateLimit(err) && attempt < maxAttempts - 1) {
        await sleep(800 * (attempt + 1)); // linear backoff: 0.8s, 1.6s, ...
        continue;
      }
      throw err;
    }
  }
  throw new Error("Read failed after retries");
}

// --- Writes ---

export async function writeContract(
  address: `0x${string}`,
  functionName: string,
  args: CalldataEncodable[] = [],
  value: bigint = 0n,
): Promise<Hash> {
  const client = getWriteClient(address);
  // Ensure the wallet is on the Bradbury chain before signing.
  await client.connect("testnetBradbury");
  const hash = (await client.writeContract({
    address: requireContract(),
    functionName,
    args,
    value,
  })) as Hash;
  return hash;
}

export async function waitAccepted(hash: Hash) {
  const client = getReadClient();
  return client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 100,
    interval: 5000,
  });
}
