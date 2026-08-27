/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { TaskItem } from "@/features/tasks/TaskItem";
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
    render(<TaskItem task={task} onSelect={onSelect} />);

    const row = screen.getByRole("button", { name: "Open Write the report" });
    expect(row).toHaveTextContent("Write the report");
    expect(row).toHaveTextContent("In Progress");

    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(task);
  });

  it("should call onSelect on Enter and Space", () => {
    const onSelect = jest.fn();
    render(<TaskItem task={task} onSelect={onSelect} />);
    const row = screen.getByRole("button", { name: "Open Write the report" });

    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });

    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});
