import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function monthLabel({ year, month }) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** "‹ October 2026 ›". The next button is disabled on the current month (no future history). */
export function MonthSwitcher({ value, onChange, canGoNext, variant = "inline", className }) {
  const shift = (delta) => {
    const index = value.year * 12 + (value.month - 1) + delta;
    onChange({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  };
  const buttonClasses = clsx(
    "grid size-11 cursor-pointer place-items-center rounded-xl text-ink transition disabled:cursor-default disabled:opacity-35",
    variant === "inline" ? "bg-field hover:bg-line" : "hover:bg-field",
  );

  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-1",
        variant === "boxed" && "rounded-xl border border-line bg-surface px-1",
        className,
      )}
    >
      <button type="button" className={buttonClasses} onClick={() => shift(-1)} aria-label="Previous month">
        <ChevronLeft className="size-4.5" strokeWidth={2.2} aria-hidden="true" />
      </button>
      <p className="m-0 px-1.5 text-base font-bold whitespace-nowrap" aria-live="polite">
        {monthLabel(value)}
      </p>
      <button type="button" className={buttonClasses} onClick={() => shift(1)} disabled={!canGoNext} aria-label="Next month">
        <ChevronRight className="size-4.5" strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}
