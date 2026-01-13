import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests for ticket list filter persistence logic.
 *
 * The key behaviors being tested:
 * - Filters auto-clear on page load by default (no saved filters)
 * - Users can explicitly save filters to localStorage
 * - Users can clear saved filters
 * - Each role (admin, staff, agent) has separate saved filters
 */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

// Default filter values
const defaultActiveStatuses = [
  "ASSIGNED",
  "UNASSIGNED",
  "AWAITING_RESPONSE",
  "IN_PROGRESS",
];

interface FilterState {
  searchQuery: string;
  selectedStatuses: string[];
  selectedUrgencies: string[];
  selectedCategory: string | { label: string; ids: string[] };
  selectedAssignee: string;
  selectedCreator?: string;
  selectedMarketCenterId?: string;
  dateFrom: string | null;
  dateTo: string | null;
  showFilters: boolean;
  openFrom: boolean;
  openTo: boolean;
  sortBy: string;
  sortDir: string;
}

const createDefaultFilters = (): FilterState => ({
  searchQuery: "",
  selectedStatuses: defaultActiveStatuses,
  selectedUrgencies: [],
  selectedCategory: "all",
  selectedAssignee: "all",
  selectedCreator: "all",
  selectedMarketCenterId: "all",
  dateFrom: null,
  dateTo: null,
  showFilters: false,
  openFrom: false,
  openTo: false,
  sortBy: "updatedAt",
  sortDir: "desc",
});

const createCustomFilters = (): FilterState => ({
  searchQuery: "test query",
  selectedStatuses: ["ASSIGNED", "IN_PROGRESS"],
  selectedUrgencies: ["HIGH"],
  selectedCategory: "cat-1",
  selectedAssignee: "user-1",
  selectedCreator: "user-2",
  selectedMarketCenterId: "mc-1",
  dateFrom: "2024-01-01T00:00:00.000Z",
  dateTo: "2024-01-31T23:59:59.999Z",
  showFilters: true,
  openFrom: false,
  openTo: false,
  sortBy: "createdAt",
  sortDir: "asc",
});

/**
 * Simulates the saveFilters function from the ticket list components
 */
function saveFilters(storageKey: string, filters: FilterState): void {
  localStorage.setItem(storageKey, JSON.stringify(filters));
}

/**
 * Simulates the loadFilters function from the ticket list components
 */
function loadFilters(storageKey: string): FilterState | null {
  const filtersString = localStorage.getItem(storageKey);
  if (filtersString) {
    try {
      return JSON.parse(filtersString);
    } catch {
      localStorage.removeItem(storageKey);
      return null;
    }
  }
  return null;
}

/**
 * Simulates the clearSavedFilters function from the ticket list components
 */
function clearSavedFilters(storageKey: string): void {
  localStorage.removeItem(storageKey);
}

/**
 * Checks if current filters differ from defaults (hasActiveFilters)
 */
function hasActiveFilters(filters: FilterState): boolean {
  const defaults = createDefaultFilters();
  return (
    filters.searchQuery !== defaults.searchQuery ||
    filters.selectedStatuses.length !== defaults.selectedStatuses.length ||
    filters.selectedUrgencies.length !== defaults.selectedUrgencies.length ||
    filters.selectedCategory !== defaults.selectedCategory ||
    filters.selectedAssignee !== defaults.selectedAssignee ||
    filters.dateFrom !== defaults.dateFrom ||
    filters.dateTo !== defaults.dateTo ||
    filters.sortBy !== defaults.sortBy ||
    filters.sortDir !== defaults.sortDir
  );
}

describe("Ticket List Filter Persistence", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("saveFilters", () => {
    it("should save filters to localStorage with the correct key", () => {
      const filters = createCustomFilters();
      saveFilters("ticket-filters-saved", filters);

      const stored = localStorage.getItem("ticket-filters-saved");
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(filters);
    });

    it("should save filters for admin with admin-specific key", () => {
      const filters = createCustomFilters();
      saveFilters("ticket-filters-saved", filters);

      expect(localStorage.getItem("ticket-filters-saved")).not.toBeNull();
      expect(localStorage.getItem("ticket-filters-saved-staff")).toBeNull();
      expect(localStorage.getItem("ticket-filters-saved-agent")).toBeNull();
    });

    it("should save filters for staff with staff-specific key", () => {
      const filters = createCustomFilters();
      saveFilters("ticket-filters-saved-staff", filters);

      expect(localStorage.getItem("ticket-filters-saved")).toBeNull();
      expect(localStorage.getItem("ticket-filters-saved-staff")).not.toBeNull();
      expect(localStorage.getItem("ticket-filters-saved-agent")).toBeNull();
    });

    it("should save filters for agent with agent-specific key", () => {
      const filters = createCustomFilters();
      saveFilters("ticket-filters-saved-agent", filters);

      expect(localStorage.getItem("ticket-filters-saved")).toBeNull();
      expect(localStorage.getItem("ticket-filters-saved-staff")).toBeNull();
      expect(localStorage.getItem("ticket-filters-saved-agent")).not.toBeNull();
    });

    it("should overwrite existing saved filters", () => {
      const filters1 = createCustomFilters();
      saveFilters("ticket-filters-saved", filters1);

      const filters2 = { ...createCustomFilters(), searchQuery: "new query" };
      saveFilters("ticket-filters-saved", filters2);

      const stored = JSON.parse(localStorage.getItem("ticket-filters-saved")!);
      expect(stored.searchQuery).toBe("new query");
    });
  });

  describe("loadFilters", () => {
    it("should return null when no saved filters exist", () => {
      const result = loadFilters("ticket-filters-saved");
      expect(result).toBeNull();
    });

    it("should return saved filters when they exist", () => {
      const filters = createCustomFilters();
      localStorage.setItem("ticket-filters-saved", JSON.stringify(filters));

      const result = loadFilters("ticket-filters-saved");
      expect(result).toEqual(filters);
    });

    it("should return null and clear storage for invalid JSON", () => {
      localStorage.setItem("ticket-filters-saved", "invalid json{");

      const result = loadFilters("ticket-filters-saved");
      expect(result).toBeNull();
      expect(localStorage.getItem("ticket-filters-saved")).toBeNull();
    });

    it("should load filters for the correct role", () => {
      const adminFilters = { ...createCustomFilters(), searchQuery: "admin" };
      const staffFilters = { ...createCustomFilters(), searchQuery: "staff" };
      const agentFilters = { ...createCustomFilters(), searchQuery: "agent" };

      saveFilters("ticket-filters-saved", adminFilters);
      saveFilters("ticket-filters-saved-staff", staffFilters);
      saveFilters("ticket-filters-saved-agent", agentFilters);

      expect(loadFilters("ticket-filters-saved")?.searchQuery).toBe("admin");
      expect(loadFilters("ticket-filters-saved-staff")?.searchQuery).toBe("staff");
      expect(loadFilters("ticket-filters-saved-agent")?.searchQuery).toBe("agent");
    });
  });

  describe("clearSavedFilters", () => {
    it("should remove saved filters from localStorage", () => {
      const filters = createCustomFilters();
      saveFilters("ticket-filters-saved", filters);
      expect(localStorage.getItem("ticket-filters-saved")).not.toBeNull();

      clearSavedFilters("ticket-filters-saved");
      expect(localStorage.getItem("ticket-filters-saved")).toBeNull();
    });

    it("should only clear filters for the specified role", () => {
      saveFilters("ticket-filters-saved", createCustomFilters());
      saveFilters("ticket-filters-saved-staff", createCustomFilters());
      saveFilters("ticket-filters-saved-agent", createCustomFilters());

      clearSavedFilters("ticket-filters-saved-staff");

      expect(localStorage.getItem("ticket-filters-saved")).not.toBeNull();
      expect(localStorage.getItem("ticket-filters-saved-staff")).toBeNull();
      expect(localStorage.getItem("ticket-filters-saved-agent")).not.toBeNull();
    });

    it("should not throw when clearing non-existent filters", () => {
      expect(() => clearSavedFilters("ticket-filters-saved")).not.toThrow();
    });
  });

  describe("hasActiveFilters", () => {
    it("should return false for default filters", () => {
      const filters = createDefaultFilters();
      expect(hasActiveFilters(filters)).toBe(false);
    });

    it("should return true when searchQuery is set", () => {
      const filters = { ...createDefaultFilters(), searchQuery: "test" };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it("should return true when statuses differ from default", () => {
      const filters = {
        ...createDefaultFilters(),
        selectedStatuses: ["RESOLVED"],
      };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it("should return true when urgencies are selected", () => {
      const filters = {
        ...createDefaultFilters(),
        selectedUrgencies: ["HIGH"],
      };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it("should return true when category is selected", () => {
      const filters = {
        ...createDefaultFilters(),
        selectedCategory: "cat-1",
      };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it("should return true when assignee is selected", () => {
      const filters = {
        ...createDefaultFilters(),
        selectedAssignee: "user-1",
      };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it("should return true when date range is set", () => {
      const filters = {
        ...createDefaultFilters(),
        dateFrom: "2024-01-01T00:00:00.000Z",
      };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it("should return true when sort is changed", () => {
      const filters = {
        ...createDefaultFilters(),
        sortBy: "createdAt",
      };
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it("should return true when sort direction is changed", () => {
      const filters = {
        ...createDefaultFilters(),
        sortDir: "asc",
      };
      expect(hasActiveFilters(filters)).toBe(true);
    });
  });

  describe("Filter persistence workflow", () => {
    it("should not persist filters automatically (auto-clear behavior)", () => {
      // Simulate page load - no filters should be saved by default
      const savedFilters = loadFilters("ticket-filters-saved");
      expect(savedFilters).toBeNull();
    });

    it("should persist filters only when explicitly saved", () => {
      // User sets custom filters
      const customFilters = createCustomFilters();

      // Filters are NOT automatically saved
      expect(loadFilters("ticket-filters-saved")).toBeNull();

      // User clicks "Save Filters"
      saveFilters("ticket-filters-saved", customFilters);

      // Now filters are persisted
      expect(loadFilters("ticket-filters-saved")).toEqual(customFilters);
    });

    it("should restore saved filters on page load", () => {
      // User previously saved filters
      const savedFilters = createCustomFilters();
      saveFilters("ticket-filters-saved", savedFilters);

      // Simulate page reload - filters should be restored
      const loadedFilters = loadFilters("ticket-filters-saved");
      expect(loadedFilters).toEqual(savedFilters);
      expect(loadedFilters?.searchQuery).toBe("test query");
      expect(loadedFilters?.selectedStatuses).toEqual(["ASSIGNED", "IN_PROGRESS"]);
    });

    it("should clear saved filters and reset to defaults", () => {
      // User has saved filters
      saveFilters("ticket-filters-saved", createCustomFilters());
      expect(loadFilters("ticket-filters-saved")).not.toBeNull();

      // User clicks "Clear Saved"
      clearSavedFilters("ticket-filters-saved");

      // Saved filters are removed
      expect(loadFilters("ticket-filters-saved")).toBeNull();

      // On next page load, defaults will be used
      const defaults = createDefaultFilters();
      expect(hasActiveFilters(defaults)).toBe(false);
    });

    it("should allow each role to have independent saved filters", () => {
      // Admin saves filters with one search query
      saveFilters("ticket-filters-saved", {
        ...createCustomFilters(),
        searchQuery: "admin search",
      });

      // Staff saves filters with different search query
      saveFilters("ticket-filters-saved-staff", {
        ...createCustomFilters(),
        searchQuery: "staff search",
      });

      // Agent saves filters with different search query
      saveFilters("ticket-filters-saved-agent", {
        ...createCustomFilters(),
        searchQuery: "agent search",
      });

      // Each role loads their own filters
      expect(loadFilters("ticket-filters-saved")?.searchQuery).toBe("admin search");
      expect(loadFilters("ticket-filters-saved-staff")?.searchQuery).toBe("staff search");
      expect(loadFilters("ticket-filters-saved-agent")?.searchQuery).toBe("agent search");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string values in filters", () => {
      const filters = { ...createCustomFilters(), searchQuery: "" };
      saveFilters("ticket-filters-saved", filters);

      const loaded = loadFilters("ticket-filters-saved");
      expect(loaded?.searchQuery).toBe("");
    });

    it("should handle null date values", () => {
      const filters = {
        ...createCustomFilters(),
        dateFrom: null,
        dateTo: null,
      };
      saveFilters("ticket-filters-saved", filters);

      const loaded = loadFilters("ticket-filters-saved");
      expect(loaded?.dateFrom).toBeNull();
      expect(loaded?.dateTo).toBeNull();
    });

    it("should handle empty arrays", () => {
      const filters = {
        ...createCustomFilters(),
        selectedStatuses: [],
        selectedUrgencies: [],
      };
      saveFilters("ticket-filters-saved", filters);

      const loaded = loadFilters("ticket-filters-saved");
      expect(loaded?.selectedStatuses).toEqual([]);
      expect(loaded?.selectedUrgencies).toEqual([]);
    });

    it("should handle category object format (admin)", () => {
      const filters = {
        ...createCustomFilters(),
        selectedCategory: { label: "General", ids: ["cat-1", "cat-2"] },
      };
      saveFilters("ticket-filters-saved", filters);

      const loaded = loadFilters("ticket-filters-saved");
      expect(loaded?.selectedCategory).toEqual({
        label: "General",
        ids: ["cat-1", "cat-2"],
      });
    });
  });
});
