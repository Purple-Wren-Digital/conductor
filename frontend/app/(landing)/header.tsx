"use client";

import { useEffect } from "react";
import {
  useUser,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { PrismaUser } from "@/lib/types";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/context/store-provider";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api/utils";
import conductorIcon from "@/app/(landing)/assets/conductor/Conductor Icon_White.png";
import Image from "next/image";

export function Header() {
  const router = useRouter();

  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { currentUser, setCurrentUser } = useStore();

  useEffect(() => {
    if (!isLoaded) return;
    if (!clerkUser) {
      setCurrentUser(null);
      return;
    }
    const fetchOrCreateUser = async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        // Call /users/me which will auto-create the user via getUserContext() if they don't exist
        const response = await fetch(`${API_BASE}/users/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          if (data) {
            setCurrentUser(data as PrismaUser);
            return;
          }
        }
        console.error("Failed to fetch/create user:", response.status);
        setCurrentUser(null);
      } catch (error) {
        console.error("Error fetching user:", error);
        setCurrentUser(null);
      }
    };
    fetchOrCreateUser();
  }, [clerkUser, isLoaded, setCurrentUser, getToken]);

  return (
    <header className="border-b bg-[#6D1C24]">
      <div className="px-5 sm:px-10 flex items-center gap-4 justify-between py-2">
        <Link href="/" className="flex items-center gap-3">
          <div className="size-12 flex items-center justify-center">
            <Image
              src={conductorIcon}
              alt="Conductor Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
          <div className="hidden md:flex flex-col leading-tight">
            <h1 className="text-sm font-bold sm:text-xl text-muted">
              Conductor
            </h1>
            <p className="text-xs font-medium sm:text-sm text-muted">
              Agent Ticketing System
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {clerkUser && currentUser ? (
            <>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                // size={"sm"}
                className="text-xs sm:text-md bg-[#faf8f9] border-[#faf8f9] hover:opacity-90"
              >
                Dashboard <ArrowRight />
              </Button>
              <UserButton />
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="secondary" size={"sm"}>
                  Log in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size={"sm"}>Sign up</Button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
