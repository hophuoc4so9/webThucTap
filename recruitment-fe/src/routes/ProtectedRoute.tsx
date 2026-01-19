
// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  console.log(allowedRoles);
  // const { user, isAuthenticated } = useAuth();

  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  // if (!allowedRoles.includes(user?.role || '')) {
  //   const redirectMap: Record<string, string> = {
  //     STUDENT: '/student/dashboard',
  //     COMPANY: '/company/dashboard',
  //     ADMIN: '/admin/dashboard',
  //   };
  //   return <Navigate to={redirectMap[user?.role || ''] || '/login'} replace />;
  // }

  return <>{children}</>;
};