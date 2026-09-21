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
  ActivityMessageSegment,
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

function isAssignedMetadata(
  metadata: unknown,
): metadata is { assigneeName: string } {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    typeof (metadata as { assigneeName?: unknown }).assigneeName === "string"
  );
}

function isUnassignedMetadata(
  metadata: unknown,
): metadata is { previousAssigneeName: string } {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    typeof (metadata as { previousAssigneeName?: unknown })
      .previousAssigneeName === "string"
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

function textSeg(text: string): ActivityMessageSegment {
  return { type: "text", text };
}

function personSeg(text: string): ActivityMessageSegment {
  return { type: "person", text };
}

function thingSeg(text: string): ActivityMessageSegment {
  return { type: "thing", text };
}

function buildFieldChangeMessage(
  actorName: string,
  changes: ActivityFieldChange[],
  entityType: ActivityEntityType,
): ActivityMessageSegment[] {
  const subject = entityType === "task" ? "a task's" : "this project's";

  if (changes.length === 1) {
    const [change] = changes;
    const label = formatFieldLabel(change.field);
    const value = formatFieldValue(change.field, change.to, entityType);
    return [
      personSeg(actorName),
      textSeg(` updated ${subject} ${label} to `),
      thingSeg(value),
    ];
  }

  const labels = changes
    .map((change) => formatFieldLabel(change.field))
    .join(", ");
  return [personSeg(actorName), textSeg(` updated ${subject} ${labels}`)];
}

/**
 * Builds the exact per-verb activity message for one activity_log entry as
 * an ordered list of typed segments, so the renderer can style a person's
 * name and an entity's name differently within the same sentence.
 *
 * @param entry - A single activity log entry
 * @returns Ordered display segments
 */
export function buildActivityMessage(
  entry: ActivityLogEntry,
): ActivityMessageSegment[] {
  const { verb, actorName, entityName, entityType, metadata } = entry;

  switch (verb) {
    case "project_created":
      return [personSeg(actorName), textSeg(" created this project")];

    case "project_updated":
    case "task_updated":
      if (isChangesMetadata(metadata) && metadata.changes.length > 0) {
        return buildFieldChangeMessage(actorName, metadata.changes, entityType);
      }
      return [personSeg(actorName), textSeg(" updated "), thingSeg(entityName)];

    case "task_status_changed":
      if (isStatusChangeMetadata(metadata)) {
        const status = metadata.to as TaskStatus;
        if (status === "done") {
          return [
            personSeg(actorName),
            textSeg(" completed "),
            thingSeg(entityName),
          ];
        }
        return [
          personSeg(actorName),
          textSeg(" moved "),
          thingSeg(entityName),
          textSeg(` to ${STATUS_CONFIG[status].label}`),
        ];
      }
      return [personSeg(actorName), textSeg(" moved "), thingSeg(entityName)];

    case "task_created":
      return [personSeg(actorName), textSeg(" created "), thingSeg(entityName)];

    case "task_deleted":
      return [personSeg(actorName), textSeg(" deleted "), thingSeg(entityName)];

    case "member_added":
      return [
        personSeg(actorName),
        textSeg(" added "),
        personSeg(entityName),
        textSeg(" to the project"),
      ];

    case "member_removed":
      return [
        personSeg(actorName),
        textSeg(" removed "),
        personSeg(entityName),
        textSeg(" from the project"),
      ];

    case "ownership_transferred":
      return [
        personSeg(actorName),
        textSeg(" transferred ownership to "),
        personSeg(entityName),
      ];

    case "task_assigned":
      if (isAssignedMetadata(metadata)) {
        return [
          personSeg(actorName),
          textSeg(" assigned "),
          thingSeg(entityName),
          textSeg(" to "),
          personSeg(metadata.assigneeName),
        ];
      }
      return [
        personSeg(actorName),
        textSeg(" assigned "),
        thingSeg(entityName),
      ];

    case "task_unassigned":
      if (isUnassignedMetadata(metadata)) {
        return [
          personSeg(actorName),
          textSeg(" unassigned "),
          thingSeg(entityName),
          textSeg(" from "),
          personSeg(metadata.previousAssigneeName),
        ];
      }
      return [
        personSeg(actorName),
        textSeg(" unassigned "),
        thingSeg(entityName),
      ];
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
