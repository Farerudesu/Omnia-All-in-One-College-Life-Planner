import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { CommandPalette } from './CommandPalette';
import { DataState } from './DataState';
import { useData } from '../lib/useData';
import * as ds from '../lib/dataService';

export function AppLayout() {
  const location = useLocation();
  const settings = useData(ds.getSettings);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('omnia_sidebar_collapsed') === 'true';
  });
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (settings.theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [settings.theme]);

  useEffect(() => {
    localStorage.setItem('omnia_sidebar_collapsed', isSidebarCollapsed.toString());
    if (isSidebarCollapsed) {
      document.documentElement.style.setProperty('--sidebar-width', '64px');
    } else {
      document.documentElement.style.setProperty('--sidebar-width', '256px');
    }
  }, [isSidebarCollapsed]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };

    const handleCustomOpen = () => setIsPaletteOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, []);

  // Redirect root to schedule
  if (location.pathname === '/') {
    return <Navigate to="/schedule" replace />;
  }

  return (
    <div className="app-layout">
      {/* Skip to content link for keyboard & screen reader users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <main id="main-content" tabIndex={-1} className="app-main" style={{ outline: 'none' }}>
        <DataState />
        <Outlet />
      </main>
      <BottomNav />

      {/* Global Universal Search & Command Palette */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </div>
  );
}
