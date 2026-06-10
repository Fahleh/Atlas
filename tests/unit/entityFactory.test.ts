import { createProject, createTask } from "@/lib/entityFactory";
import { Project, Task } from "@/types/atlas.types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("createProject", () => {
  const input = { name: "Atlas", description: "A PM tool", dueDate: null };
  let result: Project;

  beforeEach(() => {
    result = createProject(input);
  });

  it("should correctly map all input values", () => {
    expect(result.name).toBe(input.name);
    expect(result.description).toBe(input.description);
    expect(result.dueDate).toBe(input.dueDate);
  });

  it("should correctly map a dueDate when provided", () => {
    const date = new Date("2026-12-31");
    const result = createProject({ ...input, dueDate: date });

    expect(result.dueDate).toBe(date);
  });

  it("should return a Project with a valid UUID id", () => {
    expect(result.id).toMatch(UUID_REGEX);
  });

  it("should generate a unique id on every call", () => {
    const result2 = createProject(input);

    expect(result.id).not.toBe(result2.id);
  });

  it("should return a Project with active status as default", () => {
    expect(result.status).toBe("active");
  });

  it("should return a Project with a valid createdAt timestamp", () => {
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});

describe("createTask", () => {
  const input = {
    projectId: crypto.randomUUID(),
    title: "Create navigation bar",
    description: "Create web and mobile navbars",
    dueDate: null,
  };
  let result: Task;

  beforeEach(() => {
    result = createTask(input);
  });

  it("should correctly map all input values", () => {
    expect(result.title).toBe(input.title);
    expect(result.description).toBe(input.description);
    expect(result.dueDate).toBe(input.dueDate);
  });

  it("should default assigneeId to null when not provided", () => {
    expect(result.assigneeId).toBeNull();
  });

  it("should correctly map assigneeId when provided", () => {
    const assigneeId = crypto.randomUUID();
    const updatedResult = createTask({ ...input, assigneeId });

    expect(updatedResult.assigneeId).toBe(assigneeId);
  });

  it("should correctly map a dueDate when provided", () => {
    const date = new Date("2026-12-31");
    const result = createTask({ ...input, dueDate: date });

    expect(result.dueDate).toBe(date);
  });

  it("should have a projectId that is a valid UUID id", () => {
    expect(result.projectId).toMatch(UUID_REGEX);
  });

  it("should return a Task with a valid UUID id", () => {
    expect(result.id).toMatch(UUID_REGEX);
  });

  it("should generate a unique id on every call", () => {
    const result2 = createTask(input);

    expect(result.id).not.toBe(result2.id);
  });

  it("should return a Task with todo status as default", () => {
    expect(result.status).toBe("todo");
  });

  it("should return a Task with a valid createdAt timestamp", () => {
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});
