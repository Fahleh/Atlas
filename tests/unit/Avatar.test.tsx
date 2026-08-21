/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Avatar } from "@/components/Avatar";

describe("Avatar image loading", () => {
  it("should default to lazy loading when no loading prop is given", () => {
    render(<Avatar name="Jane Doe" avatarUrl="https://example.com/a.jpg" />);

    expect(screen.getByRole("img", { name: "Jane Doe" })).toHaveAttribute(
      "loading",
      "lazy",
    );
  });

  it('should render eager loading when loading="eager" is passed', () => {
    render(
      <Avatar
        name="Jane Doe"
        avatarUrl="https://example.com/a.jpg"
        loading="eager"
      />,
    );

    expect(screen.getByRole("img", { name: "Jane Doe" })).toHaveAttribute(
      "loading",
      "eager",
    );
  });
});
