/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import * as nextNavigationHooksMock from "@/tests/mocks/nextNavigationHooksMock";

jest.mock("next/navigation", () => nextNavigationHooksMock);
jest.mock("@/providers/ThemeContext", () => ({
  useTheme: jest.fn(),
}));
jest.mock("@/providers/useDisplayedTheme", () => ({
  useDisplayedTheme: jest.fn(),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";
import { useTheme } from "@/providers/ThemeContext";
import { useDisplayedTheme, type DisplayedTheme } from "@/providers/useDisplayedTheme";

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseDisplayedTheme = useDisplayedTheme as jest.MockedFunction<
  typeof useDisplayedTheme
>;

function setDisplayedTheme(theme: DisplayedTheme) {
  mockUseDisplayedTheme.mockReturnValue(theme);
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

afterEach(() => {
  jest.clearAllMocks();
  setViewportWidth(1024);
});

beforeEach(() => {
  mockUseTheme.mockReturnValue({ theme: "light", toggleTheme: jest.fn() });
});

describe("Sidebar theme button", () => {
  it("should show a loading label and be disabled while the theme is pending", () => {
    setDisplayedTheme("pending");
    render(<Sidebar isOpen onClose={jest.fn()} />);

    const button = screen.getByRole("button", { name: "Loading theme preference" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("should offer to switch to dark mode when the theme is light", () => {
    setDisplayedTheme("light");
    render(<Sidebar isOpen onClose={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeEnabled();
    expect(screen.getByText("Dark mode")).toBeInTheDocument();
  });

  it("should offer to switch to light mode when the theme is dark, and call toggleTheme on click", () => {
    setDisplayedTheme("dark");
    const toggleTheme = jest.fn();
    mockUseTheme.mockReturnValue({ theme: "dark", toggleTheme });
    render(<Sidebar isOpen onClose={jest.fn()} />);

    const button = screen.getByRole("button", { name: "Switch to light mode" });
    expect(screen.getByText("Light mode")).toBeInTheDocument();

    fireEvent.click(button);
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });
});

describe("Sidebar active link highlighting", () => {
  beforeEach(() => setDisplayedTheme("light"));

  it.each([
    ["/", "Dashboard"],
    ["/projects", "Projects"],
    ["/profile", "Profile"],
  ])("should mark %s active for the %s link only", (pathname, activeLabel) => {
    nextNavigationHooksMock.mockUsePathname.mockReturnValue(pathname);
    render(<Sidebar isOpen onClose={jest.fn()} />);

    const activeLink = screen.getByRole("link", { name: activeLabel });
    expect(activeLink.className).toContain("navLinkActive");

    for (const label of ["Dashboard", "Projects", "Profile"]) {
      if (label === activeLabel) continue;
      const inactiveLink = screen.getByRole("link", { name: label });
      expect(inactiveLink.className).not.toContain("navLinkActive");
    }
  });
});

describe("Sidebar Escape and mobile focus trap", () => {
  beforeEach(() => setDisplayedTheme("light"));

  it("should call onClose on Escape while open", () => {
    const onClose = jest.fn();
    render(<Sidebar isOpen onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should trap Tab within the sidebar on a mobile-width viewport", () => {
    setViewportWidth(375);
    render(<Sidebar isOpen onClose={jest.fn()} />);
    const sidebar = screen.getByRole("dialog", { name: "Main navigation" });

    const focusable = sidebar.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    expect(first).toHaveFocus();

    last.focus();
    fireEvent.keyDown(sidebar, { key: "Tab" });
    expect(first).toHaveFocus();

    fireEvent.keyDown(sidebar, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });
});
