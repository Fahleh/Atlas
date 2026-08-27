"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./StatusBox.module.css";
import dotStyles from "@/styles/statusDot.module.css";

// ---- Types ------------------------------------------------------------------

export type StatusDotColorClass = "dotMuted" | "dotAccent" | "dotSuccess";

export type StatusBoxConfig<T extends string> = Record<
  T,
  { label: string; dotColorClass: StatusDotColorClass }
>;

export type StatusBoxProps<T extends string> = {
  /** Pre-selected value; re-mount the component to reset it. */
  defaultValue: T;
  /** Name attribute for the hidden `<input>` that carries the value into FormData. */
  name: string;
  /** Display config keyed by value — label and dot color. */
  config: StatusBoxConfig<T>;
  /** Explicit rendering order for the options. */
  order: T[];
  /** Optional visible label rendered above the trigger button. */
  label?: string;
  /** Called with the new value whenever selection changes — status is otherwise fully internal. */
  onChange?: (value: T) => void;
};

// ---- Component --------------------------------------------------------------

/**
 * Generic status listbox that participates in FormData submission via a hidden
 * input. Designed for domain status values (tasks, projects) where every option
 * has a semantic dot color — not a general-purpose dropdown.
 *
 * Uses local state for the selected value and open/close — the documented
 * exception to "uncontrolled by default" for custom listboxes.
 *
 * @template T - String union of valid status values
 * @param defaultValue - Pre-selected status; re-mount to reset
 * @param name - The `name` attribute for the hidden input
 * @param config - Record mapping each value to its label and dotColor
 * @param order - Explicit array controlling option rendering order
 */
export function StatusBox<T extends string>({
  defaultValue,
  name,
  config,
  order,
  label,
  onChange,
}: StatusBoxProps<T>) {
  const [status, setStatus] = useState<T>(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const currentConfig = config[status];

  // Close on Escape — capture phase so this runs before any ancestor's bubble-
  // phase handler, preventing Escape from closing the modal while dropdown is open.
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [isOpen]);

  // Close on click outside the wrapper
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen]);

  // Move focus to the listbox when it opens so arrow-key navigation works immediately
  useEffect(() => {
    if (isOpen) {
      listboxRef.current?.focus();
    }
  }, [isOpen]);

  function handleTriggerClick() {
    setIsOpen((wasOpen) => {
      if (!wasOpen) {
        const index = order.indexOf(status);
        setFocusedIndex(index >= 0 ? index : 0);
      }
      return !wasOpen;
    });
  }

  function handleOptionClick(value: T) {
    setStatus(value);
    setIsOpen(false);
    onChange?.(value);
  }

  function getOptionId(value: T): string {
    return `${name}-option-${value}`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((i) => (i + 1) % order.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((i) => (i - 1 + order.length) % order.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        handleOptionClick(order[focusedIndex]);
        break;
      default:
        break;
    }
  }

  return (
    <div className={label ? styles.field : undefined}>
      {label && (
        <span className={styles.fieldLabel} id={`${name}-label`}>
          {label}
        </span>
      )}
      {/* Hidden input carries the selected value into FormData */}
      <input type="hidden" name={name} value={status} />

      <div ref={wrapperRef} className={styles.statusWrapper}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={handleTriggerClick}
          className={styles.statusTrigger}
        >
          <span
            aria-hidden="true"
            className={`${styles.statusDot} ${dotStyles[currentConfig.dotColorClass]}`}
          />
          <span className={styles.statusTriggerLabel}>
            {currentConfig.label}
          </span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`${styles.statusChevron} ${isOpen ? styles.statusChevronOpen : ""}`}
          />
        </button>

        <div
          ref={listboxRef}
          role="listbox"
          aria-label="Status"
          tabIndex={0}
          aria-activedescendant={
            isOpen ? getOptionId(order[focusedIndex]) : undefined
          }
          onKeyDown={handleKeyDown}
          className={`${styles.statusOptions} ${isOpen ? styles.statusOptionsOpen : ""}`}
        >
          {order.map((value) => {
            const opt = config[value];
            return (
              <div
                key={value}
                id={getOptionId(value)}
                role="option"
                aria-selected={value === status}
                onClick={() => handleOptionClick(value)}
                className={`${styles.statusOption} ${
                  value === status ? styles.statusOptionSelected : ""
                } ${isOpen && order[focusedIndex] === value ? styles.statusOptionFocused : ""}`}
              >
                <span
                  aria-hidden="true"
                  className={`${styles.statusDot} ${dotStyles[opt.dotColorClass]}`}
                />
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
