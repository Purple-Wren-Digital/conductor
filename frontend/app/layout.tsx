import { cn } from "@/lib/cn";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryClientProvider } from "@/context/query-client-provider";
import { StoreProvider } from "@/context/store-provider";
import { Toaster } from "@/components/ui/sonner";
import conductorLogo from "@/public/conductoricon.png";

import "./globals.css";

const keywords = [
  "conductor",
  "conductor app",
  "conductor ticketing",
  "conductor support platform",
  "real estate ticketing system",
  "real estate support system",
  "brokerage ticketing",
  "agent support system",
  "internal ticketing system",
  "real estate agents",
  "real estate brokerage",
  "realtor tools",
  "real estate operations",
  "real estate support",
  "brokerage operations platform",
  "real estate productivity tools",
  "ticket submission",
  "ticket tracking",
  "issue tracking",
  "support tickets",
  "task management",
  "workflow management",
  "agent assistance",
  "ticket resolution",
  "communication tools",
  "streamline operations",
  "agent efficiency",
  "faster support",
  "staff productivity",
  "workflow automation",
  "simplify agent requests",
  "centralized communication",
  "brokerage management",
  "agent onboarding support",
  "listing support",
  "transaction support",
  "MLS updates",
  "compliance support",
  "marketing requests",
  "admin requests",
  "nextjs app",
  "react support tool",
  "encore backend",
  "prisma backend",
  "notification system",
  "modern ticketing platform",
];

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Conductor Ticketing",
  description: "Agent Ticketing System",
  keywords: keywords.join(","),
  viewport: "width=device-width, initial-scale=1",
  icons: {
    icon: "favicon.ico",
  },
  openGraph: {
    title: "Conductor Ticketing",
    description: "Agent support system",
    images: [
      {
        url: conductorLogo.src,
        alt: "Conductor Ticketing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Conductor Ticketing",
    description: "Agent Ticketing System",
    images: [conductorLogo.src],
  },
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
