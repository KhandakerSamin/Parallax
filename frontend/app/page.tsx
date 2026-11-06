import { BackToTop } from "@/components/layout/BackToTop";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { SkipLink } from "@/components/layout/SkipLink";
import { CorpusStats } from "@/components/landing/CorpusStats";
import { Explainability } from "@/components/landing/Explainability";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Multilingual } from "@/components/landing/Multilingual";
import { Perspectives } from "@/components/landing/Perspectives";
import { Problem } from "@/components/landing/Problem";
import { Research } from "@/components/landing/Research";
import { Responsible } from "@/components/landing/Responsible";
import { Roles } from "@/components/landing/Roles";

export default function Home() {
  return (
    <>
      <div id="top" />
      <SkipLink />
      <Navbar />
      <main id="main" className="flex flex-col">
        <Hero />
        <CorpusStats />
        <Problem />
        <HowItWorks />
        <Perspectives />
        <Explainability />
        <Multilingual />
        <Roles />
        <Research />
        <Responsible />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
