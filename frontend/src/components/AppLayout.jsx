import { Outlet } from "react-router-dom";

import { BottomNav } from "./layout/BottomNav.jsx";
import { Sidebar } from "./layout/Sidebar.jsx";

/**
 * Shell for every signed-in page: sidebar on PC, bottom tab bar on phones and tablets.
 * `theme-app` switches light mode to the app palette from the Home/Dashboard artboards.
 * The brand glows sit on one fixed layer behind everything, so the glass panels above them
 * have something to blur and scrolling never repaints the background.
 */
export function AppLayout() {
  return (
    <div className="theme-app relative isolate flex min-h-dvh text-ink">
      <div aria-hidden="true" className="bg-app pointer-events-none fixed inset-0 -z-10" />
      <Sidebar />
      <main className="min-w-0 flex-1 px-5 pt-[max(24px,env(safe-area-inset-top))] pb-32 sm:px-8 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
