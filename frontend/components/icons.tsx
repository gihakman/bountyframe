// BountyFrame brand mark: an approved "frame" — corner brackets around a check
// stamp, rendered on the volt approval color. Scales cleanly at any size.
export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="6"
        fill="#D6FF3E"
        stroke="#101014"
        strokeWidth="2"
      />
      <path d="M8 11V8H11" stroke="#101014" strokeWidth="2" strokeLinecap="square" />
      <path d="M24 21V24H21" stroke="#101014" strokeWidth="2" strokeLinecap="square" />
      <path
        d="M10 16.5L14 20.5L23 11"
        stroke="#101014"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Wordmark: brand mark + "BountyFrame" with the framed "Frame".
export function Wordmark({
  invert = false,
  className = "",
}: {
  invert?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className="h-7 w-7" />
      <span className="font-display text-xl font-bold tracking-tightest">
        Bounty
        <span className={invert ? "bg-volt px-1 text-ink" : "bg-ink px-1 text-volt"}>
          Frame
        </span>
      </span>
    </span>
  );
}

// Official GitHub mark.
export function GitHubIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export const GITHUB_URL = "https://github.com/gihakman/bountyframe";
