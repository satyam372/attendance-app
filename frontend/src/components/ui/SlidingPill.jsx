/**
 * The selected-choice pill of a segmented track: a glass pill that slides between equal-width
 * options. The track must be `relative grid gap-1 p-1` with `count` columns, and each option
 * `relative` so it sits above the pill. Inline style: the position depends on `index` at runtime.
 */
export function SlidingPill({ index, count }) {
  if (index < 0) return null;
  return (
    <span
      aria-hidden="true"
      className="surface-pill pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl transition-transform duration-[450ms] ease-spring motion-reduce:transition-none"
      style={{
        width: `calc((100% - 0.5rem - ${count - 1} * 0.25rem) / ${count})`,
        transform: `translateX(calc(${index} * (100% + 0.25rem)))`,
      }}
    />
  );
}
