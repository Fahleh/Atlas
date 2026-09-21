/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { AssigneeListbox } from "@/features/tasks/AssigneeListbox";
import type { Member } from "@/types/atlas.types";

const member: Member = {
  id: "member-1",
  name: "Ada Lovelace",
  avatarUrl: null,
  role: "collaborator",
  deletedAt: null,
};

describe("AssigneeListbox unassigned option label", () => {
  it("should read Unassigned when the task has no current assignee", () => {
    render(<AssigneeListbox variant="avatar" members={[member]} defaultValue={null} />);

    fireEvent.click(screen.getByRole("button", { name: "Assign a member" }));

    expect(screen.getByRole("option", { name: "Unassigned" })).toBeInTheDocument();
  });

  it("should read Unassign when the task currently has an assignee", () => {
    render(
      <AssigneeListbox variant="avatar" members={[member]} defaultValue={member.id} />,
    );

    fireEvent.click(screen.getByRole("button", { name: `Assigned to ${member.name}` }));

    expect(screen.getByRole("option", { name: "Unassign" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Unassigned" })).not.toBeInTheDocument();
  });
});
