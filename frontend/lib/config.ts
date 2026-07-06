// BountyFrame network + contract configuration (Bradbury testnet only).

export const NETWORK = {
  name: "GenLayer Bradbury",
  chainKey: "testnetBradbury" as const,
  rpc: "https://rpc-bradbury.genlayer.com",
  chainId: 4221,
  currency: "GEN",
  explorer: "https://explorer-bradbury.genlayer.com",
  faucet: "https://testnet-faucet.genlayer.foundation",
};

// Deployed BountyFrame contract on GenLayer Bradbury.
// This address is public (not a secret), so it ships as the default and can be
// overridden with NEXT_PUBLIC_CONTRACT_ADDRESS (e.g. for a fresh deployment).
const DEFAULT_CONTRACT_ADDRESS = "0x857B95185f5e4192097b2E6E80A437F14e3FF5f7";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  DEFAULT_CONTRACT_ADDRESS) as `0x${string}`;

export const PROTOCOL_FEE_BPS = 500; // 5% (matches contract default)

export const WEI = 10n ** 18n;

export function genToWei(gen: string | number): bigint {
  // Parse a decimal GEN amount into wei without floating point drift.
  const s = String(gen).trim();
  if (!s) return 0n;
  const [whole, frac = ""] = s.split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  return BigInt(whole || "0") * WEI + BigInt(fracPadded || "0");
}

export function weiToGen(wei: bigint | string, dp = 4): string {
  const v = typeof wei === "string" ? BigInt(wei) : wei;
  const whole = v / WEI;
  const frac = v % WEI;
  const fracStr = frac.toString().padStart(18, "0").slice(0, dp).replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : `${whole}`;
}

export function shortAddr(addr?: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
