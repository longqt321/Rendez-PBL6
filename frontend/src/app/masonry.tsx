import { useEffect, useRef, type ReactNode } from "react";

// Preserve DOM and keyboard order while packing photos at their natural ratios.
export function MasonryFeed({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const style = getComputedStyle(element);
      const row = parseFloat(style.gridAutoRows),
        gap = parseFloat(style.rowGap);
      for (const entry of entries) {
        const card = entry.target.parentElement;
        if (card)
          card.style.gridRowEnd = `span ${Math.ceil((entry.target.getBoundingClientRect().height + gap) / (row + gap))}`;
      }
    });
    element
      .querySelectorAll(".pin-body")
      .forEach((body) => observer.observe(body));
    return () => observer.disconnect();
  }, [children]);
  return (
    <div ref={grid} className={className}>
      {children}
    </div>
  );
}
