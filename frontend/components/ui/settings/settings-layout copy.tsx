"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs/base-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings,
  Tag,
  History,
  LogOut,
  Download,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import GeneralSettings from "./general-settings";
import TeamManagement from "./team/team-management";
import TicketCategories from "./ticket-categories";
import AuditLog from "./audit-log";
import ImportExport from "./import-export";
import { useStore } from "../../../app/store-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserRole } from "@/hooks/use-user-role";

// <div className="container mx-auto py-6">
//   <div className="mb-6">
//     <h1 className="text-3xl font-semibold">Market Center Settings</h1>
//     <p className="text-muted-foreground">
//       Manage your market center settings and team configuration
//     </p>
//   </div>

export default function SettingsLayout() {
  const router = useRouter();
  const { setCurrentUser } = useStore();
  const { role } = useUserRole();

  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "general";

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", newTab);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Market Center Settings</h1>
        <p className="text-muted-foreground">
          Manage your market center settings and team configuration
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          {role === "STAFF" && (
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Team
            </TabsTrigger>
          )}
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger
            value="import-export"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Import/Export
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="team">
          <TeamManagement />
        </TabsContent>

        <TabsContent value="categories">
          <TicketCategories />
        </TabsContent>

        <TabsContent value="import-export">
          <ImportExport />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLog />
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Sign out</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/auth/logout" onClick={() => setCurrentUser(null)}>
                  Sign out <LogOut className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
