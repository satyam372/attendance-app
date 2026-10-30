import clsx from "clsx";
import { useLayoutEffect, useRef, useState } from "react";

// Where each pill was last drawn, by group. HrTabs is rendered again on every HR page, so its pill
// starts from the previous tab and glides to the new one instead of jumping.
const lastPlace = new Map();

/**
 * The glass pill behind the active navigation item (`[aria-current="page"]` in the same container),
 * gliding to the new item with a spring, like the iOS tab bar. Render it as the first child of the
 * container; it measures its own parent (a parent's ref is not attached yet when a child's layout
 * effect runs). The container must be `relative`, and the items `relative` so they sit above it.
 * It follows size changes and `aria-current` changes; `watch` (the pathname) also re-runs it.
 * Inline style: the position is measured at runtime.
 */
export function MovingPill({ group, watch, className }) {
  const pillRef = useRef(null);
  const [place, setPlace] = useState(() => lastPlace.get(group) ?? null);
  const [animate, setAnimate] = useState(false);
  const animating = useRef(false);

  useLayoutEffect(() => {
    const container = pillRef.current?.parentElement;
    if (!container) return undefined;

    const measure = () => {
      const active = container.querySelector('[aria-current="page"]');
      if (!active) return setPlace(null);
      const box = container.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      const next = {
        // relative to the container's padding box, and to its scrolled content (HR tabs scroll on phones)
        x: item.left - box.left - container.clientLeft + container.scrollLeft,
        y: item.top - box.top - container.clientTop + container.scrollTop,
        width: item.width,
        height: item.height,
      };
      lastPlace.set(group, next);
      setPlace(next);
    };

    // Re-measure once per frame at most, whenever the items change size (a badge appearing, fonts
    // loading, a resize) or the active item changes, so the pill always ends on the right item.
    let pending = 0;
    const schedule = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(measure);
    };
    const sizes = new ResizeObserver(schedule);
    sizes.observe(container);
    for (const child of container.children) sizes.observe(child);
    const changes = new MutationObserver(schedule);
    changes.observe(container, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-current"] });

    // Already on screen (sidebar, tab bar): measure now, so the glide starts with the new page.
    // First time ever: place it at once. Just mounted (HR tabs on a new HR page): draw at the
    // remembered place, then glide on the next frame.
    if (animating.current || !lastPlace.has(group)) measure();
    const frame = requestAnimationFrame(() => {
      animating.current = true;
      setAnimate(true);
      schedule();
    });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pending);
      sizes.disconnect();
      changes.disconnect();
    };
  }, [group, watch]);

  return (
    <span
      ref={pillRef}
      aria-hidden="true"
      className={clsx(
        "surface-pill pointer-events-none absolute top-0 left-0",
        !place && "invisible",
        animate && "transition-[transform,width,height] duration-[450ms] ease-spring motion-reduce:transition-none",
        className,
      )}
      style={place ? { width: place.width, height: place.height, transform: `translate(${place.x}px, ${place.y}px)` } : undefined}
    />
  );
}
