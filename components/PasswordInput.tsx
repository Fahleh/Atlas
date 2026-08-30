"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./PasswordInput.module.css";

export type PasswordInputProps = {
  id: string;
  name: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
};

/**
 * Password field with a show/hide toggle. The native input stays
 * uncontrolled (name, defaultValue, FormData) like any other text field.
 * Only the show/hide flag is local component state, so each instance
 * toggles independently of any other PasswordInput on the same page.
 *
 * Focus and selection handling here looks more involved than a toggle
 * should need. That's deliberate, not accidental complexity, see the
 * PasswordInput section in docs/frontend.md for why.
 *
 * @param id - Input id, also used by the caller's associated <label>
 * @param name - Input name submitted in FormData
 * @param required - Whether the field is required (default false)
 * @param autoComplete - autoComplete value, e.g. "current-password" or "new-password"
 * @param defaultValue - Initial value, used to restore a failed submission's input
 * @returns A password field with a trailing show/hide icon button
 */
export function PasswordInput({
  id,
  name,
  required = false,
  autoComplete,
  defaultValue,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(
    null
  );

  useEffect(() => {
    const input = inputRef.current;
    const selection = pendingSelectionRef.current;
    if (!input || !selection) return;

    pendingSelectionRef.current = null;
    const frameId = requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(selection.start, selection.end);
    });

    return () => cancelAnimationFrame(frameId);
  }, [showPassword]);

  function handleToggle() {
    const input = inputRef.current;
    const hadFocus = input !== null && document.activeElement === input;
    pendingSelectionRef.current = hadFocus
      ? {
          start: input.selectionStart ?? input.value.length,
          end: input.selectionEnd ?? input.value.length,
        }
      : null;
    setShowPassword((prev) => !prev);
  }

  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        className={styles.input}
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleToggle}
        aria-label={showPassword ? "Hide password" : "Show password"}
        className={styles.toggleButton}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
