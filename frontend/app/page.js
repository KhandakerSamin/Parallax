import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import InteractiveAnalyzer from "../components/InteractiveAnalyzer";
import PerspectiveCards from "../components/PerspectiveCards";
import CorpusSection from "../components/CorpusSection";
import ArchitectureSection from "../components/ArchitectureSection";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <Hero />

        {/* Interactive Live Analyzer Sandbox */}
        <InteractiveAnalyzer />

        {/* 4 Analytical Perspectives Breakdown */}
        <PerspectiveCards />

        {/* DIU DSpace Corpus & Ingestion Pipeline */}
        <CorpusSection />

        {/* 3-Tier Microservice Architecture & RBAC */}
        <ArchitectureSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
