"use client";

import { AppContext, PrismaUser } from "@/lib/types";
import { createContext, useContext, useMemo, useState } from "react";

export const StoreContext = createContext({
  currentUser: {} as PrismaUser | null,
  setCurrentUser: (currentUser: PrismaUser | null) => {},
});

export const useStore = () => useContext(StoreContext);

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<PrismaUser | null>(null);
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
