/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { Skeleton } from "@/components/Skeleton";

describe("Skeleton", () => {
  it("should render with aria-busy and the default dimension variables", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;

    expect(el).toHaveAttribute("aria-busy", "true");
    expect(el.style.getPropertyValue("--skeleton-width")).toBe("100%");
    expect(el.style.getPropertyValue("--skeleton-height")).toBe("1rem");
  });

  it("should apply custom width/height/borderRadius when given", () => {
    const { container } = render(
      <Skeleton width="32px" height="32px" borderRadius="50%" />,
    );
    const el = container.firstChild as HTMLElement;

    expect(el.style.getPropertyValue("--skeleton-width")).toBe("32px");
    expect(el.style.getPropertyValue("--skeleton-height")).toBe("32px");
    expect(el.style.getPropertyValue("--skeleton-radius")).toBe("50%");
  });
});
