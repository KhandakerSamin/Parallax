import { BackToTop } from "@/components/layout/BackToTop";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { SkipLink } from "@/components/layout/SkipLink";
import ArchitectureSection from "@/components/ArchitectureSection";
import Footer from "@/components/Footer";
import InteractiveAnalyzer from "@/components/InteractiveAnalyzer";
import PerspectiveCards from "@/components/PerspectiveCards";
import { CorpusStats } from "@/components/landing/CorpusStats";
import { Hero } from "@/components/landing/Hero";
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
        <InteractiveAnalyzer />
        <PerspectiveCards />
        <ArchitectureSection />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
