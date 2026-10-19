import clsx from "clsx";

/** Grey placeholder block while data loads. */
export function Skeleton({ className }) {
  return <span aria-hidden="true" className={clsx("block animate-pulse rounded-xl bg-field", className)} />;
}
