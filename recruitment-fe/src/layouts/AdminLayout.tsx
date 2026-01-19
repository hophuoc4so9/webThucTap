
import { MainLayout } from './MainLayout';
import { AdminHeader } from './components/Header/AdminHeader';
import { AdminSidebar } from './components/Sidebar/AdminSidebar';
import { Footer } from './components/Footer';

export const AdminLayout = () => {
  return (
    <MainLayout
      header={<AdminHeader />}
      sidebar={<AdminSidebar />}
      footer={<Footer />}
    />
  );
};
