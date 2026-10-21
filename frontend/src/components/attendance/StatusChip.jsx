import clsx from "clsx";

import { CATEGORY_STYLES } from "./statusStyles.js";

export function StatusChip({ category, children, className }) {
  return (
    <span
      className={clsx(
        "inline-block rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        CATEGORY_STYLES[category]?.chip,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Coloured dot for a category. `color` replaces the category colour (e.g. on a selected cell). */
export function StatusDot({ category, color, size = "size-2", className }) {
  return <span aria-hidden="true" className={clsx("inline-block shrink-0 rounded-full", size, color ?? CATEGORY_STYLES[category]?.dot, className)} />;
}
