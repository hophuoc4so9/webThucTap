// src/layouts/StudentLayout.tsx
import { MainLayout } from './MainLayout';
import { StudentHeader } from './components/Header/StudentHeader';
import { StudentSidebar } from './components/Sidebar/StudentSidebar';
import { Footer } from './components/Footer';

export const StudentLayout = () => {
  return (
    <MainLayout
      header={<StudentHeader />}
      sidebar={<StudentSidebar />}
      footer={<Footer />}
    />
  );
};
