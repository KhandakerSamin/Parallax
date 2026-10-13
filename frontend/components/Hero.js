"use client";

import { Sparkles, ArrowRight, Brain } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] sm:w-[900px] sm:h-[480px] bg-gradient-to-tr from-cyan-500/10 via-indigo-600/15 to-purple-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-medium mb-6 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>DIU SE 331 Capstone Project</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Bangla-English Academic Reuse Detection</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.12]">
            Detect Academic Reuse <br className="hidden sm:inline" />
            <span className="gradient-text">Beyond Shallow Words</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300/90 leading-relaxed max-w-3xl mx-auto font-normal">
            Traditional plagiarism checkers miss translated Bangla-English text, conceptual recycling, 
            and structural system copycats. <strong className="text-white font-semibold">Parallax</strong> combines 
            <span className="text-cyan-400 font-medium"> multilingual embeddings</span>, 
            <span className="text-indigo-400 font-medium"> project fingerprinting</span>, and 
            <span className="text-purple-400 font-medium"> architecture graph matching</span> to deliver transparent, 
            evidence-backed similarity reports.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#analyzer"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold shadow-xl shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Sparkles className="w-4 h-4" />
              Try Interactive Analyzer
              <ArrowRight className="w-4 h-4 ml-1" />
            </a>
            <a
              href="#perspectives"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Brain className="w-4 h-4 text-indigo-400" />
              Explore 4 Perspectives
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl glass-panel text-left">
            <div className="p-3 border-r border-slate-800/80 last:border-0">
              <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">1,020+</div>
              <div className="text-xs text-slate-400 mt-0.5">DIU DSpace Corpus Documents</div>
            </div>
            <div className="p-3 border-r border-slate-800/80 last:border-0">
              <div className="text-2xl sm:text-3xl font-bold text-cyan-400 tracking-tight">4 Engine</div>
              <div className="text-xs text-slate-400 mt-0.5">Hybrid Analytical Perspectives</div>
            </div>
            <div className="p-3 border-r border-slate-800/80 last:border-0">
              <div className="text-2xl sm:text-3xl font-bold text-indigo-400 tracking-tight">&lt; 3.0s</div>
              <div className="text-xs text-slate-400 mt-0.5">FAISS High-Speed Vector Retrieval</div>
            </div>
            <div className="p-3">
              <div className="text-2xl sm:text-3xl font-bold text-purple-400 tracking-tight">100%</div>
              <div className="text-xs text-slate-400 mt-0.5">Explainable Evidence Breakdown</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
