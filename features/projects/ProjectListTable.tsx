"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, MoreHorizontal } from "lucide-react";
import type { Project, ProjectStatus } from "@/types/atlas.types";
import {
  STATUS_LABELS,
  getInitials,
  getMemberAvatarColor,
  truncateDescription,
} from "./projectUtils";
import styles from "./ProjectListTable.module.css";
import sharedStyles from "./projectShared.module.css";

type ProjectListTableProps = {
  projects: Project[];
  onSelect: (project: Project) => void;
};

const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  active: sharedStyles.statusActive,
  completed: sharedStyles.statusCompleted,
  archived: sharedStyles.statusArchived,
};

// TODO: wire to members data
const PLACEHOLDER_MEMBERS = ["JD", "SK", "MR"];

const DESCRIPTION_TRUNCATE_LENGTH = 60;

/**
 * Renders the project list as a data table with five columns:
 * PROJECT, STATUS, PROGRESS, TEAM, and a per-row more-options menu.
 *
 * @param projects - Filtered project list from ProjectList
 * @param onSelect - Callback to open the slide-over for a given project
 */
export function ProjectListTable({ projects, onSelect }: ProjectListTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close the more menu when Escape is pressed
  useEffect(() => {
    if (!openMenuId) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [openMenuId]);

  // Close the more menu when the user clicks outside any menu cell
  useEffect(() => {
    if (!openMenuId) return;

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest("[data-menu-cell]")) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [openMenuId]);

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} scope="col">PROJECT</th>
            <th className={styles.th} scope="col">STATUS</th>
            <th className={styles.th} scope="col">PROGRESS</th>
            <th className={styles.th} scope="col">TEAM</th>
            <th className={styles.th} scope="col">
              <span className={styles.srOnly}>More options</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              onClick={() => onSelect(project)}
              className={styles.row}
            >
              {/* PROJECT column: avatar + name + description + open button */}
              <td className={styles.td}>
                <div className={styles.projectCell}>
                  <div className={styles.avatar} aria-hidden="true">
                    {getInitials(project.name)}
                  </div>
                  <div className={styles.projectInfo}>
                    <span className={styles.projectName}>{project.name}</span>
                    <span className={styles.projectDescription}>
                      {truncateDescription(project.description, DESCRIPTION_TRUNCATE_LENGTH)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(project);
                    }}
                    aria-label={`Open ${project.name} details`}
                    className={styles.openButton}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </td>

              {/* STATUS column */}
              <td className={styles.td}>
                <div
                  className={`${sharedStyles.statusBadge} ${STATUS_BADGE_CLASS[project.status]}`}
                >
                  <span className={sharedStyles.statusDot} aria-hidden="true" />
                  {STATUS_LABELS[project.status]}
                </div>
              </td>

              {/* PROGRESS column */}
              <td className={styles.td}>
                <div className={styles.progressCell}>
                  <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-valuenow={0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Project progress"
                  >
                    {/* TODO: wire progress to tasks data */}
                    <div className={styles.progressFill} />
                  </div>
                  <span className={styles.progressLabel}>0%</span>
                </div>
              </td>

              {/* TEAM column */}
              <td className={styles.td}>
                <div className={sharedStyles.memberAvatars} aria-label="Project members">
                  {/* TODO: wire to members data */}
                  {PLACEHOLDER_MEMBERS.map((initials) => {
                    const color = getMemberAvatarColor(initials);
                    return (
                      <span
                        key={initials}
                        style={
                          {
                            "--avatar-bg": color.bg,
                            "--avatar-text": color.text,
                          } as React.CSSProperties
                        }
                        className={sharedStyles.memberAvatar}
                        aria-hidden="true"
                      >
                        {initials}
                      </span>
                    );
                  })}
                </div>
              </td>

              {/* MORE column: stopPropagation prevents row click from firing */}
              <td
                className={`${styles.td} ${styles.menuTd}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.menuCell} data-menu-cell="true">
                  <button
                    type="button"
                    aria-label={`More options for ${project.name}`}
                    aria-expanded={openMenuId === project.id}
                    aria-haspopup="menu"
                    onClick={() =>
                      setOpenMenuId(
                        openMenuId === project.id ? null : project.id,
                      )
                    }
                    className={styles.moreButton}
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {openMenuId === project.id && (
                    <div
                      role="menu"
                      aria-label={`Actions for ${project.name}`}
                      className={styles.dropdown}
                    >
                      {/* TODO: wire to project actions menu */}
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.dropdownItem}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.dropdownItem}
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
