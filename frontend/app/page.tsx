import { BackToTop } from "@/components/layout/BackToTop";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { SkipLink } from "@/components/layout/SkipLink";
import ArchitectureSection from "@/components/ArchitectureSection";
import Footer from "@/components/Footer";
import { CorpusStats } from "@/components/landing/CorpusStats";
import { Explainability } from "@/components/landing/Explainability";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Perspectives } from "@/components/landing/Perspectives";
import { Problem } from "@/components/landing/Problem";

export default function Home() {
  return (
    <>
      <div id="top" />
      <SkipLink />
      <ScrollProgress />
      <Navbar />
      <main id="main" className="flex flex-col">
        <Hero />
        <CorpusStats />
        <Problem />
        <HowItWorks />
        <Perspectives />
        <Explainability />
        <ArchitectureSection />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
