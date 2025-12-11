import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { plans } from "@/lib/plans";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="container">
      <div className="flex flex-col items-center py-12">
        <h1 className="text-3xl font-bold mb-4 text-[#4B1D22]">Pricing</h1>
        <p className="font-medium text-muted-foreground">
          Simple, transparent pricing for your market center
        </p>
      </div>

      <div className="flex gap-4 justify-center items-stretch">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative group ${
              "popular" in plan && plan.popular
                ? " border-primary border-2"
                : ""
            }`}
          >
            {"popular" in plan && plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 font-bold">
                Limited Time
              </Badge>
            )}
            <Link
              href={
                plan.monthlyPrice === null
                  ? "mailto:tony@conductorticket.com?subject=Enterprise%20Inquiry"
                  : "/dashboard/subscription"
              }
              className="absolute inset-0"
            />

            <CardHeader className="min-w-60">
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                {plan.monthlyPrice !== null ? (
                  <>
                    <span className="text-4xl font-semibold text-[#6D1C24]">
                      ${plan.monthlyPrice}
                    </span>{" "}
                    / month
                  </>
                ) : (
                  <span className="text-2xl font-semibold text-[#6D1C24]">
                    Contact us
                  </span>
                )}
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.description}
              </p>
            </CardHeader>

            <CardContent className="grow">
              <p className="mb-4 font-medium">Includes</p>
              <ul className="text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="size-4 mr-2 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="flex justify-center gap-2 group-hover:underline text-[#6D1C24]">
              {plan.monthlyPrice !== null ? (
                <>
                  Get started <ArrowRight className="size-4" />
                </>
              ) : (
                <>
                  Contact sales <ArrowRight className="size-4" />
                </>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </main>
  );
}
