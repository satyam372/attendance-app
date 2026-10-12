import { Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout.jsx";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute.jsx";
import { Role } from "./lib/domain/enums.js";
import EmployeeHome from "./pages/EmployeeHome.jsx";
import HrHome from "./pages/HrHome.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<EmployeeHome />} />
          <Route element={<ProtectedRoute roles={[Role.HR]} />}>
            <Route path="/hr" element={<HrHome />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
