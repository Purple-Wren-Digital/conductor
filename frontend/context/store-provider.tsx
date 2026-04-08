"use client";

import { AppContext, ConductorUser } from "@/lib/types";
import { createContext, useContext, useMemo, useState } from "react";

export const StoreContext = createContext({
  currentUser: {} as ConductorUser | null,
  setCurrentUser: (currentUser: ConductorUser | null) => {},
});

export const useStore = () => useContext(StoreContext);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<ConductorUser | null>(null);
  const value: AppContext = useMemo(() => {
    return {
      currentUser,
      setCurrentUser,
    };
  }, [currentUser]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
