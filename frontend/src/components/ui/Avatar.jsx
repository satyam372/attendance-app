import clsx from "clsx";
import { useState } from "react";

export function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/**
 * Profile photo (`src`) or initials in a circle. Decorative: the name is always shown next to it.
 * Falls back to the initials when there is no photo or it fails to load.
 */
export function Avatar({ name, src, className }) {
  const [failed, setFailed] = useState(null); // the src that failed, so a new photo is tried again
  const showPhoto = src && failed !== src;
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft text-[15px] font-bold text-accent-ink",
        className,
      )}
    >
      {showPhoto ? <img src={src} alt="" draggable={false} onError={() => setFailed(src)} className="size-full object-cover" /> : initials(name)}
    </span>
  );
}
