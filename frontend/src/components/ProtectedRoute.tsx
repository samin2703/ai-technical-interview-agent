import { Navigate, Outlet, useLocation } from "react-router-dom";

import { hasAuthSession } from "../services/auth";

export default function ProtectedRoute() {
  const location = useLocation();

  if (!hasAuthSession()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}