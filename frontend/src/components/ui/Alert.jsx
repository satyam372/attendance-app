import clsx from "clsx";
import { CircleAlert } from "lucide-react";

/** Error message announced to screen readers. */
export function ErrorAlert({ children, className }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className={clsx(
        "flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger motion-safe:animate-pop-in",
        className,
      )}
    >
      <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
