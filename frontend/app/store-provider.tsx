"use client";

import { AppContext, PrismaUser } from "@/lib/types";
import { createContext, useContext, useMemo, useState } from "react";

export const StoreContext = createContext({
  prismaUser: {} as PrismaUser | null,
  setPrismaUser: (prismaUser: PrismaUser | null) => {},
});

export const useStore = () => useContext(StoreContext);

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prismaUser, setPrismaUser] = useState<PrismaUser | null>(null);
  const value: AppContext = useMemo(() => {
    return {
      prismaUser,
      setPrismaUser,
    };
  }, [prismaUser]);

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
