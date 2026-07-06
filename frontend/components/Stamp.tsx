// The signature BountyFrame motif: an inspector's verdict stamp.
// PASS reads in volt, FAIL in coral. Hard border, rotated, mono label.

export function Stamp({
  verdict,
  className = "",
}: {
  verdict: "approved" | "rejected" | "paid";
  className?: string;
}) {
  const isPass = verdict === "approved" || verdict === "paid";
  const label = verdict === "paid" ? "PAID" : isPass ? "PASS" : "FAIL";
  const color = isPass ? "text-ink" : "text-coral";
  const bg = isPass ? "bg-volt" : "bg-paper";
  const border = isPass ? "border-ink" : "border-coral";
  return (
    <span
      className={`inline-flex select-none items-center gap-2 border-2 ${border} ${bg} ${color} px-3 py-1 font-mono text-sm font-bold uppercase tracking-widest animate-stampIn ${className}`}
      style={{ transform: "rotate(-3deg)" }}
    >
      <span aria-hidden>{isPass ? "✔" : "✕"}</span>
      {label}
    </span>
  );
}
