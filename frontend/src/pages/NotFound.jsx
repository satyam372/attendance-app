import { useEffect } from "react";
import { Link } from "react-router-dom";

import { Wordmark } from "../components/ui/Wordmark.jsx";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page not found · SpeedIn";
  }, []);

  return (
    <main className="bg-login grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <Wordmark className="text-2xl" />
        <p className="m-0 text-6xl font-bold tracking-[-0.03em] text-accent-ink">404</p>
        <h1 className="m-0 text-xl font-semibold">This page doesn&rsquo;t exist</h1>
        <p className="m-0 text-[15px] text-ink-muted">The link may be broken or the page may have moved.</p>
        <Link
          to="/"
          className="mt-2 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-ink transition hover:bg-primary-hover"
        >
          Go to home
        </Link>
      </div>
    </main>
  );
}
