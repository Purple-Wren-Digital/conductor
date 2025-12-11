"use client";
import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export default function HelpPage() {
  return (
    <main className="container">
      <div className="flex flex-col py-12 space-y-6">
        <h1 className="text-3xl font-bold mb-4 text-[#4B1D22]">Need Help?</h1>
        <p className="font-medium text-muted-foreground">
          Find answers to common questions and get support for any issues you
          may encounter.
        </p>
        <Link
          passHref
          href="mailto:tony@conductorticket.com?subject=Client%20Support%20Inquiry"
        >
          <Button asChild className="bg-[#4B1D22] hover:bg-[#6D1C24] border-0">
            Contact Us
          </Button>
        </Link>
        <section className="space-y-6">
          <h2 className="text-2xl font-bold mb-4 text-[#6D1C24] text-left">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is Conductor?</AccordionTrigger>
              <AccordionContent>
                Conductor is a ticketing system that helps real estate agents
                submit requests to brokerage staff
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>
                Is there a mobile app for Conductor?
              </AccordionTrigger>
              <AccordionContent>
                Currently, Conductor is optimized only for web browsers. You can
                access all features and functionalities directly from your
                smartphone or tablet without downloading a separate app.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>How do I submit a ticket? </AccordionTrigger>
              <AccordionContent>
                Log in, click &quot;Create Ticket,&quot; choose a category, add
                details or attachments, and hit &quot;Submit.&quot; That&apos;s
                it—your ticket is instantly routed to the right staff member.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>
                How will I know when my ticket is updated?
              </AccordionTrigger>
              <AccordionContent>
                You&apos;ll get real-time notifications for new comments, status
                changes, assignments, and resolutions—either in-app or by email,
                depending on your settings.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>
                Can I track all my open tickets?
              </AccordionTrigger>
              <AccordionContent>
                Yes. Your dashboard shows every ticket you&apos;ve submitted,
                along with status, timestamps, and responses.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6">
              <AccordionTrigger>
                Can staff assign or reassign tickets?
              </AccordionTrigger>
              <AccordionContent>
                Absolutely. Staff can assign, update, escalate, or close tickets
                within their assigned Market Center directly from their
                dashboard.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-7">
              <AccordionTrigger>
                Can I upload files or screenshots?
              </AccordionTrigger>
              <AccordionContent>
                Yes—tickets support attachments to help staff resolve your
                request faster.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-8">
              <AccordionTrigger>
                How do admins manage the system?
              </AccordionTrigger>
              <AccordionContent>
                Admins can view all tickets, customize categories, edit
                notification templates, track performance, and manage staff
                access.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-9">
              <AccordionTrigger>
                Can Conductor accommodate management for multiple Market
                Centers?
              </AccordionTrigger>
              <AccordionContent>
                You must be subscribed to the Enterprise plan to manage multiple
                Market Centers.{" "}
                <Link
                  href="mailto:tony@conductorticket.com?subject=Enterprise%20Inquiry"
                  className="underline"
                >
                  Contact us
                </Link>{" "}
                to upgrade your account or learn more on the{" "}
                <Link href="/pricing" className=" underline">
                  Pricing page
                </Link>
                .
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-10">
              <AccordionTrigger>
                Who do I contact if I need more help?
              </AccordionTrigger>
              <AccordionContent>
                Check with your brokerage&apos;s internal support team first. If
                they cannot assist you, reach out through the Contact button
                above.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </main>
  );
}
