// src/layouts/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  toggleSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

interface MainLayoutProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
}

export const MainLayout = ({ header, sidebar, footer }: MainLayoutProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        {header && (
          <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
            {header}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1">
          {/* Sidebar */}
          {sidebar && !isCollapsed && (
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
              <div className="h-full overflow-y-auto">
                {sidebar}
              </div>
            </aside>
          )}

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-6">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Footer */}
        {footer && (
          <footer className="bg-white border-t border-gray-200">
            {footer}
          </footer>
        )}
      </div>
    </SidebarContext.Provider>
  );
};