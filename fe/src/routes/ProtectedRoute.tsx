import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
  requireCompanyId?: boolean;
}

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student/dashboard",
  COMPANY: "/company/dashboard",
  ADMIN: "/admin/dashboard",
};

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requireCompanyId = true,
}: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role?.toUpperCase() || "";

  if (!allowedRoles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || "/login"} replace />;
  }

  // Nếu là công ty, nhưng chưa có companyId, và route này bắt buộc có companyId
  // -> Redirect về trang onboarding
  if (role === "COMPANY" && requireCompanyId && !user?.companyId) {
    if (!location.pathname.startsWith("/company/onboarding")) {
      return <Navigate to="/company/onboarding" replace />;
    }
  }

  return <>{children}</>;
};
