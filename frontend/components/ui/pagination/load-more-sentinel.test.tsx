import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LoadMoreSentinel } from "./load-more-sentinel";

type ObserverEntry = { isIntersecting: boolean };

let lastObserver: {
  callback: (entries: ObserverEntry[]) => void;
  options: IntersectionObserverInit | undefined;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
} | null = null;

class MockIntersectionObserver {
  callback: (entries: ObserverEntry[]) => void;
  options: IntersectionObserverInit | undefined;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();

  constructor(
    cb: (entries: ObserverEntry[]) => void,
    opts?: IntersectionObserverInit
  ) {
    this.callback = cb;
    this.options = opts;
    lastObserver = {
      callback: cb,
      options: opts,
      observe: this.observe,
      disconnect: this.disconnect,
    };
  }
}

beforeEach(() => {
  lastObserver = null;
  (globalThis as any).IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
});

describe("LoadMoreSentinel", () => {
  it("renders the prompt label when more pages are available and not fetching", () => {
    render(
      <LoadMoreSentinel
        hasNextPage={true}
        isFetching={false}
        onLoadMore={vi.fn()}
      />
    );

    expect(screen.getByText("Scroll to load more")).toBeInTheDocument();
  });

  it("renders the loading label while a fetch is in-flight", () => {
    render(
      <LoadMoreSentinel
        hasNextPage={true}
        isFetching={true}
        onLoadMore={vi.fn()}
      />
    );

    expect(screen.getByText(/Loading more/)).toBeInTheDocument();
  });

  it("renders the totalLabel when there are no more pages", () => {
    render(
      <LoadMoreSentinel
        hasNextPage={false}
        isFetching={false}
        onLoadMore={vi.fn()}
        totalLabel="Showing 145 of 145 tickets"
      />
    );

    expect(screen.getByText("Showing 145 of 145 tickets")).toBeInTheDocument();
  });

  it("falls back to 'End of list' when totalLabel is omitted and no more pages", () => {
    render(
      <LoadMoreSentinel
        hasNextPage={false}
        isFetching={false}
        onLoadMore={vi.fn()}
      />
    );

    expect(screen.getByText("End of list")).toBeInTheDocument();
  });

  it("registers an IntersectionObserver with rootMargin 200px when more pages are available", () => {
    render(
      <LoadMoreSentinel
        hasNextPage={true}
        isFetching={false}
        onLoadMore={vi.fn()}
      />
    );

    expect(lastObserver).not.toBeNull();
    expect(lastObserver!.options?.rootMargin).toBe("200px");
    expect(lastObserver!.observe).toHaveBeenCalledTimes(1);
  });

  it("calls onLoadMore when the sentinel intersects the viewport", () => {
    const onLoadMore = vi.fn();
    render(
      <LoadMoreSentinel
        hasNextPage={true}
        isFetching={false}
        onLoadMore={onLoadMore}
      />
    );

    act(() => {
      lastObserver!.callback([{ isIntersecting: true }]);
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("does not call onLoadMore when the entry is not intersecting", () => {
    const onLoadMore = vi.fn();
    render(
      <LoadMoreSentinel
        hasNextPage={true}
        isFetching={false}
        onLoadMore={onLoadMore}
      />
    );

    act(() => {
      lastObserver!.callback([{ isIntersecting: false }]);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("does not register an observer while a fetch is in-flight", () => {
    render(
      <LoadMoreSentinel
        hasNextPage={true}
        isFetching={true}
        onLoadMore={vi.fn()}
      />
    );

    expect(lastObserver).toBeNull();
  });

  it("does not register an observer when there are no more pages", () => {
    render(
      <LoadMoreSentinel
        hasNextPage={false}
        isFetching={false}
        onLoadMore={vi.fn()}
      />
    );

    expect(lastObserver).toBeNull();
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(
      <LoadMoreSentinel
        hasNextPage={true}
        isFetching={false}
        onLoadMore={vi.fn()}
      />
    );

    const observer = lastObserver!;
    unmount();
    expect(observer.disconnect).toHaveBeenCalled();
  });
});
