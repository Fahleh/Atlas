/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { ActionErrorMessage } from "@/components/ActionErrorMessage";

describe("ActionErrorMessage", () => {
  it("should render just the error message when errorKind is null and no onRetry is given", () => {
    render(<ActionErrorMessage error="Something went wrong." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("should render a login link when errorKind is sessionExpired", () => {
    render(
      <ActionErrorMessage
        error="Your session has expired. Log in again to continue."
        errorKind="sessionExpired"
      />,
    );

    const link = screen.getByRole("link", { name: "Log in" });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("should render a retry button and call onRetry when clicked", () => {
    const onRetry = jest.fn();
    render(<ActionErrorMessage error="Couldn't load." onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
