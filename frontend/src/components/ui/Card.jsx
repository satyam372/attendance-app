import clsx from "clsx";

export function Card({ as: Tag = "section", className, children, ...props }) {
  return (
    <Tag className={clsx("rounded-3xl border border-line bg-surface p-6 sm:p-8", className)} {...props}>
      {children}
    </Tag>
  );
}
