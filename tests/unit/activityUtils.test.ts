import {
  buildActivityMessage,
  formatRelativeTime,
} from "@/features/activity/activityUtils";
import type { ActivityLogEntry } from "@/types/atlas.types";

function buildEntry(overrides: Partial<ActivityLogEntry>): ActivityLogEntry {
  return {
    id: "entry-1",
    projectId: "project-1",
    projectName: "Atlas",
    actorId: "user-1",
    actorName: "Priya",
    actorAvatarUrl: null,
    verb: "project_created",
    entityType: "project",
    entityId: "project-1",
    entityName: "Atlas",
    metadata: {},
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("buildActivityMessage", () => {
  it("should say a project was created, actor name as a person segment", () => {
    const entry = buildEntry({ verb: "project_created" });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " created this project" },
    ]);
  });

  it("should describe a single changed field, label as plain text and the new value as a thing segment", () => {
    const entry = buildEntry({
      verb: "project_updated",
      metadata: { changes: [{ field: "name", from: "Old", to: "New" }] },
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " updated this project's Name to " },
      { type: "thing", text: "New" },
    ]);
  });

  it("should render a status change through PROJECT_STATUS_CONFIG's label, not the raw value", () => {
    const entry = buildEntry({
      verb: "project_updated",
      metadata: {
        changes: [{ field: "status", from: "active", to: "completed" }],
      },
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " updated this project's Status to " },
      { type: "thing", text: "Completed" },
    ]);
  });

  it("should list multiple changed field labels without values, still carrying the project subject", () => {
    const entry = buildEntry({
      verb: "project_updated",
      metadata: {
        changes: [
          { field: "name", from: "Old", to: "New" },
          { field: "due_date", from: null, to: "2026-02-01" },
        ],
      },
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      {
        type: "text",
        text: " updated this project's Name, Due date",
      },
    ]);
  });

  it("should list multiple changed task fields carrying the task subject, not the project one", () => {
    const entry = buildEntry({
      verb: "task_updated",
      entityType: "task",
      entityName: "Fix login bug",
      metadata: {
        changes: [
          { field: "title", from: "Old title", to: "New title" },
          { field: "due_date", from: null, to: "2026-02-01" },
        ],
      },
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " updated a task's Title, Due date" },
    ]);
  });

  it("should render a cleared due date as No due date, not an invalid date string", () => {
    const entry = buildEntry({
      verb: "project_updated",
      metadata: {
        changes: [{ field: "due_date", from: "2026-02-01", to: null }],
      },
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " updated this project's Due date to " },
      { type: "thing", text: "No due date" },
    ]);
  });

  it("should say a task was created, actor as person and task title as thing", () => {
    const entry = buildEntry({
      verb: "task_created",
      entityType: "task",
      entityName: "Fix login bug",
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " created " },
      { type: "thing", text: "Fix login bug" },
    ]);
  });

  it("should describe a single changed task field with the task subject and the value as a thing segment", () => {
    const entry = buildEntry({
      verb: "task_updated",
      entityType: "task",
      entityName: "Fix login bug",
      metadata: {
        changes: [{ field: "title", from: "Old title", to: "New title" }],
      },
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " updated a task's Title to " },
      { type: "thing", text: "New title" },
    ]);
  });

  it("should not crash or route through PROJECT_STATUS_CONFIG for a task-entity status change", () => {
    // Real triggers never send a task status change this way, but this
    // proves the entityType guard holds: without it, "done" would throw.
    const entry = buildEntry({
      verb: "task_updated",
      entityType: "task",
      entityName: "Fix login bug",
      metadata: {
        changes: [{ field: "status", from: "todo", to: "done" }],
      },
    });

    expect(() => buildActivityMessage(entry)).not.toThrow();
    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " updated a task's Status to " },
      { type: "thing", text: "done" },
    ]);
  });

  it("should say a task was deleted", () => {
    const entry = buildEntry({
      verb: "task_deleted",
      entityType: "task",
      entityName: "Fix login bug",
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " deleted " },
      { type: "thing", text: "Fix login bug" },
    ]);
  });

  it("should say a task was completed when the new status is done", () => {
    const entry = buildEntry({
      verb: "task_status_changed",
      entityType: "task",
      entityName: "Fix login bug",
      metadata: { from: "in_progress", to: "done" },
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " completed " },
      { type: "thing", text: "Fix login bug" },
    ]);
  });

  it("should say a task was moved when the new status is not done, trailing status label as plain text", () => {
    const entry = buildEntry({
      verb: "task_status_changed",
      entityType: "task",
      entityName: "Fix login bug",
      metadata: { from: "todo", to: "in_progress" },
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " moved " },
      { type: "thing", text: "Fix login bug" },
      { type: "text", text: " to In Progress" },
    ]);
  });

  it("should say a member was added, both actor and the added member as person segments", () => {
    const entry = buildEntry({
      verb: "member_added",
      entityType: "project_member",
      entityName: "Jonas",
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " added " },
      { type: "person", text: "Jonas" },
      { type: "text", text: " to the project" },
    ]);
  });

  it("should say a member was removed, both actor and the removed member as person segments", () => {
    const entry = buildEntry({
      verb: "member_removed",
      entityType: "project_member",
      entityName: "Jonas",
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " removed " },
      { type: "person", text: "Jonas" },
      { type: "text", text: " from the project" },
    ]);
  });

  it("should say ownership was transferred, both names as person segments", () => {
    const entry = buildEntry({
      verb: "ownership_transferred",
      entityType: "project_member",
      entityName: "Jonas",
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " transferred ownership to " },
      { type: "person", text: "Jonas" },
    ]);
  });

  it("should say a task was assigned, the task as a thing segment and the assignee as a person segment", () => {
    const entry = buildEntry({
      verb: "task_assigned",
      entityType: "task",
      entityName: "Fix login bug",
      metadata: { assigneeName: "Jonas" },
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " assigned " },
      { type: "thing", text: "Fix login bug" },
      { type: "text", text: " to " },
      { type: "person", text: "Jonas" },
    ]);
  });

  it("should fall back to a plain assigned message when metadata carries no assignee name", () => {
    const entry = buildEntry({
      verb: "task_assigned",
      entityType: "task",
      entityName: "Fix login bug",
      metadata: {},
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " assigned " },
      { type: "thing", text: "Fix login bug" },
    ]);
  });

  it("should say a task was unassigned, the task as a thing segment and the previous assignee as a person segment", () => {
    const entry = buildEntry({
      verb: "task_unassigned",
      entityType: "task",
      entityName: "Fix login bug",
      metadata: { previousAssigneeName: "Jonas" },
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " unassigned " },
      { type: "thing", text: "Fix login bug" },
      { type: "text", text: " from " },
      { type: "person", text: "Jonas" },
    ]);
  });

  it("should fall back to a plain unassigned message when metadata carries no previous assignee name", () => {
    const entry = buildEntry({
      verb: "task_unassigned",
      entityType: "task",
      entityName: "Fix login bug",
      metadata: {},
    });

    expect(buildActivityMessage(entry)).toEqual([
      { type: "person", text: "Priya" },
      { type: "text", text: " unassigned " },
      { type: "thing", text: "Fix login bug" },
    ]);
  });
});

describe("formatRelativeTime", () => {
  // Noon UTC keeps the date stable across UTC-11 through UTC+11, every
  // real contributor machine and CI runner, not proof beyond that range.
  const now = new Date("2026-01-08T12:00:00.000Z").getTime();

  it("should say just now for anything under 60 seconds old", () => {
    const date = new Date(now - 59 * 1000);

    expect(formatRelativeTime(date, now)).toBe("just now");
  });

  it("should say 1m ago at exactly the 60 second boundary", () => {
    const date = new Date(now - 60 * 1000);

    expect(formatRelativeTime(date, now)).toBe("1m ago");
  });

  it("should say 59m ago just under the 60 minute boundary", () => {
    const date = new Date(now - 59 * 60 * 1000);

    expect(formatRelativeTime(date, now)).toBe("59m ago");
  });

  it("should say 1h ago at exactly the 60 minute boundary", () => {
    const date = new Date(now - 60 * 60 * 1000);

    expect(formatRelativeTime(date, now)).toBe("1h ago");
  });

  it("should say 23h ago just under the 24 hour boundary", () => {
    const date = new Date(now - 23 * 60 * 60 * 1000);

    expect(formatRelativeTime(date, now)).toBe("23h ago");
  });

  it("should say 1d ago at exactly the 24 hour boundary", () => {
    const date = new Date(now - 24 * 60 * 60 * 1000);

    expect(formatRelativeTime(date, now)).toBe("1d ago");
  });

  it("should say 6d ago just under the 7 day boundary", () => {
    const date = new Date(now - 6 * 24 * 60 * 60 * 1000);

    expect(formatRelativeTime(date, now)).toBe("6d ago");
  });

  it("should fall back to a calendar date at exactly the 7 day boundary", () => {
    const date = new Date(now - 7 * 24 * 60 * 60 * 1000);

    expect(formatRelativeTime(date, now)).toBe("January 1, 2026");
  });

  it("should fall back to a calendar date well past a week old", () => {
    const date = new Date("2025-11-03T12:00:00.000Z");

    expect(formatRelativeTime(date, now)).toBe("November 3, 2025");
  });
});
