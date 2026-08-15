"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Avatar, AvatarOverflow } from "@/components/Avatar";
import { getInitials } from "@/lib/utils";
import type { TaskCounts } from "@/hooks/useTaskCountsByProject";
import type { Member, Project, ProjectStatus } from "@/types/atlas.types";
import { DUE_DATE_FORMAT, STATUS_LABELS } from "./projectUtils";
import styles from "./ProjectCard.module.css";
import sharedStyles from "./projectShared.module.css";

type ProjectCardProps = {
  project: Project;
  members: Member[];
  taskCounts: TaskCounts;
  replaceHistory?: boolean;
};

const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  active: sharedStyles.statusActive,
  completed: sharedStyles.statusCompleted,
  archived: sharedStyles.statusArchived,
};

const MAX_VISIBLE_MEMBERS = 4;

/**
 * Displays a single project as a card. The project name is a real link
 * to `/projects?project=<id>`, stretched via `styles.cardLink`'s `::after`
 * to cover the whole card as the click/tap target.
 *
 * @param project - The project to display
 * @param members - Project members to render as an avatar strip
 * @param replaceHistory - Whether the link replaces history instead of pushing
 */
export function ProjectCard({
  project,
  members,
  taskCounts,
  replaceHistory = false,
}: ProjectCardProps) {
  const visibleMembers = members.slice(0, MAX_VISIBLE_MEMBERS);
  const overflowCount = members.length - visibleMembers.length;
  const progressPercent =
    taskCounts.total === 0
      ? 0
      : Math.round((taskCounts.done / taskCounts.total) * 100);

  return (
    <div className={styles.card}>
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
        <h3 className={styles.name}>
          <Link
            href={`/projects?project=${project.id}`}
            replace={replaceHistory}
            className={styles.cardLink}
          >
            {project.name}
          </Link>
        </h3>
        <p className={styles.description}>{project.description}</p>
      </div>

      <div className={styles.progressSection}>
        <progress
          className={styles.progressBar}
          value={progressPercent}
          max={100}
          aria-label="Project progress"
        />
        <span className={styles.taskCount}>
          {taskCounts.done}/{taskCounts.total} tasks
        </span>
      </div>

      <div className={styles.cardFooter}>
        <div
          role="group"
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
