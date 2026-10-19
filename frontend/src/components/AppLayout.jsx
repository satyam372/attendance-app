import { Outlet } from "react-router-dom";

import { BottomNav } from "./layout/BottomNav.jsx";
import { Sidebar } from "./layout/Sidebar.jsx";

/**
 * Shell for every signed-in page: sidebar on PC, bottom tab bar on phones and tablets.
 * `theme-app` switches light mode to the app palette from the Home/Dashboard artboards.
 */
export function AppLayout() {
  return (
    <div className="theme-app flex min-h-dvh bg-canvas text-ink">
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
