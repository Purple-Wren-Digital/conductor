import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import conductorLogo from "@/app/(landing)/assets/conductor/Conductor Logo_Full Color.png";

// import img1 from "@/app/(landing)/assets/placeholder/matt-hardison-unsplash.jpg";
// import img2 from "@/app/(landing)/assets/placeholder/dillon-kydd-unsplash.jpg";
// import img3 from "@/app/(landing)/assets/placeholder/phil-hearing-unsplash.jpg";
// import img4 from "@/app/(landing)/assets/placeholder/todd-kent-unsplash.jpg";

export default async function Home() {
  return (
    <div className="container">
      <section className="py-12 md:py-20">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex-1">
              <div className="flex flex-col gap-4 lg:gap-8">
                <h1 className="max-w-[80%] text-4xl leading-tight font-semibold text-[#6D1C24] lg:text-5xl xl:text-7xl capitalize">
                  Conductor Ticketing
                </h1>
                <p className="text-lg leading-relaxed text-muted-foreground xl:text-2xl">
                  Agent support system, reimagined. Streamline your management
                  and empower your team with Conductor.
                </p>
              </div>
              <div className="my-6 lg:my-10">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#404042] hover:opacity-50"
                >
                  <Link href="/pricing">Get Started</Link>
                </Button>
              </div>
            </div>

            <div className="w-full flex-1">
              <div className="w-full max-w-[50rem]">
                <AspectRatio ratio={1 / 1} className="size-full mx-auto">
                  <Image
                    src={conductorLogo}
                    alt=""
                    className="object-contain h-full w-full"
                  />
                  {/* <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[3.5%]">
                    <div className="overflow-hidden rounded-[5.2%] border border-muted bg-muted">
                      <Image
                        src={img1}
                        alt=""
                        className="object-cover h-full w-full object-center"
                      />
                    </div>
                    <div className="relative overflow-hidden rounded-[5.2%] border border-muted bg-muted">
                      <Image
                        src={img2}
                        alt=""
                        className="object-cover h-full w-full object-center"
                      />
                    </div>
                    <div className="relative overflow-hidden rounded-[5.2%] border border-muted bg-muted">
                      <Image
                        src={img3}
                        alt=""
                        className="object-cover h-full w-full object-center"
                      />
                    </div>
                    <div className="relative overflow-hidden rounded-[5.2%] border border-muted bg-muted">
                      <Image
                        src={img4}
                        alt=""
                        className="object-cover h-full w-full object-center"
                      />
                    </div>
                  </div> */}
                </AspectRatio>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
