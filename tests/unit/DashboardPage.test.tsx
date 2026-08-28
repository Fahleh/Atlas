/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";

jest.mock("@/hooks/useProjects", () => ({ useProjects: jest.fn() }));
jest.mock("@/hooks/useTaskCountsByProject", () => ({
  useTaskCountsByProject: jest.fn(),
}));
jest.mock("@/hooks/useMembersByProject", () => ({
  useMembersByProject: jest.fn(),
}));
jest.mock("@/hooks/useTasks", () => ({ useTasks: jest.fn() }));
jest.mock("@/hooks/useDueSoonTaskCount", () => ({
  useDueSoonTaskCount: jest.fn(),
}));
jest.mock("@/hooks/useActivityLog", () => ({ useActivityLog: jest.fn() }));

import { render } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/page";
import { useProjects } from "@/hooks/useProjects";
import { useTaskCountsByProject } from "@/hooks/useTaskCountsByProject";
import { useMembersByProject } from "@/hooks/useMembersByProject";
import { useTasks } from "@/hooks/useTasks";
import { useDueSoonTaskCount } from "@/hooks/useDueSoonTaskCount";
import { useActivityLog } from "@/hooks/useActivityLog";
import type { Project } from "@/types/atlas.types";
import type { TaskCounts } from "@/hooks/useTaskCountsByProject";

const mockUseProjects = useProjects as jest.MockedFunction<typeof useProjects>;
const mockUseTaskCountsByProject = useTaskCountsByProject as jest.MockedFunction<
  typeof useTaskCountsByProject
>;
const mockUseMembersByProject = useMembersByProject as jest.MockedFunction<
  typeof useMembersByProject
>;
const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;
const mockUseDueSoonTaskCount = useDueSoonTaskCount as jest.MockedFunction<
  typeof useDueSoonTaskCount
>;
const mockUseActivityLog = useActivityLog as jest.MockedFunction<
  typeof useActivityLog
>;

function buildProject(id: string, overrides: Partial<Project>): Project {
  return {
    id,
    ownerId: "user-1",
    name: id,
    description: "",
    status: "active",
    dueDate: null,
    createdAt: new Date(),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function setUp(projects: Project[], taskCounts: Record<string, TaskCounts>) {
  mockUseProjects.mockReturnValue({
    data: projects,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useProjects>);
  mockUseTaskCountsByProject.mockReturnValue({
    data: taskCounts,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useTaskCountsByProject>);
  mockUseMembersByProject.mockReturnValue({
    data: {},
    isError: false,
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useMembersByProject>);
  mockUseTasks.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useTasks>);
  mockUseDueSoonTaskCount.mockReturnValue({
    data: 0,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useDueSoonTaskCount>);
  mockUseActivityLog.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useActivityLog>);
}

function lastRequestedProjectId(): string {
  const calls = mockUseTasks.mock.calls;
  return calls[calls.length - 1][0];
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("Dashboard Upcoming Tasks project-selection algorithm", () => {
  it("should pick the soonest due date among projects that actually have tasks, skipping an earlier-dated project with none", () => {
    const projects = [
      buildProject("p1", { dueDate: new Date("2026-01-10T00:00:00.000Z") }), // earliest date, but no tasks
      buildProject("p2", { dueDate: new Date("2026-01-20T00:00:00.000Z") }), // has tasks, should win
      buildProject("p3", { dueDate: null, updatedAt: new Date("2026-01-01T00:00:00.000Z") }),
    ];
    const taskCounts: Record<string, TaskCounts> = {
      p1: { total: 0, done: 0 },
      p2: { total: 3, done: 1 },
      p3: { total: 5, done: 2 },
    };
    setUp(projects, taskCounts);

    render(<DashboardPage />);

    expect(lastRequestedProjectId()).toBe("p2");
  });

  it("should fall back to the most-recently-updated null-due-date project when no dated project has tasks", () => {
    const projects = [
      buildProject("p1", { dueDate: new Date("2026-01-10T00:00:00.000Z") }), // dated, but no tasks
      buildProject("p2", { dueDate: null, updatedAt: new Date("2026-01-01T00:00:00.000Z") }),
      buildProject("p3", { dueDate: null, updatedAt: new Date("2026-01-15T00:00:00.000Z") }), // most recent, should win
    ];
    const taskCounts: Record<string, TaskCounts> = {
      p1: { total: 0, done: 0 },
      p2: { total: 4, done: 0 },
      p3: { total: 2, done: 0 },
    };
    setUp(projects, taskCounts);

    render(<DashboardPage />);

    expect(lastRequestedProjectId()).toBe("p3");
  });

  it("should request no project (empty id) when nothing has any tasks", () => {
    const projects = [
      buildProject("p1", { dueDate: new Date("2026-01-10T00:00:00.000Z") }),
      buildProject("p2", { dueDate: null }),
    ];
    const taskCounts: Record<string, TaskCounts> = {
      p1: { total: 0, done: 0 },
      p2: { total: 0, done: 0 },
    };
    setUp(projects, taskCounts);

    render(<DashboardPage />);

    expect(lastRequestedProjectId()).toBe("");
  });
});
