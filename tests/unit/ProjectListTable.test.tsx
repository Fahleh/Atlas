/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProjectListTable } from "@/features/projects/ProjectListTable";
import type { Project } from "@/types/atlas.types";

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

describe("ProjectListTable", () => {
  it("should render the five expected column headers", () => {
    render(
      <ProjectListTable
        projects={[project]}
        onSelect={jest.fn()}
        membersByProject={{}}
        taskCountsByProject={{}}
      />,
    );

    for (const heading of ["PROJECT", "STATUS", "PROGRESS", "DUE DATE", "TEAM"]) {
      expect(screen.getByRole("columnheader", { name: heading })).toBeInTheDocument();
    }
  });

  it("should call onSelect with the project id on row click", () => {
    const onSelect = jest.fn();
    render(
      <ProjectListTable
        projects={[project]}
        onSelect={onSelect}
        membersByProject={{}}
        taskCountsByProject={{}}
      />,
    );

    fireEvent.click(screen.getByText("Atlas"));

    expect(onSelect).toHaveBeenCalledWith(project.id);
  });

  it("should call onSelect exactly once when the open button is clicked, not twice via row bubbling", () => {
    const onSelect = jest.fn();
    render(
      <ProjectListTable
        projects={[project]}
        onSelect={onSelect}
        membersByProject={{}}
        taskCountsByProject={{}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Atlas details" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(project.id);
  });
});
