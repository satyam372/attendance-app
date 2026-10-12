import { Outlet } from "react-router-dom";

import { AppHeader } from "./AppHeader.jsx";

/** Shell for every signed-in page. */
export function AppLayout() {
  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
