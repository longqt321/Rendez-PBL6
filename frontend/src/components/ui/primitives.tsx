import type { ComponentProps, ReactNode } from "react";
import { clsx } from "clsx";

/* ------------------------------------------------------------------ Button */

export { Button, type ButtonProps } from "./button";

/* -------------------------------------------------------------- Icon button */

type IconButtonProps = ComponentProps<"button"> & {
  /** Required: an icon-only control has no visible text to name it. */
  label: string;
  bordered?: boolean;
  active?: boolean;
};

/**
 * Icon-only control. The accessible name is mandatory rather than optional so
 * an unlabelled icon button cannot be introduced by accident.
 */
export function IconButton({
  label,
  bordered = false,
  active = false,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={clsx(
        "icon-btn",
        bordered && "icon-btn--bordered",
        active && "icon-btn--active",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- Field */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("field", className)}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="field__hint">{hint}</p> : null}
      {error ? (
        <p className="field__error" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx("input", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx("textarea", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx("select", className)} {...props} />;
}

/* -------------------------------------------------------------------- Chip */

export function Chip({
  active = false,
  accent = false,
  className,
  ...props
}: ComponentProps<"span"> & { active?: boolean; accent?: boolean }) {
  return (
    <span
      className={clsx(
        "chip",
        active && "chip--active",
        accent && "chip--accent",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------- Badge */

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & {
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}) {
  return (
    <span
      className={clsx(
        "badge",
        tone !== "neutral" && `badge--${tone}`,
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ Avatar */

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const trimmed = (name ?? "").trim();
  const label = trimmed
    ? trimmed
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : "?";
  return (
    <span
      className={clsx(
        "avatar-badge",
        size !== "md" && `avatar-badge--${size}`,
        className,
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}
