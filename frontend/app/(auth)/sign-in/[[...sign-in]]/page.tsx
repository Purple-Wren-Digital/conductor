import { redirect } from "next/navigation";

/**
 * This page redirects to Auth0 login.
 * Auth0 handles the authentication flow through /api/auth/login
 */
export default function SignInPage() {
	redirect("/auth/login");
}
