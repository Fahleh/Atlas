"use client";

import { ArrowUpRight } from "lucide-react";
import { Avatar, AvatarOverflow } from "@/components/Avatar";
import { getInitials } from "@/lib/utils";
import type { Member, Project, ProjectStatus } from "@/types/atlas.types";
import { DUE_DATE_FORMAT, STATUS_LABELS } from "./projectUtils";
import styles from "./ProjectCard.module.css";
import sharedStyles from "./projectShared.module.css";

type ProjectCardProps = {
  project: Project;
  onSelect: (id: string) => void;
  members: Member[];
};

const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  active: sharedStyles.statusActive,
  completed: sharedStyles.statusCompleted,
  archived: sharedStyles.statusArchived,
};

const MAX_VISIBLE_MEMBERS = 4;

/**
 * Displays a single project as a clickable card.
 * Clicking or pressing Enter/Space calls onSelect with the project ID.
 *
 * @param project - The project to display
 * @param onSelect - Callback fired with the project ID when the card is activated
 * @param members - Project members to render as an avatar strip
 */
export function ProjectCard({ project, onSelect, members }: ProjectCardProps) {
  const visibleMembers = members.slice(0, MAX_VISIBLE_MEMBERS);
  const overflowCount = members.length - visibleMembers.length;
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter") {
      onSelect(project.id);
    }
    if (e.key === " ") {
      e.preventDefault();
      onSelect(project.id);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${project.name} details`}
      onClick={() => onSelect(project.id)}
      onKeyDown={handleKeyDown}
      className={styles.card}
    >
      <div className={styles.cardHeader}>
        <div className={styles.avatar} aria-hidden="true">
          {getInitials(project.name)}
        </div>
        <div
          className={`${sharedStyles.statusBadge} ${STATUS_BADGE_CLASS[project.status]}`}
        >
          <span className={sharedStyles.statusDot} aria-hidden="true" />
          <span>{STATUS_LABELS[project.status]}</span>
        </div>
        <span className={styles.arrow} aria-hidden="true">
          <ArrowUpRight size={16} />
        </span>
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.name}>{project.name}</h3>
        <p className={styles.description}>{project.description}</p>
      </div>

      <div className={styles.progressSection}>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Project progress"
        >
          {/* TODO: wire progress percentage to tasks data */}
          <div className={styles.progressFill} />
        </div>
        <span className={styles.taskCount}>
          {/* TODO: wire to tasks data */}
          0/0 tasks
        </span>
      </div>

      <div className={styles.cardFooter}>
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

        <dl className={sharedStyles.detailList}>
          <div className={sharedStyles.detailRow}>
            <dt className={sharedStyles.detailLabel}>Due date</dt>
            <dd className={sharedStyles.detailValue}>
              {project.dueDate?.toLocaleDateString("en-US", DUE_DATE_FORMAT) ??
                "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
