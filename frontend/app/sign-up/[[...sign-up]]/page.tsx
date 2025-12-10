"use client";

import { SignUp, useAuth, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  status: string;
  marketCenterName: string;
  marketCenterId: string;
  inviterName: string;
  inviterEmail: string;
  expiresAt: string;
  isExpired: boolean;
}

interface InvitationResponse {
  invitation: InvitationDetails | null;
  valid: boolean;
  message?: string;
}

function SignUpContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!token);
  const [isAccepting, setIsAccepting] = useState(false);

  // Fetch invitation details if token is present
  useEffect(() => {
    if (token) {
      fetchInvitation(token);
    }
  }, [token]);

  // After user signs up with an invitation, accept the invitation
  useEffect(() => {
    if (isSignedIn && userId && token && invitation && !isAccepting) {
      acceptInvitation(token, userId);
    }
  }, [isSignedIn, userId, token, invitation, isAccepting]);

  async function fetchInvitation(token: string) {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invitations/${token}`
      );
      const data: InvitationResponse = await response.json();

      if (data.valid && data.invitation) {
        setInvitation(data.invitation);
      } else {
        setInvitationError(data.message || "Invalid invitation");
      }
    } catch (error) {
      setInvitationError("Failed to load invitation details");
    } finally {
      setIsLoading(false);
    }
  }

  async function acceptInvitation(token: string, clerkId: string) {
    setIsAccepting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invitations/${token}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clerkId }),
        }
      );

      if (response.ok) {
        // Successfully accepted - redirect to dashboard
        router.push("/dashboard");
      } else {
        const error = await response.json();
        setInvitationError(error.message || "Failed to accept invitation");
      }
    } catch (error) {
      setInvitationError("Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  }

  // Show loading state while checking invitation
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  // Show error if invitation is invalid
  if (token && invitationError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{invitationError}</p>
          <a
            href="/sign-up"
            className="inline-block bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
          >
            Sign up without invitation
          </a>
        </div>
      </div>
    );
  }

  // Show accepting state
  if (isAccepting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Show invitation details + signup form
  if (invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Invitation banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">
              You&apos;ve been invited!
            </h2>
            <p className="text-blue-800 text-sm mb-2">
              <strong>{invitation.inviterName}</strong> has invited you to join{" "}
              <strong>{invitation.marketCenterName}</strong> as a{" "}
              <strong>{invitation.role}</strong>.
            </p>
            <p className="text-blue-700 text-xs">
              Sign up with <strong>{invitation.email}</strong> to accept this
              invitation.
            </p>
          </div>

          {/* Clerk signup component */}
          <SignUp
            initialValues={{
              emailAddress: invitation.email,
            }}
            appearance={{
              elements: {
                formFieldInput__emailAddress: {
                  pointerEvents: "none",
                  backgroundColor: "#f3f4f6",
                },
              },
            }}
          />
        </div>
      </div>
    );
  }

  // Default signup without invitation
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
