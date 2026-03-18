import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import LogosSection from "@/components/landing/LogosSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <LogosSection />
      <BenefitsSection />
      <div id="depoimentos">
        <TestimonialsSection />
      </div>
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
