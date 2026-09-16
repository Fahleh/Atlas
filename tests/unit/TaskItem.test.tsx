/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import { TaskItem } from "@/features/tasks/TaskItem";
import { renderWithClient } from "@/tests/mocks/queryClient";
import type { Task } from "@/types/atlas.types";

const task: Task = {
  id: crypto.randomUUID(),
  assigneeId: null,
  projectId: "project-1",
  title: "Write the report",
  description: "",
  status: "in_progress",
  dueDate: null,
  createdAt: new Date(),
};

describe("TaskItem", () => {
  it("should render the task's title and status label, and call onSelect on click", () => {
    const onSelect = jest.fn();
    renderWithClient(<TaskItem task={task} members={[]} onSelect={onSelect} />);

    const row = screen.getByRole("button", { name: "Open Write the report" });
    expect(row).toHaveTextContent("Write the report");
    expect(row).toHaveTextContent("In Progress");

    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(task);
  });
});
