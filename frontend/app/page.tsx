import { BackToTop } from "@/components/layout/BackToTop";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { SkipLink } from "@/components/layout/SkipLink";
import ArchitectureSection from "@/components/ArchitectureSection";
import CorpusSection from "@/components/CorpusSection";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import InteractiveAnalyzer from "@/components/InteractiveAnalyzer";
import PerspectiveCards from "@/components/PerspectiveCards";

export default function Home() {
  return (
    <>
      <div id="top" />
      <SkipLink />
      <ScrollProgress />
      <Navbar />
      <main id="main" className="flex flex-col">
        <Hero />
        <InteractiveAnalyzer />
        <PerspectiveCards />
        <CorpusSection />
        <ArchitectureSection />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
