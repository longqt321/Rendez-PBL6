import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { clsx } from "clsx";

const button = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-md",
  {
    variants: {
      variant: {
        primary: "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200",
        outline: "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800",
        ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
        accent: "bg-blue-600 text-white hover:bg-blue-700",
        destructive: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
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
