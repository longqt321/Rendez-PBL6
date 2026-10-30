import { Children, useEffect, useRef, type ReactNode } from "react";

// Preserve DOM and keyboard order while packing photos at their natural ratios.
export function MasonryFeed({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const childCount = Children.count(children);

  useEffect(() => {
    const element = grid.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const style = getComputedStyle(element);
      const row = parseFloat(style.gridAutoRows) || 8;
      const gap = parseFloat(style.rowGap) || 16;
      const updates: { card: HTMLElement; span: number }[] = [];

      // Read phase: avoid interleaved read-write layout thrashing
      for (const entry of entries) {
        const card = entry.target.parentElement as HTMLElement | null;
        if (card) {
          const height =
            entry.borderBoxSize?.[0]?.blockSize ||
            entry.contentRect.height ||
            entry.target.getBoundingClientRect().height;
          const span = Math.ceil((height + gap) / (row + gap));
          updates.push({ card, span });
        }
      }

      // Write phase: mutate DOM only when span value actually changes
      for (const { card, span } of updates) {
        const nextSpan = `span ${span}`;
        if (card.style.gridRowEnd !== nextSpan) {
          card.style.gridRowEnd = nextSpan;
        }
      }
    });

    element
      .querySelectorAll(".pin-body")
      .forEach((body) => observer.observe(body));
    return () => observer.disconnect();
  }, [childCount]);

  return (
    <div ref={grid} className={className}>
      {children}
    </div>
  );
}
