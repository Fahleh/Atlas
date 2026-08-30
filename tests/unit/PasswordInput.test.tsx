/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { PasswordInput } from "@/components/PasswordInput";

// Focus/selection restoration is not covered here, jsdom can't reproduce
// what it's fixing. See docs/frontend.md's PasswordInput section for why.

describe("PasswordInput", () => {
  it('should render as type="password" initially', () => {
    render(<PasswordInput id="password" name="password" />);

    expect(document.getElementById("password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it('should switch to type="text" on click and back to type="password" on a second click', () => {
    render(<PasswordInput id="password" name="password" />);
    const input = document.getElementById("password") as HTMLInputElement;

    fireEvent.click(screen.getByRole("button"));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button"));
    expect(input).toHaveAttribute("type", "password");
  });

  it("should update aria-label in both directions", () => {
    render(<PasswordInput id="password" name="password" />);

    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Show password",
    );

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Hide password",
    );

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Show password",
    );
  });

  it("should render the Eye icon when hidden and the EyeOff icon when shown", () => {
    render(<PasswordInput id="password" name="password" />);
    const button = screen.getByRole("button");

    expect(button.querySelector(".lucide-eye")).toBeInTheDocument();
    expect(button.querySelector(".lucide-eye-off")).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(button.querySelector(".lucide-eye-off")).toBeInTheDocument();
    expect(button.querySelector(".lucide-eye")).not.toBeInTheDocument();
  });

  it("should toggle two sibling instances independently", () => {
    render(
      <>
        <PasswordInput id="password" name="password" />
        <PasswordInput id="confirmPassword" name="confirmPassword" />
      </>,
    );
    const [passwordButton, confirmButton] = screen.getAllByRole("button");
    const passwordInput = document.getElementById(
      "password",
    ) as HTMLInputElement;
    const confirmInput = document.getElementById(
      "confirmPassword",
    ) as HTMLInputElement;

    fireEvent.click(passwordButton);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(confirmInput).toHaveAttribute("type", "password");
    expect(passwordButton).toHaveAttribute("aria-label", "Hide password");
    expect(confirmButton).toHaveAttribute("aria-label", "Show password");
  });
});
