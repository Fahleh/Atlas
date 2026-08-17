/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ProjectCard } from "@/features/projects/ProjectCard";
import { calculateProgressPercent } from "@/features/projects/projectUtils";
import type { Project } from "@/types/atlas.types";
import type { TaskCounts } from "@/hooks/useTaskCountsByProject";

const project: Project = {
  id: crypto.randomUUID(),
  ownerId: "user-123",
  name: "Atlas",
  description: "A PM tool",
  dueDate: null,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const renderCard = (taskCounts: TaskCounts) =>
  render(
    <ProjectCard project={project} members={[]} taskCounts={taskCounts} />,
  );

describe("ProjectCard progress bar", () => {
  it("should render the honest, clamped percentage for a typical ratio", () => {
    const taskCounts: TaskCounts = { done: 3, total: 4 };
    renderCard(taskCounts);

    const progress = screen.getByRole("progressbar", {
      name: "Project progress",
    });

    expect(progress).toHaveAttribute(
      "value",
      String(calculateProgressPercent(taskCounts)),
    );
    expect(progress).toHaveAttribute("value", "75");
  });

  it("should clamp a 1/500-style ratio up to 1, not round it down to 0", () => {
    const taskCounts: TaskCounts = { done: 1, total: 500 };
    renderCard(taskCounts);

    const progress = screen.getByRole("progressbar", {
      name: "Project progress",
    });

    expect(progress).toHaveAttribute(
      "value",
      String(calculateProgressPercent(taskCounts)),
    );
    expect(progress).toHaveAttribute("value", "1");
  });

  it("should render 0 for a zero-task project, not 100", () => {
    const taskCounts: TaskCounts = { done: 0, total: 0 };
    renderCard(taskCounts);

    const progress = screen.getByRole("progressbar", {
      name: "Project progress",
    });

    expect(progress).toHaveAttribute(
      "value",
      String(calculateProgressPercent(taskCounts)),
    );
    expect(progress).toHaveAttribute("value", "0");
  });

  it("should render 100 only when done equals total", () => {
    const taskCounts: TaskCounts = { done: 10, total: 10 };
    renderCard(taskCounts);

    const progress = screen.getByRole("progressbar", {
      name: "Project progress",
    });

    expect(progress).toHaveAttribute(
      "value",
      String(calculateProgressPercent(taskCounts)),
    );
    expect(progress).toHaveAttribute("value", "100");
  });
});
