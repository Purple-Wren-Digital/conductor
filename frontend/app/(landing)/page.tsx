import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

import img1 from "./assets/matt-hardison-Z63xuEskzXs-unsplash.jpg"; // "./img1.jpg";
import img2 from "./assets/dillon-kydd-XGvwt544g8k-unsplash.jpg"; //"./img2.jpg";
import img3 from "./assets/phil-hearing-IYfp2Ixe9nM-unsplash.jpg"; //"./img3.jpg";
import img4 from "./assets/todd-kent-178j8tJrNlc-unsplash.jpg"; //"./img4.jpg";

export default async function Home() {
  return (
    <div className="container">
      <section className="py-12 md:py-20">
        <div className="container">
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <div className="flex-1">
              <div className="flex flex-col gap-4 lg:gap-8">
                <h1 className="max-w-[80%] text-4xl leading-tight font-semibold text-foreground lg:text-5xl xl:text-7xl">
                  Conductor Ticketing
                </h1>
                <p className="text-lg leading-relaxed text-muted-foreground xl:text-2xl">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Pellentesque vitae pharetra risus, non laoreet lorem.
                </p>
              </div>
              <div className="my-6 lg:my-10">
                <Button asChild size="lg">
                  <Link href="/pricing">Get Started</Link>
                </Button>
              </div>
            </div>

            <div className="w-full flex-1">
              <div className="w-full max-w-[50rem]">
                <AspectRatio ratio={1 / 1} className="h-full w-full">
                  <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[3.5%]">
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
                  </div>
                </AspectRatio>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
