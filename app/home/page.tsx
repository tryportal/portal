import { Navbar } from "@/components/navbar";
import { LandingPage } from "@/components/landing-page";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <LandingPage />
    </div>
  );
}
