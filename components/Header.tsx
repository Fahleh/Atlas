"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import styles from "./Header.module.css";

type HeaderProps = {
  onMenuClick: () => void;
};

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/profile": "Profile",
};

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const match = Object.entries(PAGE_TITLES).find(
    ([path]) => path !== "/" && pathname.startsWith(path),
  );
  return match ? match[1] : "Dashboard";
}

/**
 * Top application header with responsive menu button, page title, and user identity.
 * Menu button and logo are hidden on desktop where the sidebar is always visible.
 * @param onMenuClick - Callback to open the mobile sidebar overlay
 */
export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className={styles.header} aria-label="Page header">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation"
          className={styles.menuButton}
        >
          <Menu size={24} />
        </button>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* TODO: replace initials and name with authenticated user data from Supabase */}
        <span className={styles.userName}>Fahleh</span>
        <div className={styles.avatar} aria-hidden="true">
          FA
        </div>
      </div>
    </header>
  );
}
