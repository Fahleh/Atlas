/**
 * Manual replacement for next/navigation's client-side hooks
 * (useRouter/useSearchParams/usePathname), for jsdom component tests.
 * Distinct from nextNavigationMock.ts, which only covers server-side
 * redirect() for Server Action tests under testEnvironment "node" —
 * different shape, different environment, not merged.
 *
 *   import * as nextNavigationHooksMock from "@/tests/mocks/nextNavigationHooksMock";
 *   jest.mock("next/navigation", () => nextNavigationHooksMock);
 *
 * useRouter()'s methods and usePathname()'s return value are mutable via the
 * exported mocks directly (e.g. `mockUsePathname.mockReturnValue("/projects")`)
 * so each test can set its own route without re-mocking the whole module.
 */

export const mockPush = jest.fn();
export const mockReplace = jest.fn();

export const useRouter = jest.fn(() => ({
  push: mockPush,
  replace: mockReplace,
}));

export const mockUsePathname = jest.fn(() => "/");
export const usePathname = mockUsePathname;

export const mockUseSearchParams = jest.fn(() => new URLSearchParams());
export const useSearchParams = mockUseSearchParams;
