"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ClearQueryCacheOnMount } from "@/components/ClearQueryCacheOnMount";
import styles from "./layout.module.css";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

/**
 * Dashboard shell layout for all authenticated pages
 * Provides persistent Sidebar and Header with responsive behavior
 * Desktop: fixed sidebar always visible, header offset by sidebar width
 * Mobile: collapsible sidebar overlay, full-width header with menu button
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <ClearQueryCacheOnMount />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <Header onMenuClick={() => setSidebarOpen(true)} />

      {/* Main content area - children remain as Server Components */}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
