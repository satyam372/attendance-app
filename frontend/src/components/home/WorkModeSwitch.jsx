import clsx from "clsx";
import { Building2, House } from "lucide-react";
import { useState } from "react";

import { WorkMode } from "../../lib/domain/enums.js";

/**
 * Office / Home switch in the Liquid Glass style: a clear glass lens holds the current icon and
 * slides along a glass track, with the label on the other side. It squashes a little while it
 * travels, like liquid. For screen readers it is a switch: "Work from home, on/off".
 */
export function WorkModeSwitch({ value, onChange, describedBy }) {
  const home = value === WorkMode.WFH;
  const [moves, setMoves] = useState(0); // keys the squash so it plays on every change

  function toggle() {
    setMoves((n) => n + 1);
    onChange(home ? WorkMode.OFFICE : WorkMode.WFH);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={home}
      aria-label="Work from home"
      aria-describedby={describedBy}
      onClick={toggle}
      className="glass-switch-track relative mx-auto block h-12 w-44 shrink-0 cursor-pointer rounded-full select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
    >
      {/* The label sits on the side the lens is not on */}
      <span
        aria-hidden="true"
        className={clsx(
          "absolute inset-y-0 right-0 left-12 flex items-center justify-center text-[15px] font-semibold text-ink transition duration-300 ease-apple",
          home ? "translate-x-3 opacity-0" : "opacity-100",
        )}
      >
        Office
      </span>
      <span
        aria-hidden="true"
        className={clsx(
          "absolute inset-y-0 right-12 left-0 flex items-center justify-center text-[15px] font-semibold text-ink transition duration-300 ease-apple",
          home ? "opacity-100" : "-translate-x-3 opacity-0",
        )}
      >
        Home
      </span>

      {/* The lens overhangs the track by 4px all round (-5px from inside the 1px border) and glides
          with a spring: 176 - 56 + 2 × 4 = 128px */}
      <span
        aria-hidden="true"
        className={clsx(
          "absolute -top-[5px] -left-[5px] size-14 transition-transform duration-500 ease-spring motion-reduce:transition-none",
          home && "translate-x-[128px]",
        )}
      >
        <span key={moves} className={clsx("glass-lens relative grid size-full place-items-center rounded-full", moves > 0 && "motion-safe:animate-lens-squish")}>
          <span className="relative grid size-9 place-items-center rounded-[14px] bg-accent text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_4px_10px_rgb(46_29_92/0.25)]">
            <Building2 className={clsx("absolute size-4.5 transition duration-300 ease-apple", home ? "scale-50 opacity-0" : "opacity-100")} strokeWidth={2} />
            <House className={clsx("absolute size-4.5 transition duration-300 ease-apple", home ? "opacity-100" : "scale-50 opacity-0")} strokeWidth={2} />
          </span>
        </span>
      </span>
    </button>
  );
}
