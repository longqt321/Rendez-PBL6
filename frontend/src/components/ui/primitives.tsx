import type { ComponentProps, ReactNode } from "react";
import { clsx } from "clsx";
import { initials } from "../../lib/format";

export { Button, type ButtonProps } from "./button";

type IconButtonProps = ComponentProps<"button"> & {
  label: string;
  bordered?: boolean;
  active?: boolean;
};

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
        "inline-flex items-center justify-center w-9 h-9 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        bordered
          ? "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
        active && "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

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
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-neutral-500">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={clsx(
        "w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-100 disabled:opacity-50 aria-[invalid=true]:border-red-500",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={clsx(
        "w-full p-3 rounded-md border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-100 disabled:opacity-50 aria-[invalid=true]:border-red-500 resize-y",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={clsx(
        "w-full h-10 px-3 rounded-md border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  active = false,
  accent = false,
  className,
  ...props
}: ComponentProps<"span"> & { active?: boolean; accent?: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 select-none",
        active && "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900",
        accent && "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
        className,
      )}
      {...props}
    />
  );
}

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
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase",
        tone === "neutral" && "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
        tone === "success" && "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
        tone === "warning" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        tone === "danger" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
        tone === "accent" && "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        className,
      )}
      {...props}
    />
  );
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const label = initials(name);
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-full font-bold bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 shrink-0 select-none",
        size === "sm" && "w-7 h-7 text-xs",
        size === "md" && "w-9 h-9 text-sm",
        size === "lg" && "w-12 h-12 text-base",
        className,
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}
