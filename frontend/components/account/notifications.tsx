"use client";

import { useStore } from "@/app/store-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { AccordionHeader } from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";

export default function Notifications() {
  const { currentUser } = useStore();
  const { role, permissions } = useUserRole();

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6">
      {/* NOTIFICATIONS */}
      <div className="lg:col-span-3">
        <Card className="flex flex-col gap-2">
          <CardHeader>
            <CardTitle className="text-lg">Notification Settings</CardTitle>
            <CardDescription>
              Choose what you want to hear about and how you want to hear about
              it
            </CardDescription>
            <Separator className="my-4" />
          </CardHeader>

          <CardContent className="space-y-6">
            <Accordion type="single" collapsible>
              <AccordionItem value={"comment-notifications"}>
                <AccordionHeader>
                  <AccordionTrigger>Comments</AccordionTrigger>
                </AccordionHeader>
                <AccordionContent className="space-y-2 px-4">
                  <div className="flex items-center justify-between">
                    <p>Email</p>
                    <Switch id="emailNotifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <p>Push</p>
                    <Switch id="emailNotifications" disabled />
                  </div>
                  {/* <div className="flex items-center justify-between">
                    <p className="font-semibold">Email</p>
                    <Switch id="emailNotifications" defaultChecked />
                  </div> */}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible>
              <AccordionItem value={"comment-notifications"}>
                <AccordionHeader>
                  <AccordionTrigger>Ticket Assignment</AccordionTrigger>
                </AccordionHeader>
                <AccordionContent className="space-y-2 px-4">
                  <div className="flex items-center justify-between">
                    <p>Email</p>
                    <Switch id="emailNotifications" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <p>Push</p>
                    <Switch id="emailNotifications" disabled />
                  </div>
                  {/* <div className="flex items-center justify-between">
                    <p className="font-semibold">Email</p>
                    <Switch id="emailNotifications" defaultChecked />
                  </div> */}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
