import { test, expect } from "@playwright/test";
import { PRIMARY_ACCOUNT } from "./accounts";
import { loginAs } from "./helpers";

// Read from global-setup.ts's real `supabase status -o env` output,
// not hardcoded, since these change per machine and stack restart.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set by global-setup.ts before this spec runs.",
  );
}

test("dragging a task to a new position persists across a reload", async ({ page }) => {
  await loginAs(page, PRIMARY_ACCOUNT);
  await page.goto("/projects");

  const projectName = `E2E Reorder Project ${Date.now()}`;
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page
    .getByRole("dialog", { name: "New project" })
    .getByRole("button", { name: "Create project" })
    .click();
  await expect(page.getByText(projectName)).toBeVisible();

  await page.getByText(projectName).click();
  const slideOver = page.getByRole("dialog", { name: `${projectName} details` });
  await expect(slideOver).toBeVisible();

  for (const title of ["First task", "Second task"]) {
    await page.getByRole("button", { name: "Add task" }).click();
    await page.locator("#task-title").fill(title);
    await page
      .getByRole("dialog", { name: "New task" })
      .getByRole("button", { name: "Create task" })
      .click();
    await expect(page.getByRole("dialog", { name: "New task" })).not.toBeVisible();
  }

  const taskList = slideOver.getByRole("list", { name: "Project tasks" });
  await expect(taskList.getByText("First task")).toBeVisible();
  await expect(taskList.getByText("Second task")).toBeVisible();

  async function readOrder(): Promise<string[]> {
    const rowTexts = await taskList.getByRole("listitem").allTextContents();
    return rowTexts.map((text) =>
      text.includes("First task") ? "First task" : "Second task",
    );
  }

  // Confirms the tasks actually start in creation order before the drag,
  // otherwise the reorder assertion below wouldn't prove anything moved.
  expect(await readOrder()).toEqual(["First task", "Second task"]);

  const firstHandle = slideOver.getByRole("button", { name: "Reorder First task" });
  const secondHandle = slideOver.getByRole("button", { name: "Reorder Second task" });
  const firstBox = await firstHandle.boundingBox();
  const secondBox = await secondHandle.boundingBox();
  if (!firstBox || !secondBox) throw new Error("Drag handle bounding boxes not found.");

  await page.mouse.move(
    firstBox.x + firstBox.width / 2,
    firstBox.y + firstBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    secondBox.x + secondBox.width / 2,
    secondBox.y + secondBox.height + 10,
    { steps: 10 },
  );
  await page.mouse.up();

  await expect(async () => {
    expect(await readOrder()).toEqual(["Second task", "First task"]);
  }).toPass();

  // The real proof: a hard reload re-fetches from the database, so the new
  // order surviving this is the database write, not just optimistic UI state.
  await page.reload();
  await expect(slideOver).toBeVisible();
  expect(await readOrder()).toEqual(["Second task", "First task"]);
});

test("dragging into a collapsed gap renormalizes every task atomically", async ({
  page,
  request,
}) => {
  await loginAs(page, PRIMARY_ACCOUNT);
  await page.goto("/projects");

  const projectName = `E2E Renormalize Project ${Date.now()}`;
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Name").fill(projectName);
  await page
    .getByRole("dialog", { name: "New project" })
    .getByRole("button", { name: "Create project" })
    .click();
  await expect(page.getByText(projectName)).toBeVisible();

  await page.getByText(projectName).click();
  const slideOver = page.getByRole("dialog", { name: `${projectName} details` });
  await expect(slideOver).toBeVisible();

  for (const title of ["Task One", "Task Two", "Task Three"]) {
    await page.getByRole("button", { name: "Add task" }).click();
    await page.locator("#task-title").fill(title);
    await page
      .getByRole("dialog", { name: "New task" })
      .getByRole("button", { name: "Create task" })
      .click();
    await expect(page.getByRole("dialog", { name: "New task" })).not.toBeVisible();
  }

  const taskList = slideOver.getByRole("list", { name: "Project tasks" });
  await expect(taskList.getByText("Task Three")).toBeVisible();

  const primaryTokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      data: { email: PRIMARY_ACCOUNT.email, password: PRIMARY_ACCOUNT.password },
    },
  );
  const { access_token: primaryToken } = await primaryTokenResponse.json();
  const projectId = new URL(page.url()).searchParams.get("project");
  const tasksUrl = `${SUPABASE_URL}/rest/v1/tasks?project_id=eq.${projectId}&select=id,title,position&order=position.asc`;
  const authHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${primaryToken}` };

  const initialTasksResponse = await request.get(tasksUrl, { headers: authHeaders });
  const [taskOne, taskTwo] = await initialTasksResponse.json();

  // Tightens the gap below computeDropPosition's bisection threshold, so
  // dropping Task Three here can only be satisfied by a full renormalization.
  await request.patch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${taskTwo.id}`, {
    headers: { ...authHeaders, "Content-Type": "application/json" },
    data: { position: taskOne.position + 0.5 },
  });

  await page.reload();
  await expect(slideOver).toBeVisible();

  const thirdHandle = slideOver.getByRole("button", { name: "Reorder Task Three" });
  const secondHandle = slideOver.getByRole("button", { name: "Reorder Task Two" });
  const thirdBox = await thirdHandle.boundingBox();
  const secondBox = await secondHandle.boundingBox();
  if (!thirdBox || !secondBox) throw new Error("Drag handle bounding boxes not found.");

  // Drops on Task Two's center, pushing it down one slot and landing
  // Task Three between Task One and Task Two.
  await page.mouse.move(thirdBox.x + thirdBox.width / 2, thirdBox.y + thirdBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, {
    steps: 10,
  });
  await page.mouse.up();

  async function readOrder(): Promise<string[]> {
    const rowTexts = await taskList.getByRole("listitem").allTextContents();
    return rowTexts.map((text) => {
      if (text.includes("Task One")) return "Task One";
      if (text.includes("Task Two")) return "Task Two";
      return "Task Three";
    });
  }

  await expect(async () => {
    expect(await readOrder()).toEqual(["Task One", "Task Three", "Task Two"]);
  }).toPass();

  // Proves the RPC touched every row in one pass: positions come back
  // evenly spaced, not the tight 0.5 gap forced above.
  const finalTasksResponse = await request.get(tasksUrl, { headers: authHeaders });
  const finalTasks: { title: string; position: number }[] = await finalTasksResponse.json();
  expect(finalTasks.map((task) => task.title)).toEqual([
    "Task One",
    "Task Three",
    "Task Two",
  ]);
  expect(finalTasks.map((task) => task.position)).toEqual([1000, 2000, 3000]);
});
