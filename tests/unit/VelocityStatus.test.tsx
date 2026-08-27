/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { VelocityStatus } from "@/features/projects/VelocityStatus";

describe("VelocityStatus narrative", () => {
  it("should show the zero-tasks narrative and the clear data-variant", () => {
    const { container } = render(
      <VelocityStatus dueSoonTaskCount={0} isLoading={false} />,
    );

    expect(screen.getByText("Nothing due")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-variant", "clear");
  });

  it("should use singular phrasing for exactly 1 task, with the due data-variant", () => {
    const { container } = render(
      <VelocityStatus dueSoonTaskCount={1} isLoading={false} />,
    );

    expect(screen.getByText("1 task")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-variant", "due");
  });

  it("should use plural phrasing for more than 1 task", () => {
    render(<VelocityStatus dueSoonTaskCount={4} isLoading={false} />);

    expect(screen.getByText("4 tasks")).toBeInTheDocument();
  });
});

describe("VelocityStatus loading and error states", () => {
  it("should render a loading skeleton", () => {
    render(<VelocityStatus dueSoonTaskCount={0} isLoading />);

    expect(
      screen.getByRole("status", { name: "Loading velocity status" }),
    ).toBeInTheDocument();
  });

  it("should render a retry button when onRetry is given, and call it on click", () => {
    const onRetry = jest.fn();
    render(<VelocityStatus dueSoonTaskCount={0} isLoading={false} isError onRetry={onRetry} />);

    const button = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(button);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("should render the error state without a retry button when onRetry is omitted", () => {
    render(<VelocityStatus dueSoonTaskCount={0} isLoading={false} isError />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load.");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});
