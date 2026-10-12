import clsx from "clsx";

export function Spinner({ className, label = "Loading" }) {
  return (
    <svg
      className={clsx("size-5 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={label}
    >
      <circle cx="12" cy="12" r="9" className="stroke-current opacity-20" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas text-accent-ink">
      <Spinner className="size-8" />
    </div>
  );
}
