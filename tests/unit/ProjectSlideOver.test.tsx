/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";

jest.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: jest.fn() }));
jest.mock("@/hooks/useTasks", () => ({ useTasks: jest.fn() }));
jest.mock("@/features/projects/projectActions", () => ({
  addMember: jest.fn(),
  removeMember: jest.fn(),
  deleteProject: jest.fn(),
}));
jest.mock("@/features/tasks/taskActions", () => ({
  createTaskAction: jest.fn(() => jest.fn()),
  createDeleteTaskAction: jest.fn(() => jest.fn()),
}));

import { act, fireEvent, screen, within } from "@testing-library/react";
import { ProjectSlideOver } from "@/features/projects/ProjectSlideOver";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTasks } from "@/hooks/useTasks";
import { addMember, removeMember, deleteProject } from "@/features/projects/projectActions";
import { renderWithClient } from "@/tests/mocks/queryClient";
import type { Member, Project, Task } from "@/types/atlas.types";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockAddMember = addMember as jest.MockedFunction<typeof addMember>;
const mockRemoveMember = removeMember as jest.MockedFunction<typeof removeMember>;
const mockDeleteProject = deleteProject as jest.MockedFunction<typeof deleteProject>;

const OWNER_ID = "owner-1";

const project: Project = {
  id: "project-1",
  ownerId: OWNER_ID,
  name: "Atlas",
  description: "A PM tool",
  status: "active",
  dueDate: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const ownerMember: Member = {
  id: OWNER_ID,
  name: "Owner Person",
  avatarUrl: null,
  role: "owner",
};
const collaboratorMember: Member = {
  id: "collab-1",
  name: "Collab Person",
  avatarUrl: null,
  role: "collaborator",
};

const task: Task = {
  id: "task-1",
  assigneeId: null,
  projectId: "project-1",
  title: "Existing task",
  description: "",
  status: "todo",
  dueDate: null,
  createdAt: new Date(),
};

function setUp({
  currentUserId = OWNER_ID,
  tasks = [] as Task[],
}: { currentUserId?: string | null; tasks?: Task[] } = {}) {
  mockUseCurrentUser.mockReturnValue({
    data: currentUserId ? { id: currentUserId } : null,
  } as unknown as ReturnType<typeof useCurrentUser>);
  mockUseTasks.mockReturnValue({
    data: tasks,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useTasks>);
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("ProjectSlideOver open state", () => {
  it("should render no dialog when project is null", () => {
    setUp();
    renderWithClient(
      <ProjectSlideOver project={null} onClose={jest.fn()} members={[]} />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ProjectSlideOver owner gating", () => {
  it("should show Edit/Delete controls for the owner", () => {
    setUp({ currentUserId: OWNER_ID });
    renderWithClient(
      <ProjectSlideOver
        project={project}
        onClose={jest.fn()}
        onEditProject={jest.fn()}
        members={[ownerMember]}
      />,
    );

    expect(screen.getByLabelText("Edit project")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete project", { selector: "button" })).toBeInTheDocument();
  });

  it("should hide Edit/Delete controls for a non-owner", () => {
    setUp({ currentUserId: "someone-else" });
    renderWithClient(
      <ProjectSlideOver
        project={project}
        onClose={jest.fn()}
        onEditProject={jest.fn()}
        members={[ownerMember]}
      />,
    );

    expect(screen.queryByLabelText("Edit project")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Delete project", { selector: "button" }),
    ).not.toBeInTheDocument();
  });
});

describe("ProjectSlideOver delete flow", () => {
  it("should call deleteProject with the project id on confirm", async () => {
    setUp({ currentUserId: OWNER_ID });
    mockDeleteProject.mockResolvedValue({ error: null, errorKind: null });
    renderWithClient(
      <ProjectSlideOver project={project} onClose={jest.fn()} members={[ownerMember]} />,
    );

    fireEvent.click(screen.getByLabelText("Delete project", { selector: "button" }));
    const deleteDialog = screen.getByRole("dialog", { name: "Delete project" });
    await act(async () => {
      fireEvent.click(within(deleteDialog).getByRole("button", { name: "Delete project" }));
    });

    expect(mockDeleteProject).toHaveBeenCalledWith("project-1", expect.anything());
  });
});

describe("ProjectSlideOver add-member form", () => {
  it("should require an email before calling addMember", async () => {
    setUp({ currentUserId: OWNER_ID });
    renderWithClient(
      <ProjectSlideOver project={project} onClose={jest.fn()} members={[ownerMember]} />,
    );

    const input = screen.getByPlaceholderText("Add member by email");
    fireEvent.change(input, { target: { value: "not-an-email" } });
    // A real click respects the input's own native constraint validation
    // (jsdom enforces it); submit bypasses that gate to reach isValidEmail.
    await act(async () => {
      fireEvent.submit(input.closest("form")!);
    });

    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(mockAddMember).not.toHaveBeenCalled();
  });

  it("should call addMember with a valid email", async () => {
    setUp({ currentUserId: OWNER_ID });
    mockAddMember.mockResolvedValue({ error: null, errorKind: null });
    renderWithClient(
      <ProjectSlideOver project={project} onClose={jest.fn()} members={[ownerMember]} />,
    );

    fireEvent.change(screen.getByPlaceholderText("Add member by email"), {
      target: { value: "new@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
    });

    expect(mockAddMember).toHaveBeenCalledWith(
      "project-1",
      "new@example.com",
      expect.anything(),
    );
  });
});

describe("ProjectSlideOver remove-member two-step confirm", () => {
  it("should never show a remove control for the owner row", () => {
    setUp({ currentUserId: OWNER_ID });
    renderWithClient(
      <ProjectSlideOver
        project={project}
        onClose={jest.fn()}
        members={[ownerMember, collaboratorMember]}
      />,
    );

    expect(screen.queryByLabelText("Remove Owner Person")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Remove Collab Person")).toBeInTheDocument();
  });

  it("should revert without calling removeMember on Cancel", () => {
    setUp({ currentUserId: OWNER_ID });
    renderWithClient(
      <ProjectSlideOver
        project={project}
        onClose={jest.fn()}
        members={[ownerMember, collaboratorMember]}
      />,
    );

    fireEvent.click(screen.getByLabelText("Remove Collab Person"));
    fireEvent.click(screen.getByLabelText("Cancel remove"));

    expect(screen.getByLabelText("Remove Collab Person")).toBeInTheDocument();
    expect(mockRemoveMember).not.toHaveBeenCalled();
  });

  it("should call removeMember on confirm and show the returned error on failure", async () => {
    setUp({ currentUserId: OWNER_ID });
    mockRemoveMember.mockResolvedValue({
      error: "You don't have permission to perform that action.",
      errorKind: "forbidden",
    });
    renderWithClient(
      <ProjectSlideOver
        project={project}
        onClose={jest.fn()}
        members={[ownerMember, collaboratorMember]}
      />,
    );

    fireEvent.click(screen.getByLabelText("Remove Collab Person"));
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Confirm remove Collab Person"));
    });

    expect(mockRemoveMember).toHaveBeenCalledWith(
      "project-1",
      "collab-1",
      expect.anything(),
    );
    expect(
      screen.getByText("You don't have permission to perform that action."),
    ).toBeInTheDocument();
  });
});

describe("ProjectSlideOver task modal", () => {
  it("should open in create mode from Add task", () => {
    setUp({ currentUserId: OWNER_ID, tasks: [] });
    renderWithClient(
      <ProjectSlideOver project={project} onClose={jest.fn()} members={[ownerMember]} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add task" }));

    expect(screen.getByRole("dialog", { name: "New task" })).toBeInTheDocument();
  });

  it("should open in edit mode, prefilled, from a task row", () => {
    setUp({ currentUserId: OWNER_ID, tasks: [task] });
    renderWithClient(
      <ProjectSlideOver project={project} onClose={jest.fn()} members={[ownerMember]} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Existing task" }));

    expect(screen.getByRole("dialog", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing task")).toBeInTheDocument();
  });
});

describe("ProjectSlideOver project-switch reset", () => {
  it("should clear an in-progress remove-member confirm when the project prop changes", () => {
    setUp({ currentUserId: OWNER_ID });
    const { rerender } = renderWithClient(
      <ProjectSlideOver
        project={project}
        onClose={jest.fn()}
        members={[ownerMember, collaboratorMember]}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove Collab Person"));
    expect(screen.getByLabelText("Cancel remove")).toBeInTheDocument();

    const otherProject: Project = { ...project, id: "project-2", name: "Zephyr" };
    rerender(
      <ProjectSlideOver
        project={otherProject}
        onClose={jest.fn()}
        members={[ownerMember, collaboratorMember]}
      />,
    );

    expect(screen.queryByLabelText("Cancel remove")).not.toBeInTheDocument();
  });
});
