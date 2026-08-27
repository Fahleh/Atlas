/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { TaskList } from "@/features/tasks/TaskList";
import { useTasks } from "@/hooks/useTasks";
import { SupabaseReadError } from "@/lib/supabase/errors";
import type { Task } from "@/types/atlas.types";

jest.mock("@/hooks/useTasks", () => ({ useTasks: jest.fn() }));

const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

const FAKE_TASK: Task = {
  id: crypto.randomUUID(),
  assigneeId: null,
  projectId: "project-1",
  title: "Write the report",
  description: "",
  status: "todo",
  dueDate: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

afterEach(() => {
  jest.clearAllMocks();
});

describe("TaskList", () => {
  it("should render a loading skeleton while tasks are loading", () => {
    mockUseTasks.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<TaskList projectId="project-1" onTaskSelect={jest.fn()} />);

    expect(screen.getByRole("status", { name: "Loading tasks" })).toBeInTheDocument();
  });

  it("should render a login link for a sessionExpired error", () => {
    mockUseTasks.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new SupabaseReadError({
        error: "Your session has expired. Log in again to continue.",
        errorKind: "sessionExpired",
      }),
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<TaskList projectId="project-1" onTaskSelect={jest.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session has expired. Log in again to continue.",
    );
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("should render a retry button for a non-session error", () => {
    const refetch = jest.fn();
    mockUseTasks.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new SupabaseReadError({
        error: "Couldn't connect. Check your connection and try again.",
        errorKind: null,
      }),
      refetch,
    } as unknown as ReturnType<typeof useTasks>);

    render(<TaskList projectId="project-1" onTaskSelect={jest.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't connect. Check your connection and try again.",
    );
    screen.getByRole("button", { name: "Try again" }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("should render an empty state when there are no tasks", () => {
    mockUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<TaskList projectId="project-1" onTaskSelect={jest.fn()} />);

    expect(screen.getByText("No tasks yet.")).toBeInTheDocument();
  });

  it("should render the task list and call onTaskSelect when a row is activated", () => {
    const onTaskSelect = jest.fn();
    mockUseTasks.mockReturnValue({
      data: [FAKE_TASK],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useTasks>);

    render(<TaskList projectId="project-1" onTaskSelect={onTaskSelect} />);

    const row = screen.getByRole("button", { name: `Open ${FAKE_TASK.title}` });
    row.click();

    expect(onTaskSelect).toHaveBeenCalledWith(FAKE_TASK);
  });
});
