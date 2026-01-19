import { MainLayout } from './MainLayout';
import { CompanyHeader } from './components/Header/CompanyHeader';
import { CompanySidebar } from './components/Sidebar/CompanySidebar';
import { Footer } from './components/Footer';

export const CompanyLayout = () => {
  return (
    <MainLayout
      header={<CompanyHeader />}
      sidebar={<CompanySidebar />}
      footer={<Footer />}
    />
  );
};
