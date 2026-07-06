import { NextRequest } from "next/server";

// Same-origin JSON-RPC proxy to the GenLayer Bradbury RPC.
// Browsers call this route instead of the RPC domain directly, which avoids
// "Failed to fetch" errors from privacy/ad/wallet extensions that block calls
// to crypto RPC hosts, and sidesteps any cross-origin edge cases.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC_URL = process.env.GENLAYER_RPC_URL || "https://rpc-bradbury.genlayer.com";

export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const upstream = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Upstream RPC unreachable" },
        id: null,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
