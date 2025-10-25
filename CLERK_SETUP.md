# Clerk Authentication Setup Guide

## Overview

Auth0 has been replaced with **Clerk** for authentication. Clerk is much simpler and provides built-in React components for authentication.

## Setup Steps

### 1. Create a Clerk Account

1. Go to https://clerk.com and sign up
2. Create a new application
3. Choose "Next.js" as your framework

### 2. Get Your API Keys

From your Clerk Dashboard:

1. Go to **API Keys** in the sidebar
2. Copy your **Publishable Key** and **Secret Key**
3. Update your `frontend/.env` file:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_here

# Clerk Routes (optional, these are the defaults)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### 3. Configure Clerk URLs

In your Clerk Dashboard → **Paths**:

- **Sign-in URL**: `/sign-in`
- **Sign-up URL**: `/sign-up`
- **After sign-in URL**: `/dashboard`
- **After sign-up URL**: `/dashboard`

In your Clerk Dashboard → **Domains** (for production):

- Add your production domain
- Add your Vercel preview domains (e.g., `*.vercel.app`)

### 4. Test Authentication

1. Start your dev server: `cd frontend && pnpm dev`
2. Visit `http://localhost:3000`
3. Click "Sign up" - you should see Clerk's signup modal
4. Create an account
5. You should be redirected to `/dashboard`

## How It Works

### Frontend

- **Root Layout** (`app/layout.tsx`): Wrapped with `<ClerkProvider>`
- **Sign In** (`app/sign-in/[[...sign-in]]/page.tsx`): Clerk's `<SignIn />` component
- **Sign Up** (`app/sign-up/[[...sign-up]]/page.tsx`): Clerk's `<SignUp />` component
- **Header** (`app/(landing)/header.tsx`): Uses `useUser()`, `<SignInButton>`, `<SignUpButton>`, `<UserButton>`
- **Dashboard Layout** (`app/dashboard/layout.tsx`): Uses `useUser()` and `<UserButton>`
- **Middleware** (`middleware.ts`): Protects routes with `clerkMiddleware()`

### Backend

- **Auth Handler** (`backend/auth/auth.ts`): Simplified to accept Clerk user IDs
- **User Context** (`backend/auth/user-context.ts`): Auto-creates users on first login

## User Flow

1. User clicks "Sign up" or "Sign in"
2. Clerk modal appears (or redirects to Clerk pages)
3. User authenticates with Clerk
4. Frontend gets Clerk user object with `useUser()`
5. Frontend calls backend `/users/me` with Clerk user ID
6. Backend `getUserContext()` auto-creates user in database if doesn't exist
7. User data is stored in Zustand store
8. User can access dashboard

## Important Notes

### Current Implementation

⚠️ **TEMPORARY**: The backend currently accepts Clerk user IDs directly as "tokens" for simplicity.

### Production TODO

For production, you should implement proper JWT verification:

1. Install `@clerk/backend` in your backend
2. Verify JWTs using Clerk's JWKS endpoint
3. Update `backend/auth/auth.ts` to verify tokens properly

Example:
```typescript
import { clerkClient } from '@clerk/clerk-sdk-node';

// Verify JWT properly
const verified = await clerkClient.verifyToken(token);
```

## Migration Notes

### Removed

- All Auth0 packages and dependencies
- `app/auth/*` routes (login/logout/callback)
- `app/api/auth/*` API routes
- `lib/auth0.ts` configuration
- Auth0 environment variables
- `auth0` npm package

### Added

- `@clerk/nextjs` package
- Clerk environment variables
- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`
- Simplified middleware with `clerkMiddleware()`

## Troubleshooting

### "Missing Publishable Key" Error

Make sure your `.env` file has:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Note the `NEXT_PUBLIC_` prefix is required!

### Users Not Being Created

Check backend logs for errors in `getUserContext()`. The user should be auto-created on first login.

### Redirect Loops

Make sure your middleware.ts has the correct public routes:
```typescript
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/company",
  "/pricing",
]);
```

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Components](https://clerk.com/docs/components/overview)
- [Clerk Backend SDK](https://clerk.com/docs/references/backend/overview)
