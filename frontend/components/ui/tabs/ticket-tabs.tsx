"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Ticket as TicketIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs/base-tabs";

export function TicketTabs() {
  const pathname = usePathname();
  const inTickets = pathname.startsWith("/dashboard/tickets") || pathname === "/tickets";
  const current = inTickets ? "tickets" : "overview";

  return (
    <Tabs value={current} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview" asChild>
          <Link href="/dashboard" className="gap-2 flex items-center">
            <BarChart3 className="h-4 w-4" />
            Overview
          </Link>
        </TabsTrigger>
        <TabsTrigger value="tickets" asChild>
          <Link href="/dashboard/tickets" className="gap-2 flex items-center">
            <TicketIcon className="h-4 w-4" />
            Tickets
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
