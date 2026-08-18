/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProjectModal } from "@/features/projects/ProjectModal";
import type { Project } from "@/types/atlas.types";
import type { ProjectFormState } from "@/features/projects/projectActions";

const noopAction = jest.fn(
  async (): Promise<ProjectFormState> => ({ error: null, errorKind: null }),
);

const editingProject: Project = {
  id: crypto.randomUUID(),
  ownerId: "user-1",
  name: "Atlas",
  description: "A PM tool",
  status: "active",
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ProjectModal isDirty", () => {
  it("should never disable Save in create mode", () => {
    render(
      <ProjectModal
        open
        onOpenChange={jest.fn()}
        action={noopAction}
        editingProject={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Create project" })).toBeEnabled();
  });

  it("should disable Save in edit mode until a field changes", () => {
    render(
      <ProjectModal
        open
        onOpenChange={jest.fn()}
        action={noopAction}
        editingProject={editingProject}
      />,
    );

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("should enable Save once a field changes, and keep it enabled after reverting", () => {
    render(
      <ProjectModal
        open
        onOpenChange={jest.fn()}
        action={noopAction}
        editingProject={editingProject}
      />,
    );
    const nameInput = screen.getByLabelText("Name");

    fireEvent.change(nameInput, { target: { value: "Atlas 2" } });
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();

    fireEvent.change(nameInput, { target: { value: "Atlas" } });
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });
});
