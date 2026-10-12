import clsx from "clsx";
import { useId } from "react";

/**
 * SpeedIn logo: speed lines + "SpeedIn" in Michroma (from the Logo artboard).
 * Sized by font-size. With `intro`, the lines slide in and the name first reads
 * "SpeedInnovation" before collapsing to "SpeedIn" (login screen only).
 */
export function Wordmark({ intro = false, className }) {
  // Unique gradient id per instance; useId can contain characters that break url(#...).
  const gradientId = `speed-lines-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <span
      role="img"
      aria-label="SpeedIn"
      className={clsx(
        "inline-flex items-center font-brand leading-[1.2] font-normal tracking-[0.01em] whitespace-nowrap text-brand-ink",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={clsx("inline-flex max-w-[1.5em] flex-none overflow-hidden", intro && "motion-safe:animate-intro-lines")}
      >
        <svg width="1.5em" height="1em" viewBox="0 0 150 100" fill="none" className="block flex-none">
          <defs>
            <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="120" y2="0">
              <stop offset="0" className="[stop-color:var(--brand-line-1)]" />
              <stop offset="0.55" className="[stop-color:var(--brand-line-2)]" />
              <stop offset="1" className="[stop-color:var(--brand-line-3)]" />
            </linearGradient>
          </defs>
          <path d="M91 22H115M5 50H115M51 78H115" stroke={`url(#${gradientId})`} strokeWidth="11" strokeLinecap="round" />
        </svg>
      </span>
      <span aria-hidden="true">Speed</span>
      <span aria-hidden="true" className={clsx("text-brand-in", intro && "motion-safe:animate-intro-tint")}>
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
