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

// Read-only client - no wallet needed. Talks directly to the GenLayer RPC.
export function getReadClient() {
  return createClient({ chain: testnetBradbury });
}

// Write client - signs through the connected wallet.
export function getWriteClient(address: `0x${string}`) {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No wallet found. Install MetaMask to continue.");
  return createClient({
    chain: testnetBradbury,
    account: address,
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

export async function readContract<T = unknown>(
  functionName: string,
  args: CalldataEncodable[] = [],
): Promise<T> {
  const client = getReadClient();
  return (await client.readContract({
    address: requireContract(),
    functionName,
    args,
  })) as T;
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
