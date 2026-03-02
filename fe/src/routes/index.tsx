import { createBrowserRouter, Navigate } from "react-router-dom";
import { StudentLayout } from "../layouts/StudentLayout";
import { CompanyLayout } from "../layouts/CompanyLayout";
import { AdminLayout } from "../layouts/AdminLayout";

// Auth Pages
import LoginPage from "@/features/auth/pages/LoginPage/index";
import RegisterPage from "@/features/auth/pages/RegisterPage/index";

// Student Pages
import { StudentHomePage } from "@/features/student/pages/HomePage/index";
import { JobsPage } from "@/features/student/pages/JobsPage";
import { JobDetailPage } from "@/features/student/pages/JobsPage/JobDetailPage";
import { CompaniesPage } from "@/features/student/pages/CompaniesPage/index";
import { CompanyDetailPage } from "@/features/student/pages/CompanyDetailPage/index";
import { CVPage } from "@/features/student/pages/CVPage/index";
import { ApplicationsPage } from "@/features/student/pages/ApplicationsPage/index";

// Company Pages
import { CompanyDashboard } from "@/features/company/pages/Dashboard/index";
import { JobsPage as CompanyJobsPage } from "@/features/company/pages/JobsPage/index";
import { CompanyApplicationsPage } from "@/features/company/pages/ApplicationsPage/index";
import { CompanySettingsPage } from "@/features/company/pages/SettingsPage/index";

// Admin Pages
import { AdminDashboard } from "@/features/admin/pages/Dashboard/index";
import { StudentsManagement } from "@/features/admin/pages/StudentsManagement/index";
import { CompaniesManagement } from "@/features/admin/pages/CompaniesManagement/index";
import { JobsManagement } from "@/features/admin/pages/JobsManagement/index";

// Protected Route Component
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/student" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
 

  // Student Routes
  {
    path: "/student",
    element: (
      <ProtectedRoute allowedRoles={["STUDENT"]}>
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/student/home" replace /> },
      { path: "dashboard", element: <Navigate to="/student/home" replace /> },
      { path: "home", element: <StudentHomePage /> },
      { path: "jobs", element: <JobsPage /> },
      { path: "jobs/:id", element: <JobDetailPage /> },
      { path: "companies", element: <CompaniesPage /> },
      { path: "companies/:id", element: <CompanyDetailPage /> },
      { path: "cv", element: <CVPage /> },
      { path: "applications", element: <ApplicationsPage /> },
      { path: "messages", element: <div>Messages</div> },
      { path: "settings", element: <div>Settings</div> },
    ],
  },

  // Company Routes
  {
    path: "/company",
    element: (
      <ProtectedRoute allowedRoles={["COMPANY"]}>
        <CompanyLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/company/dashboard" replace /> },
      { path: "dashboard", element: <CompanyDashboard /> },
      { path: "jobs", element: <CompanyJobsPage /> },
      {
        path: "candidates",
        element: <Navigate to="/company/applications" replace />,
      },
      { path: "applications", element: <CompanyApplicationsPage /> },
      {
        path: "analytics",
        element: <Navigate to="/company/dashboard" replace />,
      },
      { path: "settings", element: <CompanySettingsPage /> },
    ],
  },

  // Admin Routes
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["ADMIN"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "dashboard", element: <AdminDashboard /> },
      { path: "students", element: <StudentsManagement /> },
      { path: "companies", element: <CompaniesManagement /> },
      { path: "jobs", element: <JobsManagement /> },
      { path: "internships", element: <div>Internships Management</div> },
      { path: "reports", element: <div>Reports</div> },
      { path: "notifications", element: <div>Notifications</div> },
      { path: "permissions", element: <div>Permissions</div> },
      { path: "settings", element: <div>System Settings</div> },
    ],
  },

  // 404 Page
  {
    path: "*",
    element: <div>404 - Page Not Found</div>,
  },
]);
