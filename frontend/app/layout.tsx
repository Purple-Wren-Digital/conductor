import { cn } from "@/lib/cn";
import { ClerkProvider } from "@clerk/nextjs";
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
    template: "%s | Conductor Ticketing",
    default: "Conductor Ticketing",
  },
  description:
    "A ticket management system using Encore.ts, Next.js, Clerk, Tailwind and shadcn/ui.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={cn("antialiased", geistSans.variable, geistMono.variable)}
        >
          <StoreProvider>
            <Toaster />
            <QueryClientProvider>{children}</QueryClientProvider>
          </StoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
