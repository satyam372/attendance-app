import clsx from "clsx";
import { Camera, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "../ui/Avatar.jsx";
import { Spinner } from "../ui/Spinner.jsx";

/**
 * The profile photo with a pencil button on its corner. Without a photo the pencil opens the photo
 * picker (the camera too, on phones); with one it opens a small glass menu: choose a new photo or
 * remove it. The menu works with the keyboard (arrows, Escape) and closes on an outside click.
 */
export function PhotoEditButton({ name, src, onChoose, onRemove, removing }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);
  const pencilRef = useRef(null);
  const menuRef = useRef(null);

  const close = (focusPencil = true) => {
    setOpen(false);
    if (focusPencil) pencilRef.current?.focus();
  };

  // Focus the first item when the menu opens; close it on an outside click
  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector("[role=menuitem]")?.focus();
    const onPointer = (event) => {
      if (!menuRef.current?.contains(event.target) && !pencilRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function onMenuKey(event) {
    const items = [...menuRef.current.querySelectorAll("[role=menuitem]")];
    const at = items.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      items[(at + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
    } else if (event.key === "Tab") {
      close(false);
    }
  }

  function choose() {
    close(false);
    fileRef.current?.click();
  }

  function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // choosing the same file again still triggers a change
    if (file) onChoose(file);
  }

  const itemClass =
    "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition hover:bg-(--glass-hover) focus-visible:bg-(--glass-hover) focus-visible:outline-none";

  return (
    <div className="relative shrink-0">
      <Avatar name={name} src={src} className="size-20 text-2xl" />
      <button
        ref={pencilRef}
        type="button"
        aria-label={src ? "Edit photo" : "Add a photo"}
        aria-haspopup={src ? "menu" : undefined}
        aria-expanded={src ? open : undefined}
        disabled={removing}
        onClick={() => (src ? setOpen((current) => !current) : fileRef.current?.click())}
        className="glass-button absolute -right-1 -bottom-1 grid size-9 cursor-pointer place-items-center rounded-full text-ink transition duration-300 ease-spring active:scale-90 disabled:cursor-default motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {removing ? <Spinner className="size-4" label="Removing photo" /> : <Pencil className="size-4" strokeWidth={2.2} aria-hidden="true" />}
      </button>

      {/* Hidden picker: the pencil or the menu opens it. On phones it offers the camera too. */}
      <input ref={fileRef} type="file" accept="image/*" onChange={pick} tabIndex={-1} aria-hidden="true" className="sr-only" />

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Profile photo"
          onKeyDown={onMenuKey}
          className="glass-menu absolute top-full left-0 z-30 mt-3 w-56 origin-top-left rounded-2xl p-1.5 motion-safe:animate-pop-in"
        >
          <button type="button" role="menuitem" onClick={choose} className={clsx(itemClass, "text-ink")}>
            <Camera className="size-4.5 text-ink-muted" aria-hidden="true" />
            Choose new photo
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onRemove();
            }}
            className={clsx(itemClass, "text-absent-ink")}
          >
            <Trash2 className="size-4.5" aria-hidden="true" />
            Remove photo
          </button>
        </div>
      )}
    </div>
  );
}
