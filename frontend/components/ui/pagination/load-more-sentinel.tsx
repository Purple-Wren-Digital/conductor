"use client";

import { useEffect, useRef } from "react";

export function LoadMoreSentinel({
  hasNextPage,
  isFetching,
  onLoadMore,
  totalLabel,
}: {
  hasNextPage: boolean;
  isFetching: boolean;
  onLoadMore: () => void;
  totalLabel?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isFetching) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, onLoadMore]);

  return (
    <div
      ref={ref}
      className="flex items-center justify-center py-4 text-sm text-muted-foreground"
      aria-live="polite"
    >
      {hasNextPage
        ? isFetching
          ? "Loading more…"
          : "Scroll to load more"
        : (totalLabel ?? "End of list")}
    </div>
  );
}
