"use client";

import { useSyncExternalStore } from "react";

export type DisplayedTheme = "light" | "dark" | "pending";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): DisplayedTheme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

// Server render has no access to the inline theme-flash script's result
// (it runs in the browser, before hydration). Returning a neutral state
// here, rather than guessing "light", means the one render that can't
// know the real theme reads as loading, not as a wrong answer.
function getServerSnapshot(): DisplayedTheme {
  return "pending";
}

/**
 * Reads the theme the inline theme-flash script (app/layout.tsx) already
 * applied to `documentElement`, via useSyncExternalStore so the server
 * and the first client render agree exactly, with no hydration mismatch.
 * See docs/decisions.md for why this exists instead of ThemeContext's
 * own `theme` state.
 */
export function useDisplayedTheme(): DisplayedTheme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
