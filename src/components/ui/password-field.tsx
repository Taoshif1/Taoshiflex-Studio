"use client";

import { type ComponentPropsWithoutRef, useId, useState } from "react";

import styles from "./password-field.module.css";

type PasswordFieldProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "id" | "type"
> & {
  id?: string;
  label: string;
};

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10.7 10.7 0 0112 5c5.2 0 8.5 4.4 9 7a9.7 9.7 0 01-2 3.8M6.2 6.2C4.4 7.5 3.3 9.5 3 12c.5 2.6 3.8 7 9 7 1.3 0 2.5-.3 3.5-.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 12c.5-2.6 3.8-7 9-7s8.5 4.4 9 7c-.5 2.6-3.8 7-9 7s-8.5-4.4-9-7z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function PasswordField({
  id,
  label,
  disabled,
  ...inputProps
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.field}>
      <label htmlFor={inputId}>{label}</label>
      <span className={styles.shell}>
        <input
          {...inputProps}
          className={`${styles.input} ${inputProps.className ?? ""}`.trim()}
          id={inputId}
          type={visible ? "text" : "password"}
          disabled={disabled}
        />
        <button
          className={styles.toggle}
          data-password-toggle
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={inputId}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
        >
          <EyeIcon visible={visible} />
        </button>
      </span>
    </div>
  );
}
