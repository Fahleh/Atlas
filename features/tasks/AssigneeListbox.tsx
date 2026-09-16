"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import type { Member } from "@/types/atlas.types";
import styles from "./AssigneeListbox.module.css";

// ---- Types ------------------------------------------------------------------

export type AssigneeListboxVariant = "field" | "avatar";

export type AssigneeListboxProps = {
  /** Members of the task's project, offered as options alongside Unassigned. */
  members: Member[];
  /** Pre-selected assignee ID, or null for unassigned; re-mount to reset. */
  defaultValue: string | null;
  /** "field" renders a full-width labelled trigger; "avatar" renders a bare circle. */
  variant: AssigneeListboxVariant;
  /** Name attribute for the hidden input carrying the value into FormData. Omit outside a form. */
  name?: string;
  /** Visible label rendered above a "field" variant trigger. */
  label?: string;
  /** Called with the new assignee ID (or null) whenever selection changes. */
  onChange?: (assigneeId: string | null) => void;
};

type AssigneeOption = {
  id: string | null;
  name: string;
  avatarUrl: string | null;
};

type PopoverPosition = {
  top: number;
  left?: number;
  right?: number;
  width?: number;
};

// ---- Constants ----------------------------------------------------------------

const UNASSIGNED_OPTION: AssigneeOption = {
  id: null,
  name: "Unassigned",
  avatarUrl: null,
};

// Matches --space-1 (4px). Can't reference the CSS custom property from a
// getBoundingClientRect calculation, so it's mirrored here as a constant.
const POPOVER_GAP_PX = 4;

// ---- Component ----------------------------------------------------------------

/**
 * Custom listbox for picking a task's assignee from its project's members,
 * plus an explicit Unassigned option. Same interaction model as StatusBox
 * (internal state, own hidden input when name is given, onChange as a side
 * notification), but not generic over the option type since a member's
 * avatar and a fixed Unassigned option aren't expressible as StatusBox's
 * label/dotColor config shape.
 *
 * Two trigger shapes share the same option list and open/close behavior:
 * "field" for TaskModal's assignee field, "avatar" for TaskList's inline
 * quick-assign, where the trigger is just the avatar circle itself.
 *
 * The options panel is portaled into document.body and positioned with
 * position: fixed from the trigger's real getBoundingClientRect, not CSS
 * position: absolute nested inside the row. TaskList's row lives in a
 * scrolling container (TaskList.module.css's overflow-y: auto), and an
 * absolutely positioned popover that opens near the bottom of that list
 * would push its scrollable bounds even though it's visually detached from
 * normal flow. A fixed-position, portaled element escapes that entirely.
 *
 * @param members - Project members offered as options
 * @param defaultValue - Pre-selected assignee ID; re-mount to reset
 * @param variant - Which trigger shape to render
 * @param name - Hidden input name; omit when not inside a form
 * @param label - Visible label for the "field" variant
 * @param onChange - Called with the new assignee ID whenever selection changes
 */
export function AssigneeListbox({
  members,
  defaultValue,
  variant,
  name,
  label,
  onChange,
}: AssigneeListboxProps) {
  const [assigneeId, setAssigneeId] = useState<string | null>(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({
    top: 0,
    left: 0,
  });
  const listboxRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useOutsideClick<HTMLButtonElement>(
    isOpen,
    setIsOpen,
    listboxRef,
  );

  const options: AssigneeOption[] = [
    UNASSIGNED_OPTION,
    ...members.map((member) => ({
      id: member.id,
      name: member.name,
      avatarUrl: member.avatarUrl,
    })),
  ];
  const selectedIndex = options.findIndex((option) => option.id === assigneeId);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : UNASSIGNED_OPTION;

  // Move focus to the listbox when it opens so arrow-key navigation works immediately
  useEffect(() => {
    if (isOpen) {
      listboxRef.current?.focus();
    }
  }, [isOpen]);

  // A fixed-position popover computed once goes stale the moment the page
  // or an ancestor list scrolls out from under it. Closing on scroll is the
  // simplest correct behavior, matching how outside-click already handles
  // other ways of losing the anchor. Capture phase since scroll doesn't
  // bubble, but a capture-phase window listener still sees it fire on a
  // scrolling descendant like TaskList's own list.
  useEffect(() => {
    if (!isOpen) return;

    function handleScroll() {
      setIsOpen(false);
    }

    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  function handleTriggerClick() {
    setIsOpen((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen) {
        setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) {
          setPopoverPosition(
            variant === "field"
              ? { top: rect.bottom + POPOVER_GAP_PX, left: rect.left, width: rect.width }
              : { top: rect.bottom + POPOVER_GAP_PX, right: window.innerWidth - rect.right },
          );
        }
      }
      return willOpen;
    });
  }

  function handleOptionSelect(option: AssigneeOption) {
    setAssigneeId(option.id);
    setIsOpen(false);
    onChange?.(option.id);
  }

  function getOptionId(option: AssigneeOption): string {
    return `assignee-option-${option.id ?? "unassigned"}`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        handleOptionSelect(options[focusedIndex]);
        break;
      default:
        break;
    }
  }

  function renderOptionAvatar(option: AssigneeOption) {
    if (!option.id) {
      return <span className={styles.unassignedIcon} aria-hidden="true" />;
    }
    return <Avatar name={option.name} avatarUrl={option.avatarUrl} size="small" />;
  }

  const listbox = (
    <div
      ref={listboxRef}
      role="listbox"
      aria-label="Assignee"
      tabIndex={0}
      aria-activedescendant={isOpen ? getOptionId(options[focusedIndex]) : undefined}
      onKeyDown={handleKeyDown}
      style={{
        top: popoverPosition.top,
        left: popoverPosition.left,
        right: popoverPosition.right,
        width: popoverPosition.width,
      }}
      className={`${styles.options} ${isOpen ? styles.optionsOpen : ""}`}
    >
      {options.map((option, index) => (
        <div
          key={option.id ?? "unassigned"}
          id={getOptionId(option)}
          role="option"
          aria-selected={option.id === selectedOption.id}
          onClick={() => handleOptionSelect(option)}
          className={`${styles.option} ${
            option.id === selectedOption.id ? styles.optionSelected : ""
          } ${isOpen && index === focusedIndex ? styles.optionFocused : ""}`}
        >
          {renderOptionAvatar(option)}
          <span>{option.name}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className={variant === "field" ? styles.field : undefined}>
      {variant === "field" && label && (
        <span className={styles.fieldLabel} id={name ? `${name}-label` : undefined}>
          {label}
        </span>
      )}
      {name && <input type="hidden" name={name} value={assigneeId ?? ""} />}

      {variant === "field" ? (
        <button
          ref={wrapperRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={handleTriggerClick}
          className={styles.fieldTrigger}
        >
          {renderOptionAvatar(selectedOption)}
          <span className={styles.fieldTriggerLabel}>{selectedOption.name}</span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
          />
        </button>
      ) : (
        <button
          ref={wrapperRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={
            selectedOption.id
              ? `Assigned to ${selectedOption.name}`
              : "Assign a member"
          }
          onClick={handleTriggerClick}
          className={styles.avatarTrigger}
        >
          {selectedOption.id ? (
            <Avatar name={selectedOption.name} avatarUrl={selectedOption.avatarUrl} size="small" />
          ) : (
            <span className={styles.placeholderCircle} aria-hidden="true">
              <Plus size={14} />
            </span>
          )}
        </button>
      )}

      {typeof document !== "undefined" && createPortal(listbox, document.body)}
    </div>
  );
}
