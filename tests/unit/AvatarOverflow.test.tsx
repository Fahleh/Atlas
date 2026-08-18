/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { AvatarOverflow } from "@/components/Avatar";

describe("AvatarOverflow", () => {
  it("should render the overflow count prefixed with a plus sign", () => {
    render(<AvatarOverflow count={3} />);

    expect(screen.getByText("+3")).toBeInTheDocument();
  });
});
