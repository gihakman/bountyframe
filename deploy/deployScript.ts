/**
 * Deploy the BountyFrame Intelligent Contract to GenLayer Bradbury testnet.
 *
 * Usage:
 *   1. Fund a wallet from https://testnet-faucet.genlayer.foundation
 *   2. Put its key in ../.env as ACCOUNT_PRIVATE_KEY (never commit this file)
 *   3. npm install && npm run deploy
 *
 * The private key is read from the environment only. It is never logged.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import {
  TransactionStatus,
  type GenLayerClient,
  type GenLayerChain,
  type DecodedDeployData,
  type TransactionHash,
} from "genlayer-js/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load credentials from the repository-root .env (git-ignored).
loadEnv({ path: path.resolve(__dirname, "..", ".env") });

const CONTRACT_PATH = path.resolve(__dirname, "..", "contracts", "bounty_frame.py");

function requireKey(): `0x${string}` {
  const key = process.env.ACCOUNT_PRIVATE_KEY?.trim();
  if (!key) {
    throw new Error(
      "ACCOUNT_PRIVATE_KEY is not set. Create ../.env from ../.env.example and add a funded Bradbury key.",
    );
  }
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
}

async function main() {
  const account = createAccount(requireKey());
  const client = createClient({
    chain: testnetBradbury,
    account,
  }) as GenLayerClient<GenLayerChain>;

  console.log("Network      :", testnetBradbury.name ?? "GenLayer Bradbury");
  console.log("Deployer     :", account.address);
  console.log("Contract file:", CONTRACT_PATH);

  const code = new Uint8Array(readFileSync(CONTRACT_PATH));

  // Ensure consensus contract configuration is initialized for this client.
  await client.initializeConsensusSmartContract();

  console.log("\nDeploying… submitting transaction");
  const txHash = (await client.deployContract({
    code,
    args: [], // BountyFrame constructor takes no arguments
  })) as TransactionHash;

  console.log("Transaction hash:", txHash);
  console.log("Waiting for consensus acceptance…");

  // genlayer-js 1.1.8's waitForTransactionReceipt can throw on BigInt
  // serialization. Fall back to polling getTransaction directly.
  let receipt: Record<string, unknown>;
  try {
    receipt = (await client.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.ACCEPTED,
      retries: 120,
      interval: 5000,
    })) as Record<string, unknown>;
  } catch {
    receipt = await pollAccepted(client, txHash);
  }

  const statusName = String(receipt.statusName ?? receipt.status ?? "");
  if (statusName !== "ACCEPTED" && statusName !== "FINALIZED") {
    throw new Error(`Deployment not accepted. Status: ${statusName || "unknown"}`);
  }

  // On Bradbury the address is decoded from the deploy tx data;
  // getTransaction exposes it as `recipient`.
  const decoded = receipt.txDataDecoded as DecodedDeployData | undefined;
  const address =
    decoded?.contractAddress ??
    (receipt.recipient as string | undefined) ??
    (receipt as { data?: { contract_address?: string } }).data?.contract_address;

  console.log("\n✓ BountyFrame deployed");
  console.log("Status          :", statusName);
  console.log("Contract address:", address);
  console.log("Transaction hash:", txHash);
  console.log(
    "\nNext: put this address in frontend/.env.local as NEXT_PUBLIC_CONTRACT_ADDRESS",
  );
}

// Poll the transaction until it reaches ACCEPTED/FINALIZED. Used as a fallback
// when waitForTransactionReceipt hits the genlayer-js BigInt serialization bug.
async function pollAccepted(
  client: GenLayerClient<GenLayerChain>,
  hash: TransactionHash,
  retries = 120,
  intervalMs = 5000,
): Promise<Record<string, unknown>> {
  for (let i = 0; i < retries; i++) {
    try {
      const tx = (await client.getTransaction({ hash })) as Record<string, unknown>;
      const s = String(tx?.statusName ?? tx?.status ?? "");
      if (s === "ACCEPTED" || s === "FINALIZED") return tx;
      if (s === "UNDETERMINED" || s === "CANCELED") {
        throw new Error(`Transaction ${s}`);
      }
    } catch {
      /* transient RPC error — keep polling */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for acceptance");
}

main().catch((err) => {
  console.error("\nDeployment error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
