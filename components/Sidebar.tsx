"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  User,
  LogOut,
  X,
  Sun,
  Moon,
} from "lucide-react";
import Link from "next/link";
import styles from "./Sidebar.module.css";
import { useTheme } from "@/providers/ThemeContext";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Profile", href: "/profile", icon: User },
];

function isLinkActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

/**
 * Sidebar navigation component with responsive behavior
 * Desktop: fixed, always visible
 * Mobile: overlay that slides in when opened
 * @param isOpen - Controls sidebar visibility on mobile
 * @param onClose - Callback to close the sidebar on mobile
 */
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Focus trap for mobile overlay mode
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (!isOpen || !isMobile) return;

    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const focusableElements = sidebar.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    sidebar.addEventListener("keydown", handleTabKey);
    firstElement?.focus();

    return () => {
      sidebar.removeEventListener("keydown", handleTabKey);
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (!isMobile) return;

    document.body.style.overflow = isOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleBackdropClick = () => {
    onClose();
  };

  const handleBackdropKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop - mobile only */}
      <div
        role="button"
        aria-label="Close navigation"
        tabIndex={isOpen ? 0 : -1}
        onClick={handleBackdropClick}
        onKeyDown={handleBackdropKeyDown}
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
      />

      {/* Sidebar container */}
      <aside
        ref={sidebarRef}
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-label="Main navigation"
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
      >
        {/* Header - Logo and close button */}
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>
            Atlas
          </Link>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className={styles.closeButton}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation links */}
        <nav aria-label="Main navigation" className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isLinkActive(item.href, pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${
                  isActive ? styles.navLinkActive : ""
                }`}
              >
                <Icon size={20} className={styles.navIcon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer - Logout button */}
        <div className={styles.footer}>
          <button
            onClick={toggleTheme}
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            className={styles.themeToggle}
          >
            {theme === "light" ? (
              <Moon size={20} className={styles.navIcon} />
            ) : (
              <Sun size={20} className={styles.navIcon} />
            )}

            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </button>

          <button className={styles.logoutButton}>
            {/* TODO: wire to Supabase auth logout */}
            <LogOut size={20} className={styles.navIcon} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
