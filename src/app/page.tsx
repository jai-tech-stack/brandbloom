import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { WhatYouGet } from "@/components/WhatYouGet";
import { Gallery } from "@/components/Gallery";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <HowItWorks />
      <WhatYouGet />
      <Gallery />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
