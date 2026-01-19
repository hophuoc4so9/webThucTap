// src/layouts/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';

interface MainLayoutProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
}

export const MainLayout = ({ header, sidebar, footer }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
     
      {header && (
        <header className="sticky top-0 z-50 bg-white shadow-sm">
          {header}
        </header>
      )}

      
      <div className="flex flex-1">
        
        {sidebar && (
          <aside className="hidden lg:block w-64 bg-white border-r border-gray-200">
            <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
              {sidebar}
            </div>
          </aside>
        )}

        
        <main className="flex-1 overflow-x-hidden">
          <div className="container mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      
      {footer && (
        <footer className="bg-white border-t border-gray-200 mt-auto">
          {footer}
        </footer>
      )}
    </div>
  );
};