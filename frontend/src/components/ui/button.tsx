import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { clsx } from "clsx";

const button = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-full",
  {
    variants: {
      variant: {
        primary: "bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90",
        outline: "border border-[var(--line)] bg-[var(--surface-card)] text-[var(--ink)] hover:bg-[var(--surface-muted)]",
        ghost: "text-[var(--ink-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
        accent: "bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90",
        destructive: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900",
      },
      size: {
        sm: "h-8 px-3.5 text-xs",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-6 text-base",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Variant = "primary" | "outline" | "ghost" | "accent" | "destructive";

export type ButtonProps = ComponentProps<"button"> &
  Omit<VariantProps<typeof button>, "variant"> & {
    asChild?: boolean;
    variant?: Variant | "default";
  };

export function Button({
  className,
  variant = "primary",
  size,
  block,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      data-slot="button"
      className={clsx(
        button({
          variant: variant === "default" ? "primary" : variant,
          size,
          block,
        }),
        className,
      )}
      {...props}
    />
  );
}
