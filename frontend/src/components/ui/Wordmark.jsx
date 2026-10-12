import clsx from "clsx";

/**
 * "SpeedIn" wordmark. With `intro`, it first reads "SpeedInnovation" and then
 * collapses to "SpeedIn" (login screen only).
 */
export function Wordmark({ intro = false, className }) {
  return (
    <span
      role="img"
      aria-label="SpeedIn"
      className={clsx("inline-flex items-baseline font-bold tracking-[-0.02em] whitespace-nowrap text-ink", className)}
    >
      <span aria-hidden="true">Speed</span>
      <span aria-hidden="true" className={clsx("text-accent-ink", intro && "motion-safe:animate-intro-tint")}>
        In
      </span>
      {intro && (
        <span aria-hidden="true" className="inline-block max-w-0 overflow-hidden opacity-0 motion-safe:animate-intro-collapse">
          novation
        </span>
      )}
    </span>
  );
}
