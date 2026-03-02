import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { StudentHeader } from "./components/Header/StudentHeader";
import { StudentSidebar } from "./components/Sidebar/StudentSidebar";
import { Footer } from "./components/Footer";

export const StudentLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setDrawerOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky top nav */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <StudentHeader onMenuClick={() => setDrawerOpen((v) => !v)} />
      </div>

      {/* Mobile sidebar drawer + backdrop */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <aside
            ref={drawerRef}
            className="relative w-64 bg-white h-full shadow-xl overflow-y-auto animate-slide-in-left"
          >
            <StudentSidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <Footer />
      </footer>
    </div>
  );
};
