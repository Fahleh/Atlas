/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { ThemeProvider, useTheme } from "@/providers/ThemeContext";

import { act, render, renderHook, screen } from "@testing-library/react";

describe("ThemeProvider", () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
    };
  })();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });

  Object.defineProperty(window, "localStorage", { value: localStorageMock });

  const renderComponent = () =>
    render(
      <ThemeProvider>
        {" "}
        <div>Child content</div>{" "}
      </ThemeProvider>,
    );

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("should render children without crashing", () => {
    renderComponent();

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("should initializes with 'light' when localStorage is empty", () => {
    renderComponent();

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("should initializes with stored value when localStorage has 'light' or 'dark'", () => {
    localStorageMock.setItem("atlas-theme", "dark");
    renderComponent();

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("should switch from 'light' to 'dark' when toggleTheme is called", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
  });

  it("should switch from 'dark' to 'light' when toggleTheme is called", () => {
    localStorageMock.setItem("atlas-theme", "dark");

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
  });

  it("should updates localStorage with the new theme when toggleTheme is called", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(localStorageMock.getItem("atlas-theme")).toBe("dark");
  });

  it("should updates data-theme on document.documentElement when toggleTheme is called", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("should throw when used outside ThemeProvider", () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow("useTheme must be used within a ThemeProvider");
  });
});
