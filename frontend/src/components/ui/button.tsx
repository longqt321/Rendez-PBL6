import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { clsx } from "clsx";

/**
 * Button.
 *
 * `asChild` forwards the styling to a single child (usually a router <Link>)
 * so navigation keeps its link semantics instead of becoming a fake button.
 */
const button = cva("btn", {
  variants: {
    variant: {
      primary: "btn--primary",
      outline: "btn--outline",
      ghost: "btn--ghost",
      accent: "btn--accent",
      destructive: "btn--destructive",
    },
    size: {
      sm: "btn--sm",
      md: "",
      lg: "btn--lg",
    },
    block: {
      true: "btn--block",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

type Variant = "primary" | "outline" | "ghost" | "accent" | "destructive";

export type ButtonProps = ComponentProps<"button"> &
  Omit<VariantProps<typeof button>, "variant"> & {
    asChild?: boolean;
    /** "default" is a legacy alias for "primary". */
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
