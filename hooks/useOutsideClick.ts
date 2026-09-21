"use client";

import { useEffect, useRef } from "react";

/**
 * Closes an open popover-like control on an outside mousedown or Escape.
 * Escape is bound in the capture phase so it fires before any ancestor's
 * bubble-phase handler, e.g. a modal that would otherwise also close.
 *
 * @param isOpen - Whether the control is currently open
 * @param setIsOpen - The control's own open-state setter, called with false
 * @param extraRef - A second element to also treat as inside, e.g. a portaled
 * panel that isn't a DOM descendant of the returned ref's element
 * @returns A ref to attach to the control's trigger or wrapper element
 */
export function useOutsideClick<T extends HTMLElement>(
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
  extraRef?: React.RefObject<HTMLElement | null>,
): React.RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) return;

    function isInside(target: Node): boolean {
      return (
        !!ref.current?.contains(target) || !!extraRef?.current?.contains(target)
      );
    }

    function handleMouseDown(e: MouseEvent) {
      if (!isInside(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [isOpen, setIsOpen, extraRef]);

  return ref;
}
