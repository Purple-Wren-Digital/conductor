import { auth0 } from "@/lib/auth0"; // Adjust path if your auth0 client is elsewhere

export default async function Home() {
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
    // User is authenticated
    // Sync up with Prisma backend if needed
    // This is a placeholder; implement actual sync logic as required
    console.log("User is authenticated:", session);
    // const prismaUser = await fetch("/api/auth/sync", {
    //   method: "POST",
    //   // headers: {
    //   //   "Content-Type": "application/json",
    //   //   Authorization: `Bearer ${process.env.SYNC_TOKEN}`,
    //   //   "x-auth0-signature": "computed-signature", // Replace with actual signature computation
    //   },
    //   body: JSON.stringify({
    //     user_id: session.user.sub,
    //     email: session.user.email,
    //     name: session.user.name,
    //   }),
    // }).then((res) => res.json());

    // console.log("Synced user:", prismaUser);
  }

  return (
    <main>
      <h1>Welcome, {session.user.name}!</h1>
    </main>
  );
}
