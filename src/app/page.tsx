import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturedDestinations from "@/components/FeaturedDestinations";
import HowItWorks from "@/components/HowItWorks";
import FeaturedPackages from "@/components/FeaturedPackages";
import WhyUs from "@/components/WhyUs";
import Testimonials from "@/components/Testimonials";
import WhatsAppCTA from "@/components/WhatsAppCTA";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <FeaturedDestinations />
      <HowItWorks />
      <FeaturedPackages />
      <WhyUs />
      <Testimonials />
      <WhatsAppCTA />
      <Footer />
      <WhatsAppFloat />
    </main>
  );
}
