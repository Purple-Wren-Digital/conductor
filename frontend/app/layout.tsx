import { cn } from "@/lib/cn";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryClientProvider } from "./query-client-provider";
import StoreProvider from "./store-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Encore.ts SaaS Starter",
    default: "Conductor Ticketing",
  },
  description:
    "An SaaS Starter template using Encore.ts, Nextjs, Auth0, Stripe, Tailwind and shadcn/ui.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn("antialiased", geistSans.variable, geistMono.variable)}
      >
        <Auth0Provider>
          <StoreProvider>
            <Toaster />
            <QueryClientProvider>{children}</QueryClientProvider>
          </StoreProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
