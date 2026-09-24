"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, SignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api/utils";

const INVALID_MESSAGE =
  "That join code isn't valid. Check it with your market center.";

function normalize(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function format(input: string): string {
  const raw = normalize(input).slice(0, 8);
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

export function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, getToken } = useAuth();

  const [code, setCode] = useState(() => format(searchParams.get("code") ?? ""));
  const [marketCenterName, setMarketCenterName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // A link carrying ?code= should land on the confirmation step, not a blank form.
  useEffect(() => {
    const fromQuery = searchParams.get("code");
    if (fromQuery) setCode(format(fromQuery));
  }, [searchParams]);

  async function resolveCode() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/join-codes/${normalize(code)}`);
      const data = await response.json();
      if (data?.valid) {
        setMarketCenterName(data.marketCenterName);
      } else {
        setError(INVALID_MESSAGE);
      }
    } catch {
      setError("Couldn't check that code. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function join() {
    setIsBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE}/join-codes/${normalize(code)}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        router.push("/dashboard");
        return;
      }
      const body = await response.json();
      setError(body?.message ?? INVALID_MESSAGE);
    } catch {
      setError("Couldn't join right now. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Join your market center</h1>
        <p className="text-sm text-muted-foreground">
          Enter the join code from your market center. Agents join for free.
        </p>
      </div>

      {!marketCenterName ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-code">Join code</Label>
            <Input
              id="join-code"
              value={code}
              onChange={(event) => setCode(format(event.target.value))}
              placeholder="K7M4-2XQP"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <Button
            onClick={resolveCode}
            disabled={isBusy || normalize(code).length < 8}
            className="w-full"
          >
            Continue
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">You&apos;re joining</p>
            <p className="text-lg font-semibold">{marketCenterName}</p>
          </div>

          {isSignedIn ? (
            <Button onClick={join} disabled={isBusy} className="w-full">
              Join market center
            </Button>
          ) : (
            <SignUp
              forceRedirectUrl={`/join?code=${normalize(code)}`}
              signInForceRedirectUrl={`/join?code=${normalize(code)}`}
            />
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setMarketCenterName(null)}
            disabled={isBusy}
          >
            Use a different code
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/pricing" className="underline">
          Setting up a new market center?
        </Link>
      </p>
    </div>
  );
}
