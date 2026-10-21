import { Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout.jsx";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute.jsx";
import { Role } from "./lib/domain/enums.js";
import Attendance from "./pages/Attendance.jsx";
import EmployeeHome from "./pages/EmployeeHome.jsx";
import HrApprovals from "./pages/HrApprovals.jsx";
import HrToday from "./pages/HrToday.jsx";
import Leave from "./pages/Leave.jsx";
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
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/profile" element={<Profile />} />
          <Route element={<ProtectedRoute roles={[Role.HR]} />}>
            <Route path="/hr" element={<HrToday />} />
            <Route path="/hr/approvals" element={<HrApprovals />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
