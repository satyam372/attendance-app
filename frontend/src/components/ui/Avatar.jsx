import clsx from "clsx";

export function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/** Initials in a circle. Decorative: the name is always shown next to it. */
export function Avatar({ name, className }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-[15px] font-bold text-accent-ink",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
