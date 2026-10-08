"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { API_BASE } from "@/lib/api/utils";

export default function JoinCodeSettings() {
  const { getToken } = useAuth();
  const { currentUser } = useStore();
  const { role } = useUserRole();

  const marketCenterId = currentUser?.marketCenterId;
  const canRotate = role === "ADMIN";
  // The backend denies these roles anyway; hiding the card avoids firing a
  // request that can only fail and surfacing an error toast for it.
  const canViewJoinCode = role === "ADMIN" || role === "STAFF_LEADER";

  const [formattedCode, setFormattedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  // Read client-side only: window is undefined during SSR. Admins need to see
  // the destination, not just the code -- a code read out over the phone or
  // pasted into a newsletter is useless on its own.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  // useAuth() can return a new getToken function identity on every render.
  // A ref lets the effect below call the latest getToken without taking a
  // dependency on its identity, so the effect only reruns when
  // marketCenterId/canViewJoinCode actually change.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!canViewJoinCode) return;
    // An ADMIN can pass the role gate with no market center -- a superuser, or
    // anyone whose market center was deleted (users.market_center_id is
    // ON DELETE SET NULL). Returning without clearing the flag leaves the card
    // spinning forever.
    if (!marketCenterId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const token = await getTokenRef.current();
        const response = await fetch(
          `${API_BASE}/marketCenters/${marketCenterId}/join-code`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Failed to load join code");
        const data = await response.json();
        if (cancelled) return;
        setFormattedCode(data.formattedCode);
      } catch {
        if (!cancelled) toast.error("Couldn't load the join code");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [marketCenterId, canViewJoinCode]);

  if (!canViewJoinCode) return null;

  async function rotate() {
    setIsRotating(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE}/marketCenters/${marketCenterId}/join-code/rotate`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to rotate");
      const data = await response.json();
      setFormattedCode(data.formattedCode);
      setIsConfirmingRotate(false);
      toast.success("New join code created. The old one no longer works.");
    } catch {
      toast.error("Couldn't rotate the join code");
    } finally {
      setIsRotating(false);
    }
  }

  async function copyLink() {
    const raw = (formattedCode ?? "").replace("-", "");
    const link = `${window.location.origin}/join?code=${raw}`;

    // navigator.clipboard is undefined outside a secure context, and writeText
    // rejects when permission is denied -- firing the success toast without
    // awaiting it told the admin a link was copied when nothing was.
    if (!navigator.clipboard?.writeText) {
      toast.error("Copying isn't available here. Share the code above instead.");
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Join link copied");
    } catch {
      toast.error("Couldn't copy the join link");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Agent join code
        </CardTitle>
        <CardDescription>
          Share this code with your agents so they can join for free. Agents
          don&apos;t use a paid seat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : !formattedCode ? (
          <p className="text-sm text-muted-foreground">
            No join code is available. Select a market center to manage its
            join code.
          </p>
        ) : (
          <>
            <p className="font-mono text-2xl tracking-widest">{formattedCode}</p>

            <p className="text-sm text-muted-foreground">
              Agents enter this at{" "}
              <span className="font-medium text-foreground">
                {origin}/join
              </span>
            </p>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy join link
              </Button>
              {canRotate && !isConfirmingRotate && (
                <Button
                  variant="outline"
                  onClick={() => setIsConfirmingRotate(true)}
                >
                  Rotate code
                </Button>
              )}
            </div>

            {isConfirmingRotate && (
              <Alert>
                <AlertDescription className="space-y-3">
                  <p>
                    The current code will stop working immediately. Any agent
                    who has it but hasn&apos;t joined yet will need the new one.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={rotate} disabled={isRotating}>
                      {isRotating ? "Rotating..." : "Rotate anyway"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setIsConfirmingRotate(false)}
                      disabled={isRotating}
                    >
                      Cancel
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
