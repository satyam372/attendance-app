import { Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout.jsx";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute.jsx";
import { Role } from "./lib/domain/enums.js";
import EmployeeHome from "./pages/EmployeeHome.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import HrHome from "./pages/HrHome.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<EmployeeHome />} />
          <Route
            path="/attendance"
            element={<ComingSoon title="Attendance" description="Your monthly attendance history with filters will appear here." />}
          />
          <Route
            path="/leave"
            element={<ComingSoon title="Leave" description="Requesting leave and WFH, and tracking your requests, will appear here." />}
          />
          <Route path="/profile" element={<Profile />} />
          <Route element={<ProtectedRoute roles={[Role.HR]} />}>
            <Route path="/hr" element={<HrHome />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
