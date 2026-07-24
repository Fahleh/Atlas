"use client";

import { ArrowUpRight } from "lucide-react";
import { Avatar, AvatarOverflow } from "@/components/Avatar";
import { getInitials } from "@/lib/utils";
import type { Member, Project, ProjectStatus } from "@/types/atlas.types";
import { DUE_DATE_FORMAT, STATUS_LABELS, truncateDescription } from "./projectUtils";
import styles from "./ProjectListTable.module.css";
import sharedStyles from "./projectShared.module.css";

type ProjectListTableProps = {
  projects: Project[];
  onSelect: (id: string) => void;
  membersByProject: Record<string, Member[]>;
};

const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  active: sharedStyles.statusActive,
  completed: sharedStyles.statusCompleted,
  archived: sharedStyles.statusArchived,
};

const MAX_VISIBLE_MEMBERS = 4;

const DESCRIPTION_TRUNCATE_LENGTH = 60;

/**
 * Renders the project list as a data table with five columns:
 * PROJECT, STATUS, PROGRESS, DUE DATE, and TEAM.
 *
 * @param projects - Filtered project list from ProjectList
 * @param onSelect - Callback fired with the project ID to open its slide-over
 * @param membersByProject - Members for each project, keyed by project ID
 */
export function ProjectListTable({
  projects,
  onSelect,
  membersByProject,
}: ProjectListTableProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} scope="col">
              PROJECT
            </th>
            <th className={styles.th} scope="col">
              STATUS
            </th>
            <th className={styles.th} scope="col">
              PROGRESS
            </th>
            <th className={styles.th} scope="col">
              DUE DATE
            </th>
            <th className={styles.th} scope="col">
              TEAM
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const members = membersByProject[project.id] ?? [];
            const visibleMembers = members.slice(0, MAX_VISIBLE_MEMBERS);
            const overflowCount = members.length - visibleMembers.length;

            return (
              <tr
                key={project.id}
                onClick={() => onSelect(project.id)}
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
                      {truncateDescription(
                        project.description,
                        DESCRIPTION_TRUNCATE_LENGTH,
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(project.id);
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

              {/* DUEDATE column */}
              <td className={styles.td}>
                <span className={sharedStyles.detailValue}>
                  {project.dueDate?.toLocaleDateString(
                    "en-US",
                    DUE_DATE_FORMAT,
                  ) ?? "—"}
                </span>
              </td>

              {/* TEAM column */}
              <td className={styles.td}>
                <div
                  className={sharedStyles.memberAvatars}
                  aria-label={`Project members (${members.length})`}
                >
                  {visibleMembers.map((member) => (
                    <span
                      key={member.id}
                      className={sharedStyles.memberAvatar}
                      aria-hidden="true"
                    >
                      <Avatar name={member.name} avatarUrl={member.avatarUrl} />
                    </span>
                  ))}
                  {overflowCount > 0 && (
                    <span
                      className={sharedStyles.memberOverflowSpacing}
                      aria-hidden="true"
                    >
                      <AvatarOverflow count={overflowCount} />
                    </span>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
