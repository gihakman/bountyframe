import { ReactNode } from "react";

// A framed surface - the literal "frame" being judged. Heavy ink border,
// hard offset shadow. Never soft/rounded.
export function Frame({
  children,
  className = "",
  as: Tag = "div",
  id,
}: {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  id?: string;
}) {
  return (
    <Tag
      id={id}
      className={`rounded-sharp border-2 border-ink bg-paper shadow-stamp ${className}`}
    >
      {children}
    </Tag>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-xs uppercase tracking-widest text-ink-60">
      {children}
    </span>
  );
}
