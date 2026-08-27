/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ProjectCard } from "@/features/projects/ProjectCard";
import { calculateProgressPercent } from "@/features/projects/projectUtils";
import type { Member, Project, ProjectStatus } from "@/types/atlas.types";
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

function buildMembers(count: number): Member[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `member-${i}`,
    name: `Member ${i}`,
    avatarUrl: null,
    role: i === 0 ? "owner" : "collaborator",
  }));
}

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

describe("ProjectCard status badge", () => {
  it.each<[ProjectStatus, string]>([
    ["active", "Active"],
    ["completed", "Completed"],
    ["archived", "Archived"],
  ])("should render the %s status as %s", (status, label) => {
    render(
      <ProjectCard
        project={{ ...project, status }}
        members={[]}
        taskCounts={{ done: 0, total: 0 }}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("ProjectCard member avatar strip", () => {
  it("should render all members with no overflow indicator when 4 or fewer", () => {
    render(
      <ProjectCard
        project={project}
        members={buildMembers(3)}
        taskCounts={{ done: 0, total: 0 }}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Project members (3)" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it("should cap the visible strip at 4 and show a +N overflow indicator beyond that", () => {
    render(
      <ProjectCard
        project={project}
        members={buildMembers(6)}
        taskCounts={{ done: 0, total: 0 }}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Project members (6)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });
});

describe("ProjectCard due date and link", () => {
  it("should show the formatted due date when present, and — when absent", () => {
    const { rerender } = render(
      <ProjectCard
        project={{ ...project, dueDate: new Date("2026-03-15T00:00:00.000Z") }}
        members={[]}
        taskCounts={{ done: 0, total: 0 }}
      />,
    );
    expect(screen.getByText("Mar 15, 2026")).toBeInTheDocument();

    rerender(
      <ProjectCard
        project={{ ...project, dueDate: null }}
        members={[]}
        taskCounts={{ done: 0, total: 0 }}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("should link the project name to its slide-over URL", () => {
    render(
      <ProjectCard project={project} members={[]} taskCounts={{ done: 0, total: 0 }} />,
    );

    expect(screen.getByRole("link", { name: project.name })).toHaveAttribute(
      "href",
      `/projects?project=${project.id}`,
    );
  });
});
