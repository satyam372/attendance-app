import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useId } from "react";

// Labelled <select> and <textarea> styled like TextField (Leave form artboard).

const controlClasses = clsx(
  "w-full min-w-0 rounded-xl border bg-surface px-3.5 text-[15px] text-ink transition",
  "placeholder:text-placeholder focus:border-focus focus:ring-4 focus:ring-focus-ring focus:outline-none",
);

function Field({ id, label, error, hint, children, className }) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="m-0 text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="m-0 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function SelectField({ label, error, hint, className, children, ...props }) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={clsx(controlClasses, "h-12 cursor-pointer appearance-none pr-10", error ? "border-danger" : "border-line-strong")}
          {...props}
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4.5 -translate-y-1/2 text-ink-muted" />
      </div>
    </Field>
  );
}

export function DateField({ label, error, hint, className, ...props }) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} className={className}>
      <input
        id={id}
        type="date"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={clsx(controlClasses, "h-12", error ? "border-danger" : "border-line-strong")}
        {...props}
      />
    </Field>
  );
}

export function TextAreaField({ label, error, hint, className, ...props }) {
  const id = useId();
  return (
    <Field id={id} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={clsx(controlClasses, "resize-y py-3", error ? "border-danger" : "border-line-strong")}
        {...props}
      />
    </Field>
  );
}

/** Segmented radio choice (e.g. Leave / Work from home). options: [{ value, label }] */
export function Segmented({ legend, name, value, options, onChange, className }) {
  return (
    <fieldset className={clsx("m-0 min-w-0 border-0 p-0", className)}>
      <legend className="mb-2 p-0 text-[13px] font-semibold text-ink-soft">{legend}</legend>
      <div className={clsx("grid gap-1 rounded-2xl surface-track p-1", { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[options.length] ?? "grid-cols-2")}>
        {options.map((option) => (
          <label
            key={option.value}
            className={clsx(
              "flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-2 text-center text-[13px] leading-tight font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus",
              value === option.value ? "bg-surface text-accent-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="sr-only" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
