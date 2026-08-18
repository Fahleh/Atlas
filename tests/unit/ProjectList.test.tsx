/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import * as nextNavigationHooksMock from "@/tests/mocks/nextNavigationHooksMock";

jest.mock("next/navigation", () => nextNavigationHooksMock);
jest.mock("@/hooks/useProjects", () => ({ useProjects: jest.fn() }));
jest.mock("@/hooks/useMembersByProject", () => ({
  useMembersByProject: jest.fn(),
}));
jest.mock("@/hooks/useTaskCountsByProject", () => ({
  useTaskCountsByProject: jest.fn(),
}));
jest.mock("@/features/projects/projectActions", () => ({
  createProjectAction: jest.fn(() => jest.fn()),
}));

import { fireEvent, screen } from "@testing-library/react";
import { ProjectList } from "@/features/projects/ProjectList";
import { useProjects } from "@/hooks/useProjects";
import { useMembersByProject } from "@/hooks/useMembersByProject";
import { useTaskCountsByProject } from "@/hooks/useTaskCountsByProject";
import { renderWithClient } from "@/tests/mocks/queryClient";
import { SupabaseReadError } from "@/lib/supabase/errors";
import type { Project } from "@/types/atlas.types";

const mockUseProjects = useProjects as jest.MockedFunction<typeof useProjects>;
const mockUseMembersByProject = useMembersByProject as jest.MockedFunction<
  typeof useMembersByProject
>;
const mockUseTaskCountsByProject = useTaskCountsByProject as jest.MockedFunction<
  typeof useTaskCountsByProject
>;

function buildProject(overrides: Partial<Project>): Project {
  return {
    id: crypto.randomUUID(),
    ownerId: "user-1",
    name: "Atlas",
    description: "A PM tool",
    status: "active",
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function setUp({
  projects = [] as Project[],
  isLoading = false,
  isError = false,
  error = null as SupabaseReadError | null,
  refetch = jest.fn(),
  isMembersError = false,
  membersError = null as SupabaseReadError | null,
  refetchMembers = jest.fn(),
  isTaskCountsError = false,
  taskCountsError = null as SupabaseReadError | null,
  refetchTaskCounts = jest.fn(),
} = {}) {
  mockUseProjects.mockReturnValue({
    data: projects,
    isLoading,
    isError,
    error,
    refetch,
  } as unknown as ReturnType<typeof useProjects>);
  mockUseMembersByProject.mockReturnValue({
    data: {},
    isError: isMembersError,
    error: membersError,
    refetch: refetchMembers,
  } as unknown as ReturnType<typeof useMembersByProject>);
  mockUseTaskCountsByProject.mockReturnValue({
    data: {},
    isError: isTaskCountsError,
    error: taskCountsError,
    refetch: refetchTaskCounts,
  } as unknown as ReturnType<typeof useTaskCountsByProject>);
  return { refetch, refetchMembers, refetchTaskCounts };
}

afterEach(() => {
  jest.clearAllMocks();
  nextNavigationHooksMock.mockUseSearchParams.mockReturnValue(new URLSearchParams());
});

describe("ProjectList loading/error/empty states", () => {
  it("should render a loading skeleton", () => {
    setUp({ isLoading: true });
    renderWithClient(<ProjectList />);

    expect(screen.getByRole("status", { name: "Loading projects" })).toBeInTheDocument();
  });

  it("should render a login link for a sessionExpired error", () => {
    setUp({
      isError: true,
      error: new SupabaseReadError({
        error: "Your session has expired. Log in again to continue.",
        errorKind: "sessionExpired",
      }),
    });
    renderWithClient(<ProjectList />);

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("should render a retry button for a non-session error and call refetch", () => {
    const { refetch } = setUp({
      isError: true,
      error: new SupabaseReadError({ error: "Couldn't connect.", errorKind: null }),
    });
    renderWithClient(<ProjectList />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("should show the no-projects empty state when there are none at all", () => {
    setUp({ projects: [] });
    renderWithClient(<ProjectList />);

    expect(screen.getByText("No projects yet.")).toBeInTheDocument();
  });

  it("should show the no-results empty state when search/filter matches nothing", () => {
    setUp({ projects: [buildProject({ name: "Atlas" })] });
    renderWithClient(<ProjectList />);

    fireEvent.change(screen.getByPlaceholderText(/Search projects/), {
      target: { value: "nonexistent" },
    });

    expect(screen.getByText("No projects match your search.")).toBeInTheDocument();
  });
});

describe("ProjectList partial failure", () => {
  it("should show a partial-failure banner when member/task-count data fails independently of projects", () => {
    const { refetchMembers } = setUp({
      projects: [buildProject({})],
      isMembersError: true,
      membersError: new SupabaseReadError({ error: "Couldn't connect.", errorKind: null }),
    });
    renderWithClient(<ProjectList />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetchMembers).toHaveBeenCalledTimes(1);
  });
});

describe("ProjectList search, filter, and view toggle", () => {
  it("should filter the grid by name/description search", () => {
    setUp({
      projects: [
        buildProject({ name: "Atlas", description: "PM tool" }),
        buildProject({ name: "Zephyr", description: "Weather app" }),
      ],
    });
    renderWithClient(<ProjectList />);

    fireEvent.change(screen.getByPlaceholderText(/Search projects/), {
      target: { value: "atlas" },
    });

    expect(screen.getByText("Atlas")).toBeInTheDocument();
    expect(screen.queryByText("Zephyr")).not.toBeInTheDocument();
  });

  it("should filter by status tab", () => {
    setUp({
      projects: [
        buildProject({ name: "Atlas", status: "active" }),
        buildProject({ name: "Zephyr", status: "archived" }),
      ],
    });
    renderWithClient(<ProjectList />);

    fireEvent.click(screen.getByRole("tab", { name: "Archived" }));

    expect(screen.getByText("Zephyr")).toBeInTheDocument();
    expect(screen.queryByText("Atlas")).not.toBeInTheDocument();
  });

  it("should switch to the table view on the list-view toggle", () => {
    setUp({ projects: [buildProject({ name: "Atlas" })] });
    renderWithClient(<ProjectList />);

    fireEvent.click(screen.getByRole("button", { name: "List view" }));

    expect(screen.getByRole("columnheader", { name: "PROJECT" })).toBeInTheDocument();
  });
});

describe("ProjectList modal and slide-over", () => {
  it("should open the create-project modal on New project click", () => {
    setUp({ projects: [] });
    renderWithClient(<ProjectList />);

    fireEvent.click(screen.getByRole("button", { name: "New project" }));

    expect(screen.getByRole("dialog", { name: "New project" })).toBeInTheDocument();
  });

  it("should open the slide-over for the project id in the URL", () => {
    const project = buildProject({ name: "Atlas" });
    setUp({ projects: [project] });
    nextNavigationHooksMock.mockUseSearchParams.mockReturnValue(
      new URLSearchParams(`project=${project.id}`),
    );

    renderWithClient(<ProjectList />);

    expect(screen.getByRole("dialog", { name: "Atlas details" })).toBeInTheDocument();
  });
});
