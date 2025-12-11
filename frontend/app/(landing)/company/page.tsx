import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function FeaturesPage() {
  return (
    <main className="container">
      <div className="flex flex-col items-center py-12">
        <h1 className="text-3xl font-bold mb-4 text-[#4B1D22]">About us</h1>
        <p className="font-medium text-muted-foreground">
          Get to know us better and learn more about our mission and values
        </p>
      </div>
      <section className="space-y-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-[#6D1C24] text-center ">
          Our Mission
        </h2>
        <p className="text-muted-foreground font-medium">
          Founded by a team of passionate professionals, we understand the
          challenges faced by support teams in today&apos;s fast-paced world.
          That&apos;s why we&apos;ve developed a platform that not only
          simplifies ticket management but also enhances collaboration and
          communication among team members.
        </p>
        <p className="text-muted-foreground font-medium">
          Conductor is a streamlined operations platform built specifically for
          real estate brokerages. It gives agents a simple way to submit
          requests—and provides staff with the tools they need to manage, track,
          and resolve those requests efficiently.
        </p>
        <p className="text-muted-foreground font-medium">
          We designed Conductor to eliminate the confusion of scattered emails,
          text threads, and missed messages. With organized ticketing, real-time
          updates, and clear communication, brokerages can run smoother, respond
          faster, and deliver a better experience to their agents.
        </p>
      </section>
      <Separator className="my-12 w-[50%]" />
      <section className="space-y-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-[#6D1C24] text-center">
          Our Values
        </h2>
        <ul className="list-inside space-y-4 text-muted-foreground font-medium">
          <li>
            <strong>Integrity:</strong> We believe in honesty, transparency, and
            ethical practices in all our interactions.
          </li>
          <li>
            <strong>Innovation:</strong> We are committed to continuous
            improvement and leveraging the latest technology to enhance our
            platform.
          </li>
          <li>
            <strong>Customer-Centricity:</strong> Our customers are at the core
            of everything we do. We strive to understand their needs and exceed
            their expectations.
          </li>
          <li>
            <strong>Collaboration:</strong> We foster a culture of teamwork and
            open communication to achieve shared goals.
          </li>
          <li>
            <strong>Excellence:</strong> We are dedicated to delivering high
            -quality solutions and services that drive success for our clients.
          </li>
        </ul>
      </section>
    </main>
  );
}
