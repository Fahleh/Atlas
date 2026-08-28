import {
  DATE_FORMAT,
  DUE_DATE_FORMAT,
  PROJECT_STATUS_CONFIG,
  truncateDescription,
} from "@/features/projects/projectUtils";
import { STATUS_CONFIG } from "@/features/tasks/taskUtils";
import type {
  ActivityEntityType,
  ActivityLogEntry,
  ProjectStatus,
  TaskStatus,
} from "@/types/atlas.types";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

const NO_DUE_DATE_LABEL = "No due date";

type ActivityFieldChange = {
  field: string;
  from: string | null;
  to: string | null;
};

function isChangesMetadata(
  metadata: unknown,
): metadata is { changes: ActivityFieldChange[] } {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    Array.isArray((metadata as { changes?: unknown }).changes)
  );
}

function isStatusChangeMetadata(
  metadata: unknown,
): metadata is { from: string; to: string } {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    typeof (metadata as { to?: unknown }).to === "string"
  );
}

/**
 * Converts a snake_case field name into a capitalized display label.
 *
 * @param field - Raw metadata field name, e.g. "due_date"
 * @returns Sentence-case label, e.g. "Due date"
 */
function formatFieldLabel(field: string): string {
  const spaced = field.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Formats a single changed field's "to" value for the activity message,
 * routing dates and statuses through the app's existing display formatters.
 *
 * @param field - The changed field's raw name
 * @param value - The field's new raw value, or null
 * @returns Display-ready value string
 */
function formatFieldValue(
  field: string,
  value: string | null,
  entityType: ActivityEntityType,
): string {
  if (field === "due_date") {
    return value
      ? new Date(value).toLocaleDateString("en-US", DUE_DATE_FORMAT)
      : NO_DUE_DATE_LABEL;
  }
  if (field === "status" && entityType === "project") {
    return PROJECT_STATUS_CONFIG[value as ProjectStatus].label;
  }
  if (field === "description" && value) {
    return truncateDescription(value);
  }
  return value ?? "";
}

function buildFieldChangeMessage(
  actorName: string,
  changes: ActivityFieldChange[],
  entityType: ActivityEntityType,
): string {
  if (changes.length === 1) {
    const [change] = changes;
    const label = formatFieldLabel(change.field);
    const value = formatFieldValue(change.field, change.to, entityType);
    return `${actorName} updated ${label} to ${value}`;
  }
  const labels = changes.map((change) => formatFieldLabel(change.field));
  return `${actorName} updated ${labels.join(", ")}`;
}

/**
 * Builds the exact per-verb activity message for one activity_log entry.
 *
 * @param entry - A single activity log entry
 * @returns Display-ready message string
 */
export function buildActivityMessage(entry: ActivityLogEntry): string {
  const { verb, actorName, entityName, entityType, metadata } = entry;

  switch (verb) {
    case "project_created":
      return `${actorName} created this project`;

    case "project_updated":
    case "task_updated":
      if (isChangesMetadata(metadata) && metadata.changes.length > 0) {
        return buildFieldChangeMessage(actorName, metadata.changes, entityType);
      }
      return `${actorName} updated ${entityName}`;

    case "task_status_changed":
      if (isStatusChangeMetadata(metadata)) {
        const status = metadata.to as TaskStatus;
        if (status === "done") {
          return `${actorName} completed ${entityName}`;
        }
        return `${actorName} moved ${entityName} to ${STATUS_CONFIG[status].label}`;
      }
      return `${actorName} moved ${entityName}`;

    case "task_created":
      return `${actorName} created ${entityName}`;

    case "task_deleted":
      return `${actorName} deleted ${entityName}`;

    case "member_added":
      return `${actorName} added ${entityName} to the project`;

    case "member_removed":
      return `${actorName} removed ${entityName} from the project`;
  }
}

/**
 * Formats a timestamp as a relative label ("just now", "5m ago", "3h ago",
 * "2d ago"), falling back to a calendar date once the entry is a week old.
 * `now` is taken as a parameter rather than read internally, matching the
 * dashboard's existing convention of fixing "now" once at mount.
 *
 * @param date - The timestamp to format
 * @param now - The current time in epoch milliseconds
 * @returns Relative or calendar-date display string
 */
export function formatRelativeTime(date: Date, now: number): string {
  const diffMs = now - date.getTime();

  if (diffMs < MINUTE_MS) return "just now";
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)}m ago`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}h ago`;
  if (diffMs < WEEK_MS) return `${Math.floor(diffMs / DAY_MS)}d ago`;
  return date.toLocaleDateString("en-US", DATE_FORMAT);
}
