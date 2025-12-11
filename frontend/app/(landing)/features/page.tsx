import {
  Archive,
  Bell,
  ChartNoAxesCombined,
  FilePenLine,
  MessageSquare,
  Search,
  Tags,
  Ticket,
  Users,
} from "lucide-react";

export default function FeaturesPage() {
  return (
    <main className="container">
      <div className="flex flex-col items-center py-12">
        <h1 className="text-4xl font-bold mb-4 text-[#4B1D22]">
          Core Features
        </h1>
        <p className="text-lg font-medium text-muted-foreground">
          Discover the powerful features that make Conductor Ticketing the
          ultimate solution for your needs
        </p>
      </div>
      <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h2 className="text-lg md:text-xl font-semibold  text-[#6D1C24]">
              Streamlined Ticket Submission
            </h2>
            <Ticket className="size-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            Agents submit requests in seconds with a simple, intuitive form—no
            emails, no chaos, just clarity
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-[#6D1C24]">
              Real-Time Notifications
            </h2>
            <Bell className="size-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            Tickets route directly to the right team member so nothing gets lost
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-[#6D1C24]">
              Performance Insights
            </h2>
            <ChartNoAxesCombined className="size-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            Agents and staff receive instant updates when a ticket is assigned,
            updated, and resolved
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-[#6D1C24]">
              Organized Categories
            </h2>
            <Tags className="size-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            Structured ticket categories keep everything tidy—marketing, MLS,
            compliance, tech issues, and more—all easy to filter and search
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-[#6D1C24]">
              Role-Based Access
            </h2>
            <Users className="size-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            Agents, staff, and admins each get a tailored dashboard with
            everything they need—and nothing they don&apos;t
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-[#6D1C24]">
              Attachments & Details
            </h2>
            <Archive className="size-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            Submit files, screenshots, or property details directly with a
            ticket for faster resolution
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-[#6D1C24]">
              Smart Search & Filters
            </h2>
            <Search className="size-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            Quickly find any past or current ticket by keyword, category,
            status, or agent
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-[#6D1C24]">
              In-App Communication
            </h2>
            <MessageSquare className="size-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            Comment threads keep communication in one place—no messy email
            chains
          </p>
        </div>
        <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-[#6D1C24]">
              In-App Notification Templates
            </h2>
            <FilePenLine className="size-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            Admins can tailor in-app and email notification messages to match
            the brokerage&apos;s tone, branding, and workflows.
          </p>
        </div>
      </section>
    </main>
  );
}
