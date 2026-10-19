import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext.jsx";
import { FullPageSpinner } from "./ui/Spinner.jsx";

/**
 * Layout route for signed-in pages. `roles` limits it to those roles.
 * This only hides screens; the backend enforces roles on every request.
 */
export function ProtectedRoute({ roles }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageSpinner />;
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location }} />;
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
