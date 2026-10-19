import { useEffect } from "react";
import { Link } from "react-router-dom";

import { Card } from "../components/ui/Card.jsx";

/** Placeholder for a tab whose screen lands in a later PR. */
export default function ComingSoon({ title, description }) {
  useEffect(() => {
    document.title = `${title} · SpeedIn`;
  }, [title]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">{title}</h1>
      <Card>
        <h2 className="m-0 text-lg font-bold">Coming soon</h2>
        <p className="m-0 mt-2 max-w-prose text-[15px] text-ink-muted">{description}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-accent-ink">
          Back to home
        </Link>
      </Card>
    </div>
  );
}
