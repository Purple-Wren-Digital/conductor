import NewUserOnBoarding from "@/components/onboarding/new-user-onboarding";
import { auth0 } from "@/lib/auth0"; // Adjust path if your auth0 client is elsewhere


export default async function Onboarding() {
  const session = await auth0.getSession();

  if (!session) {
    return (
      <main>
        <a href="/auth/login?screen_hint=signup">Sign up</a>
        <a href="/auth/login">Log in</a>
      </main>
    );
  }

  if (session) {
    // Try to find user from prisma
    // If user not found in prisma with Auth0 Id, then go to sign up page
    // If user found, navigate to dashboard
  }

  return (
  // This will create the prisma user
 <NewUserOnBoarding /> 
  );
}
