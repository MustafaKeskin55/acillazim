"use client";

import React, { useCallback, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import DashboardSidebar from './Sidebar/Sidebar';
import DashboardHeader from './Header/Header';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'acillazim-dashboard-sidebar-open';
const DASH_PATH_STORAGE_KEY = 'acillazim-dashboard-last-path';

function isDashboardRoute(path: string): boolean {
  return path === '/dashboard' || path.startsWith('/dashboard/');
}

function readSidebarPreference(): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
    return null;
  } catch {
    return null;
  }
}

function writeSidebarPreference(open: boolean) {
  try {
    sessionStorage.setItem(SIDEBAR_STORAGE_KEY, open ? '1' : '0');
  } catch {
    /* ignore */
  }
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const pathname = usePathname() || '';
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  /* Mobil: dashboard içinde başka sayfaya geçince çekmece kapanır. Dışarıdan (ör. Hesabım) gelişe dokunmaz. */
  useLayoutEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const prevPath = sessionStorage.getItem(DASH_PATH_STORAGE_KEY);

    if (
      prevPath !== null &&
      prevPath !== pathname &&
      mq.matches &&
      isDashboardRoute(prevPath) &&
      isDashboardRoute(pathname)
    ) {
      setSidebarOpen(false);
      writeSidebarPreference(false);
      sessionStorage.setItem(DASH_PATH_STORAGE_KEY, pathname);
      return;
    }

    sessionStorage.setItem(DASH_PATH_STORAGE_KEY, pathname);

    const stored = readSidebarPreference();
    if (stored !== null) {
      setSidebarOpen(stored);
      return;
    }
    if (mq.matches) {
      const open = new URLSearchParams(window.location.search).get('menu') === '1';
      setSidebarOpen(open);
      writeSidebarPreference(open);
    } else {
      setSidebarOpen(true);
      writeSidebarPreference(true);
    }
  }, [pathname]);

  const setSidebarOpenPersist = useCallback((updater: boolean | ((prev: boolean) => boolean)) => {
    setSidebarOpen((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: boolean) => boolean)(prev) : updater;
      writeSidebarPreference(next);
      return next;
    });
  }, []);

  return (
    <div className={`dashboard-layout ${sidebarOpen ? '' : 'collapsed'}`}>
      {/* Mobil: çekmece açıkken (sidebarOpen=true) arka plan — tıklanınca kapanır; ≤1024px CSS */}
      <button
        type="button"
        className={`dashboard-nav-scrim ${sidebarOpen ? 'dashboard-nav-scrim--on' : ''}`}
        aria-label="Menüyü kapat"
        tabIndex={-1}
        onClick={() => setSidebarOpenPersist(false)}
      />
      <DashboardSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpenPersist((p) => !p)} />
      <div className="dashboard-main">
        <DashboardHeader onMobileNavToggle={() => setSidebarOpenPersist((prev) => !prev)} />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
