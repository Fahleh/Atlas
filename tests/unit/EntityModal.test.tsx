/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EntityModal } from "@/components/EntityModal";

type FormState = { error: string | null };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function renderModal({
  open = true,
  onOpenChange = jest.fn(),
  action = jest.fn(async (): Promise<FormState> => ({ error: null })),
  disableScrollLock = false,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  action?: (prev: FormState, formData: FormData) => Promise<FormState>;
  disableScrollLock?: boolean;
} = {}) {
  return render(
    <EntityModal
      open={open}
      onOpenChange={onOpenChange}
      action={action}
      initialState={{ error: null }}
      disableScrollLock={disableScrollLock}
    >
      <EntityModal.Header>
        <EntityModal.Title>Test modal</EntityModal.Title>
        <EntityModal.CloseButton />
      </EntityModal.Header>
      <EntityModal.Body>
        <EntityModal.Field label="Name" htmlFor="name">
          <input id="name" />
        </EntityModal.Field>
      </EntityModal.Body>
      <EntityModal.Footer>
        <EntityModal.FooterActions>
          <EntityModal.CancelButton>Cancel</EntityModal.CancelButton>
          <EntityModal.SubmitButton pendingLabel="Saving…">
            Save
          </EntityModal.SubmitButton>
        </EntityModal.FooterActions>
      </EntityModal.Footer>
    </EntityModal>,
  );
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("EntityModal", () => {
  it("should render dialog semantics only when open", () => {
    const { rerender } = renderModal({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <EntityModal
        open
        onOpenChange={jest.fn()}
        action={jest.fn(async (): Promise<FormState> => ({ error: null }))}
        initialState={{ error: null }}
      >
        <EntityModal.Header>
          <EntityModal.Title>Test modal</EntityModal.Title>
        </EntityModal.Header>
        <EntityModal.Body>{null}</EntityModal.Body>
        <EntityModal.Footer>{null}</EntityModal.Footer>
      </EntityModal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should move focus to the first focusable element when it opens", () => {
    renderModal();

    expect(screen.getByLabelText("Close")).toHaveFocus();
  });

  it("should trap Tab/Shift+Tab within the dialog", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    const closeButton = screen.getByLabelText("Close");
    const saveButton = screen.getByRole("button", { name: "Save" });

    saveButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    closeButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(saveButton).toHaveFocus();
  });

  it("should close on Escape", () => {
    const onOpenChange = jest.fn();
    renderModal({ onOpenChange });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should close on backdrop click and on backdrop Enter/Space", () => {
    const onOpenChange = jest.fn();
    renderModal({ onOpenChange });

    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    fireEvent.keyDown(screen.getByLabelText("Close modal"), { key: "Enter" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should close via CloseButton and CancelButton", () => {
    const onOpenChange = jest.fn();
    renderModal({ onOpenChange });

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should lock body scroll while open and restore it on close, unless disableScrollLock", () => {
    const { rerender } = renderModal({ open: true });
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <EntityModal
        open={false}
        onOpenChange={jest.fn()}
        action={jest.fn(async (): Promise<FormState> => ({ error: null }))}
        initialState={{ error: null }}
      >
        <EntityModal.Body>{null}</EntityModal.Body>
      </EntityModal>,
    );
    expect(document.body.style.overflow).toBe("");

    renderModal({ open: true, disableScrollLock: true });
    expect(document.body.style.overflow).toBe("");
  });

  it("should show pendingLabel while the primary action is in flight, then revert", async () => {
    const d = deferred<FormState>();
    const action = jest.fn(() => d.promise);
    renderModal({ action });

    await act(async () => {
      screen.getByRole("button", { name: "Save" }).click();
    });
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();

    await act(async () => {
      d.resolve({ error: null });
    });
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("should render the error banner when the action returns an error", async () => {
    const action = jest.fn(async (): Promise<FormState> => ({ error: "Something failed." }));
    renderModal({ action });

    await act(async () => {
      screen.getByRole("button", { name: "Save" }).click();
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Something failed.");
  });
});
