import clsx from "clsx";

import { Spinner } from "./Spinner.jsx";

const VARIANTS = {
  primary:
    "bg-primary text-primary-ink shadow-[0_8px_24px_rgb(0_0_0/0.18)] hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_12px_28px_rgb(0_0_0/0.26)] active:translate-y-0",
  secondary: "border border-line-strong bg-surface text-ink hover:border-focus",
  ghost: "text-ink-muted hover:bg-field hover:text-ink",
};

const SIZES = {
  lg: "h-13 rounded-field px-6 text-base",
  md: "h-11 rounded-xl px-4 text-sm",
  icon: "size-11 rounded-xl",
};

export function Button({ variant = "primary", size = "md", loading = false, disabled, className, children, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition duration-200",
        "disabled:pointer-events-none disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="size-4" label="Please wait" />}
      {children}
    </button>
  );
}
