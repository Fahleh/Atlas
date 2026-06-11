"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { Project, ProjectStatus } from "@/types/atlas.types";
import styles from "./ProjectSlideOver.module.css";
import { STATUS_LABELS } from "./projectUtils";

type ProjectSlideOverProps = {
  project: Project | null;
  onClose: () => void;
};

const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  active: styles.statusActive,
  completed: styles.statusCompleted,
  archived: styles.statusArchived,
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

/**
 * Slide-over panel that shows full project details.
 * Always rendered in the DOM — visibility is CSS-controlled via isOpen state.
 * Includes focus trap, body scroll lock, and Escape key handling.
 *
 * @param project - The selected project, or null when no project is selected
 * @param onClose - Callback to clear the selected project
 */
export function ProjectSlideOver({ project, onClose }: ProjectSlideOverProps) {
  const isOpen = project !== null;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Move focus to close button when panel opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Focus trap: cycle Tab/Shift+Tab within the panel while open
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    panel.addEventListener("keydown", handleTabKey);
    return () => {
      panel.removeEventListener("keydown", handleTabKey);
    };
  }, [isOpen]);

  // Escape key closes the panel
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Body scroll lock while panel is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function handleBackdropKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <>
      {/* Backdrop — always in DOM, visibility via CSS */}
      <div
        role="button"
        aria-label="Close project details"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
        onKeyDown={handleBackdropKeyDown}
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ""}`}
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-label={project ? `${project.name} details` : "Project details"}
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`}
      >
        <div className={styles.panelHeader}>
          <div className={styles.panelMeta}>
            <h2 className={styles.panelTitle}>{project?.name ?? ""}</h2>
            {project && (
              <div
                className={`${styles.statusBadge} ${STATUS_BADGE_CLASS[project.status]}`}
              >
                <span className={styles.statusDot} aria-hidden="true" />
                {STATUS_LABELS[project.status]}
              </div>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close project details"
            className={styles.closeButton}
          >
            <X size={20} />
          </button>
        </div>

        {project && (
          <div className={styles.panelContent}>
            {project.description && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Description</h3>
                <p className={styles.sectionText}>{project.description}</p>
              </section>
            )}

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Details</h3>
              <dl className={styles.detailList}>
                <div className={styles.detailRow}>
                  <dt className={styles.detailLabel}>Created</dt>
                  <dd className={styles.detailValue}>
                    {new Date(project.createdAt).toLocaleDateString(
                      "en-US",
                      DATE_FORMAT,
                    )}
                  </dd>
                </div>
                {project.dueDate && (
                  <div className={styles.detailRow}>
                    <dt className={styles.detailLabel}>Due date</dt>
                    <dd className={styles.detailValue}>
                      {new Date(project.dueDate).toLocaleDateString(
                        "en-US",
                        DATE_FORMAT,
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Tasks</h3>
              {/* TODO: wire to tasks data */}
              <p className={styles.emptyText}>No tasks yet.</p>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Members</h3>
              {/* TODO: wire to members data */}
              <p className={styles.emptyText}>No members yet.</p>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
