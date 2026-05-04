import { createBrowserRouter, Navigate } from "react-router-dom";
import { StudentLayout } from "../layouts/StudentLayout";
import { CompanyLayout } from "../layouts/CompanyLayout";
import { AdminLayout } from "../layouts/AdminLayout";

// Auth Pages
import LoginPage from "@/features/auth/pages/LoginPage/index";
import RegisterPage from "@/features/auth/pages/RegisterPage/index";
import StudentRegisterPage from "@/features/auth/pages/RegisterPage/StudentRegisterPage";
import RecruiterRegisterPage from "@/features/auth/pages/RegisterPage/RecruiterRegisterPage";

// Student Pages
import { StudentHomePage } from "@/features/student/pages/HomePage/index";
import { JobsPage } from "@/features/student/pages/JobsPage";
import { JobDetailPage } from "@/features/student/pages/JobsPage/JobDetailPage";
import { CompaniesPage } from "@/features/student/pages/CompaniesPage/index";
import { CompanyDetailPage } from "@/features/student/pages/CompanyDetailPage/index";
import { CVPage } from "@/features/student/pages/CVPage/index";
import { CvFormPage } from "@/features/student/pages/CVPage/CvFormPage";
import { ApplicationsPage } from "@/features/student/pages/ApplicationsPage/index";
import { StudentProfilePage } from "@/features/student/pages/ProfilePage/index";
import { StudentRecruiterPage } from "@/features/student/pages/RecruiterPage/index";

// Student Project Pages
import { StudentProjectsPage } from "@/features/student/pages/ProjectsPage/index";
import { ProjectDetailPage } from "@/features/student/pages/ProjectsPage/ProjectDetailPage";

// Company Pages
import { CompanyDashboard } from "@/features/company/pages/Dashboard/index";
import { JobsPage as CompanyJobsPage } from "@/features/company/pages/JobsPage/index";
import { CompanyApplicationsPage } from "@/features/company/pages/ApplicationsPage/index";
import { CompanySettingsPage } from "@/features/company/pages/SettingsPage/index";
import { CompanyProjectsPage } from "@/features/company/pages/ProjectsPage/index";
import { ProjectFormPage } from "@/features/company/pages/ProjectsPage/ProjectFormPage";
import { ProjectApplicantsPage } from "@/features/company/pages/ProjectsPage/ProjectApplicantsPage";
import { CompanyOnboardingPage } from "@/features/company/pages/OnboardingPage/index";

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
  {
    path: "/register/student",
    element: <StudentRegisterPage />,
  },
  {
    path: "/register/recruiter",
    element: <RecruiterRegisterPage />,
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
      { path: "cv/new", element: <CvFormPage /> },
      { path: "cv/:id/edit", element: <CvFormPage /> },
      { path: "applications", element: <ApplicationsPage /> },
      { path: "profile", element: <StudentProfilePage /> },
      { path: "recruiter", element: <StudentRecruiterPage /> },
      { path: "projects", element: <StudentProjectsPage /> },
      { path: "projects/:id", element: <ProjectDetailPage /> },
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
      { path: "projects", element: <CompanyProjectsPage /> },
      { path: "projects/new", element: <ProjectFormPage /> },
      { path: "projects/:id/edit", element: <ProjectFormPage /> },
      { path: "projects/:id/applicants", element: <ProjectApplicantsPage /> },
      {
        path: "analytics",
        element: <Navigate to="/company/dashboard" replace />,
      },
      { path: "settings", element: <CompanySettingsPage /> },
    ],
  },
  {
    path: "/company/onboarding",
    element: (
      <ProtectedRoute allowedRoles={["COMPANY"]} requireCompanyId={false}>
        <CompanyOnboardingPage />
      </ProtectedRoute>
    ),
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
