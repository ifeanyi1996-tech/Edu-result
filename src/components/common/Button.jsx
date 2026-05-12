import React from "react";
import styles from "./Button.module.css";

// ─── Button ──────────────────────────────────────────────────────────────────
// variant: "primary" | "gold" | "emerald" | "red" | "sky" | "teal" | "outline"
// size: "sm" | "md" | "lg"

export default function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        disabled ? styles.disabled : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
