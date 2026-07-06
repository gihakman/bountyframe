import { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "volt" | "ink" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sharp border-2 border-ink px-5 py-2.5 font-mono text-sm font-bold uppercase tracking-widest transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  volt: "bg-volt text-ink shadow-stamp hover:brightness-105",
  ink: "bg-ink text-paper shadow-stamp hover:bg-ink-2",
  ghost: "bg-transparent text-ink shadow-none hover:bg-paper-2",
};

export function Button({
  variant = "volt",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "volt",
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
