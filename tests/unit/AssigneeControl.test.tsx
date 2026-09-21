/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import { AssigneeControl } from "@/features/tasks/AssigneeControl";
import { renderWithClient } from "@/tests/mocks/queryClient";
import { assignTask } from "@/features/tasks/taskActions";
import type { Member, Task } from "@/types/atlas.types";

jest.mock("@/features/tasks/taskActions", () => ({
  assignTask: jest.fn().mockResolvedValue({ error: null, errorKind: null }),
}));

const member: Member = {
  id: "member-1",
  name: "Ada Lovelace",
  avatarUrl: null,
  role: "collaborator",
  deletedAt: null,
};

const unassignedTask: Task = {
  id: crypto.randomUUID(),
  assigneeId: null,
  projectId: "project-1",
  title: "Write the report",
  description: "",
  status: "todo",
  position: 1000,
  dueDate: null,
  createdAt: new Date(),
};

const assignedTask: Task = {
  ...unassignedTask,
  assigneeId: member.id,
};

describe("AssigneeControl", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should not call assignTask when reselecting Unassigned on a task that already has no assignee", () => {
    renderWithClient(<AssigneeControl task={unassignedTask} members={[member]} />);

    fireEvent.click(screen.getByRole("button", { name: "Assign a member" }));
    fireEvent.click(screen.getByRole("option", { name: "Unassigned" }));

    expect(assignTask).not.toHaveBeenCalled();
  });

  it("should call assignTask when picking a real member on an unassigned task", () => {
    renderWithClient(<AssigneeControl task={unassignedTask} members={[member]} />);

    fireEvent.click(screen.getByRole("button", { name: "Assign a member" }));
    fireEvent.click(screen.getByRole("option", { name: new RegExp(member.name) }));

    expect(assignTask).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeId: member.id, previousAssigneeId: null }),
    );
  });

  it("should call assignTask when unassigning a task that currently has an assignee", () => {
    renderWithClient(<AssigneeControl task={assignedTask} members={[member]} />);

    fireEvent.click(screen.getByRole("button", { name: `Assigned to ${member.name}` }));
    fireEvent.click(screen.getByRole("option", { name: "Unassign" }));

    expect(assignTask).toHaveBeenCalledWith(
      expect.objectContaining({ assigneeId: null, previousAssigneeId: member.id }),
    );
  });
});
