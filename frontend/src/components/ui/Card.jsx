import clsx from "clsx";

export function Card({ as: Tag = "section", className, children, ...props }) {
  return (
    <Tag className={clsx("rounded-3xl surface-card p-6 sm:p-8", className)} {...props}>
      {children}
    </Tag>
  );
}
