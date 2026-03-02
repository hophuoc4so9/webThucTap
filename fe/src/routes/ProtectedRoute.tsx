import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student/dashboard",
  COMPANY: "/company/dashboard",
  ADMIN: "/admin/dashboard",
};

export const ProtectedRoute = ({
  children,
  allowedRoles,
}: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.role || "")) {
    return <Navigate to={ROLE_HOME[user?.role || ""] || "/login"} replace />;
  }

  return <>{children}</>;
};
