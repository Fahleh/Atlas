/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TaskModal, type TaskFormState, type DeleteTaskState } from "@/features/tasks/TaskModal";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function renderTaskModal({
  saveAction = jest.fn(async (): Promise<TaskFormState> => ({ error: null, errorKind: null })),
  deleteAction = jest.fn(
    async (): Promise<DeleteTaskState> => ({ error: null, errorKind: null }),
  ),
}: {
  saveAction?: (prev: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  deleteAction?: (formData: FormData) => Promise<DeleteTaskState>;
} = {}) {
  return render(
    <TaskModal open onOpenChange={jest.fn()} action={saveAction}>
      <TaskModal.Header>
        <TaskModal.Title>Edit task</TaskModal.Title>
      </TaskModal.Header>
      <TaskModal.Body>
        <TaskModal.Field label="Title" htmlFor="title">
          <input id="title" name="title" defaultValue="Existing task" />
        </TaskModal.Field>
      </TaskModal.Body>
      <TaskModal.Footer>
        <TaskModal.DeleteButton action={deleteAction} />
        <TaskModal.FooterActions>
          <TaskModal.CancelButton>Cancel</TaskModal.CancelButton>
          <TaskModal.SubmitButton pendingLabel="Saving…">
            Save changes
          </TaskModal.SubmitButton>
        </TaskModal.FooterActions>
      </TaskModal.Footer>
    </TaskModal>,
  );
}

describe("TaskModal DeleteButton", () => {
  it("should show a confirm button on first click, not delete immediately", () => {
    const deleteAction = jest.fn();
    renderTaskModal({ deleteAction });

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));

    expect(screen.getByRole("button", { name: "Confirm delete?" })).toBeInTheDocument();
    expect(deleteAction).not.toHaveBeenCalled();
  });

  it("should call the delete action only on the second (confirm) click", async () => {
    const deleteAction = jest.fn(
      async (): Promise<DeleteTaskState> => ({ error: null, errorKind: null }),
    );
    renderTaskModal({ deleteAction });

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm delete?" }));
    });

    expect(deleteAction).toHaveBeenCalledTimes(1);
  });

  it("should show the returned error below the button and stay in confirming state on failure", async () => {
    const deleteAction = jest.fn(
      async (): Promise<DeleteTaskState> => ({
        error: "You don't have permission to perform that action.",
        errorKind: "forbidden",
      }),
    );
    renderTaskModal({ deleteAction });

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm delete?" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "You don't have permission to perform that action.",
    );
    expect(screen.getByRole("button", { name: "Confirm delete?" })).toBeInTheDocument();
  });

  it("should show its own pending label while deleting, and leave Save's label alone (action-identity)", async () => {
    const d = deferred<DeleteTaskState>();
    const deleteAction = jest.fn(() => d.promise);
    renderTaskModal({ deleteAction });

    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm delete?" }));
    });

    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    // Save's own label must not flip to "Saving…" just because a different
    // (delete) action is pending — only disabled, per action-identity.
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    await act(async () => {
      d.resolve({ error: null, errorKind: null });
    });
  });
});
