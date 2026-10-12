import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

const inputClasses = clsx(
  "h-13 w-full min-w-0 rounded-field border bg-field px-4 text-[15px] text-ink transition duration-200",
  "placeholder:text-placeholder",
  "focus:border-focus focus:ring-4 focus:ring-focus-ring focus:outline-none",
);

/** Labelled input with an inline error. Extra props go to the <input>. */
export function TextField({ label, error, className, inputClassName, trailing, ref, ...props }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative flex">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={clsx(inputClasses, error ? "border-danger" : "border-line-strong", inputClassName)}
          {...props}
        />
        {trailing}
      </div>
      {error && (
        <p id={errorId} className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Password input with a show/hide toggle (44px touch target). */
export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      inputClassName="pr-13"
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1 right-1 grid size-11 cursor-pointer place-items-center rounded-[10px] text-ink-muted transition hover:text-ink"
        >
          <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
        </button>
      }
    />
  );
}
