import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext.jsx";
import { FullPageSpinner } from "./ui/Spinner.jsx";

export const CHANGE_PASSWORD_PATH = "/change-password";

/**
 * Layout route for signed-in pages. `roles` limits it to those roles.
 * This only hides screens; the backend enforces roles on every request.
 * Accounts created with a temporary password (must_change_password) are sent to
 * /change-password first, and only that page is open until they set their own.
 */
export function ProtectedRoute({ roles }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageSpinner />;
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.must_change_password && location.pathname !== CHANGE_PASSWORD_PATH) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

/**
 * Layout route for /login. Signed-in users go straight to the app: back to the
 * page that sent them to sign in, or home.
 */
export function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullPageSpinner />;
  if (status === "authenticated") return <Navigate to={location.state?.from?.pathname || "/"} replace />;
  return <Outlet />;
}
