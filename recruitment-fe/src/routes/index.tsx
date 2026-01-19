import { createBrowserRouter, Navigate } from 'react-router-dom';
import { StudentLayout } from '../layouts/StudentLayout';
import { CompanyLayout } from '../layouts/CompanyLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Auth Pages
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';

// Student Pages
import { StudentDashboard } from '@/features/student/pages/Dashboard';
import { JobsPage } from '@/features/student/pages/JobsPage';
import { CVPage } from '@/features/student/pages/CVPage';
import { ApplicationsPage } from '@/features/student/pages/ApplicationsPage';

// Company Pages
import { CompanyDashboard } from '@/features/company/pages/Dashboard';
import { CompanyJobsPage } from '@/features/company/pages/JobsPage';
import { CandidatesPage } from '@/features/company/pages/CandidatesPage';

// Admin Pages
import { AdminDashboard } from '@/features/admin/pages/Dashboard';
import { StudentsManagement } from '@/features/admin/pages/StudentsManagement';
import { CompaniesManagement } from '@/features/admin/pages/CompaniesManagement';

// Protected Route Component
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/student" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  
  // Student Routes
  {
    path: '/student',
    element: (
      <ProtectedRoute allowedRoles={['STUDENT']}>
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/student/dashboard" replace /> },
      { path: 'dashboard', element: <StudentDashboard /> },
      { path: 'jobs', element: <JobsPage /> },
      { path: 'jobs/:id', element: <div>Job Detail</div> },
      { path: 'cv', element: <CVPage /> },
      { path: 'applications', element: <ApplicationsPage /> },
      { path: 'messages', element: <div>Messages</div> },
      { path: 'settings', element: <div>Settings</div> },
    ],
  },

  // Company Routes
  {
    path: '/company',
    element: (
      <ProtectedRoute allowedRoles={['COMPANY']}>
        <CompanyLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/company/dashboard" replace /> },
      { path: 'dashboard', element: <CompanyDashboard /> },
      { path: 'jobs', element: <CompanyJobsPage /> },
      { path: 'jobs/create', element: <div>Create Job</div> },
      { path: 'jobs/:id/edit', element: <div>Edit Job</div> },
      { path: 'candidates', element: <CandidatesPage /> },
      { path: 'applications', element: <div>Applications</div> },
      { path: 'analytics', element: <div>Analytics</div> },
      { path: 'settings', element: <div>Company Settings</div> },
    ],
  },

  // Admin Routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'students', element: <StudentsManagement /> },
      { path: 'companies', element: <CompaniesManagement /> },
      { path: 'jobs', element: <div>Jobs Management</div> },
      { path: 'internships', element: <div>Internships Management</div> },
      { path: 'reports', element: <div>Reports</div> },
      { path: 'notifications', element: <div>Notifications</div> },
      { path: 'permissions', element: <div>Permissions</div> },
      { path: 'settings', element: <div>System Settings</div> },
    ],
  },

  // 404 Page
  {
    path: '*',
    element: <div>404 - Page Not Found</div>,
  },
]);
