import { Project, Task } from "@/types/atlas.types";
import {
  updateProject,
  updateProjectStatus,
  updateTask,
  updateTaskStatus,
} from "@/lib/updateImmutable";

const project: Project = {
  id: crypto.randomUUID(),
  ownerId: "user-123",
  name: "Atlas",
  description: "A PM tool",
  dueDate: null,
  status: "active",
  createdAt: new Date(),
};
const projectChange = { description: "An updated PM tool" };

let returnedProject: Project;

describe("updateProject", () => {
  beforeEach(() => {
    returnedProject = updateProject(project, projectChange);
  });

  it("should return a new Project object reference", () => {
    expect(returnedProject).not.toBe(project);
  });

  it("should not mutate the original project", () => {
    const original = { ...project };
    updateProject(project, projectChange);

    expect(project).toEqual(original);
  });

  it("should map all project changes to their respective inputs", () => {
    const changes = {
      name: "Atlas Pro",
      description: "An updated PM tool",
      dueDate: new Date("2026-12-31"),
    };
    const updatedProject = updateProject(project, changes);

    expect(updatedProject.name).toBe(changes.name);
    expect(updatedProject.description).toBe(changes.description);
    expect(updatedProject.dueDate).toBe(changes.dueDate);
  });
});

describe("updateProjectStatus", () => {
  const newStatus = "completed";

  beforeEach(() => {
    returnedProject = updateProjectStatus(project, newStatus);
  });

  it("should return the project with a new status value", () => {
    expect(returnedProject.status).not.toBe(project.status);
    expect(returnedProject.status).toBe("completed");
  });
});

/** TASK TESTS **/
const task: Task = {
  projectId: crypto.randomUUID(),
  id: crypto.randomUUID(),
  assigneeId: null,
  title: "Create navigation bar",
  description: "Build navigation menu bar",
  dueDate: null,
  status: "todo",
  createdAt: new Date(),
};
const taskChange = { title: "Create web and mobile nav menus" };

let returnedTask: Task;

describe("updateTask", () => {
  beforeEach(() => {
    returnedTask = updateTask(task, taskChange);
  });

  it("should return a new Task object reference", () => {
    expect(returnedTask).not.toBe(task);
  });

  it("should not mutate the original task", () => {
    const original = { ...task };
    updateTask(task, taskChange);

    expect(task).toEqual(original);
  });

  it("should return a new task title", () => {
    expect(returnedTask.title).not.toBe(task.title);
  });

  it("should map all task changes to their respective inputs", () => {
    const changes = {
      title: "Create web and mobile nav menus",
      description: "Build nav menus for all devices",
      dueDate: new Date("2026-12-31"),
    };
    const updatedTask = updateTask(task, changes);

    expect(updatedTask.title).toBe(changes.title);
    expect(updatedTask.description).toBe(changes.description);
    expect(updatedTask.dueDate).toBe(changes.dueDate);
  });
});

describe("updateTaskStatus", () => {
  const newStatus = "in_progress";

  beforeEach(() => {
    returnedTask = updateTaskStatus(task, newStatus);
  });

  it("should return the Task with a new status value", () => {
    expect(returnedTask.status).not.toBe(task.status);
    expect(returnedTask.status).toBe("in_progress");
  });
});
