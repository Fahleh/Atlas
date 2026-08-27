/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ProjectStats } from "@/features/projects/ProjectStats";
import type { Project } from "@/types/atlas.types";
import type { TaskCounts } from "@/hooks/useTaskCountsByProject";

function buildProject(overrides: Partial<Project>): Project {
  return {
    id: crypto.randomUUID(),
    ownerId: "user-1",
    name: "Project",
    description: "",
    status: "active",
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// dt/dd have no ARIA link beyond DOM adjacency; nextElementSibling mirrors
// that same relationship, not a fragile stand-in for a stronger one.
function getStatValue(label: string): string {
  return screen.getByText(label).nextElementSibling!.textContent!;
}

describe("ProjectStats aggregation", () => {
  it("should compute total, active count, task totals, and overdue (excluding completed)", () => {
    const now = new Date("2026-06-15T00:00:00.000Z");
    jest.useFakeTimers().setSystemTime(now);

    const past = new Date("2026-01-01T00:00:00.000Z");
    const future = new Date("2026-12-01T00:00:00.000Z");

    const projects: Project[] = [
      buildProject({ id: "p1", status: "active", dueDate: past }), // overdue
      buildProject({ id: "p2", status: "active", dueDate: future }), // not overdue
      buildProject({ id: "p3", status: "completed", dueDate: past }), // excluded: completed
      buildProject({ id: "p4", status: "archived", dueDate: null }),
    ];
    const taskCounts: Record<string, TaskCounts> = {
      p1: { done: 2, total: 4 },
      p2: { done: 1, total: 1 },
      p3: { done: 3, total: 3 },
      p4: { done: 0, total: 0 },
    };

    render(<ProjectStats projects={projects} taskCounts={taskCounts} isLoading={false} />);

    expect(getStatValue("Total Projects")).toBe("4");
    expect(getStatValue("Active")).toBe("2");
    expect(getStatValue("Tasks Done")).toBe("6/8");
    expect(getStatValue("Overdue")).toBe("1");

    jest.useRealTimers();
  });

  it("should default a project with no task-count entry to 0/0, not throw", () => {
    const projects: Project[] = [buildProject({ id: "p1" })];

    render(<ProjectStats projects={projects} taskCounts={{}} isLoading={false} />);

    expect(getStatValue("Tasks Done")).toBe("0/0");
  });

  it("should render skeleton placeholders instead of numbers while loading", () => {
    render(<ProjectStats projects={[]} taskCounts={{}} isLoading />);

    expect(screen.getByRole("status", { name: "Loading project stats" })).toBeInTheDocument();
    expect(getStatValue("Total Projects")).toBe("");
  });
});
