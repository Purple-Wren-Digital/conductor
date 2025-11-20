import { Footer } from "@/components/ui/footer";
import { Header } from "./header";

export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div>
      <Header />
      {children}
      <Footer />
    </div>
  );
}
