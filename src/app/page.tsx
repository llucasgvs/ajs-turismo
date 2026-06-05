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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getPublicTemplates() {
  try {
    const res = await fetch(`${API}/templates/public`, {
      next: { revalidate: 60 }, // ISR: regenera a cada 60s no servidor
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Home() {
  const templates = await getPublicTemplates();

  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <FeaturedDestinations templates={templates} />
      <HowItWorks />
      <FeaturedPackages templates={templates} />
      <WhyUs />
      <Testimonials />
      <WhatsAppCTA />
      <Footer />
      <WhatsAppFloat />
    </main>
  );
}
