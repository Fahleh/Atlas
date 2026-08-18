/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { StatusBox, type StatusBoxConfig } from "@/components/StatusBox";

type TestStatus = "a" | "b" | "c";

const config: StatusBoxConfig<TestStatus> = {
  a: { label: "Alpha", dotColorClass: "dotMuted" },
  b: { label: "Beta", dotColorClass: "dotAccent" },
  c: { label: "Gamma", dotColorClass: "dotSuccess" },
};
const order: TestStatus[] = ["a", "b", "c"];

function renderStatusBox(onChange = jest.fn()) {
  render(
    <StatusBox<TestStatus>
      defaultValue="a"
      name="status"
      config={config}
      order={order}
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe("StatusBox", () => {
  it("should render the default value's label and carry it in a hidden input", () => {
    renderStatusBox();

    expect(screen.getByRole("button")).toHaveTextContent("Alpha");
    expect(document.querySelector('input[name="status"]')).toHaveValue("a");
  });

  it("should open the listbox and move focus into it on trigger click", () => {
    renderStatusBox();

    fireEvent.click(screen.getByRole("button"));

    const listbox = screen.getByRole("listbox");
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    expect(listbox).toHaveFocus();
  });

  it("should select an option on click, call onChange, update the trigger and hidden input, and close", () => {
    const { onChange } = renderStatusBox();
    fireEvent.click(screen.getByRole("button"));

    fireEvent.click(screen.getByRole("option", { name: "Beta" }));

    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("button")).toHaveTextContent("Beta");
    expect(document.querySelector('input[name="status"]')).toHaveValue("b");
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  });

  it("should cycle focus with ArrowDown/ArrowUp, wrapping at both ends", () => {
    renderStatusBox();
    fireEvent.click(screen.getByRole("button"));
    const listbox = screen.getByRole("listbox");

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox).toHaveAttribute("aria-activedescendant", "status-option-b");

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox).toHaveAttribute("aria-activedescendant", "status-option-a");

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(listbox).toHaveAttribute("aria-activedescendant", "status-option-c");
  });

  it("should select the focused option on Enter", () => {
    const { onChange } = renderStatusBox();
    fireEvent.click(screen.getByRole("button"));
    const listbox = screen.getByRole("listbox");

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  });

  it("should close on Escape and discard an in-progress arrow-key focus, not commit it", () => {
    const { onChange } = renderStatusBox();
    fireEvent.click(screen.getByRole("button"));
    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox).toHaveAttribute("aria-activedescendant", "status-option-c");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button")).toHaveTextContent("Alpha");
    expect(document.querySelector('input[name="status"]')).toHaveValue("a");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should close on an outside click and discard an in-progress arrow-key focus, not commit it", () => {
    const { onChange } = renderStatusBox();
    fireEvent.click(screen.getByRole("button"));
    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox).toHaveAttribute("aria-activedescendant", "status-option-c");

    fireEvent.mouseDown(document.body);

    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button")).toHaveTextContent("Alpha");
    expect(document.querySelector('input[name="status"]')).toHaveValue("a");
    expect(onChange).not.toHaveBeenCalled();
  });
});
