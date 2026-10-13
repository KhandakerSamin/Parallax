"use client";

import { BookOpen, Brain, GitFork, Cpu, Zap, Layers } from "lucide-react";

export default function PerspectiveCards() {
  const perspectives = [
    {
      num: "01",
      title: "Lexical & Surface Matching",
      subtitle: "TF-IDF, Cosine & N-Gram Baseline",
      badge: "Vocabulary Overlap",
      icon: BookOpen,
      points: [
        "Identifies direct word-for-word string duplication",
        "Unicode-aware tokenization handling Bangla & English scripts",
        "Character n-gram overlap capturing morphological variations",
        "Serves as the empirical baseline against neural models"
      ]
    },
    {
      num: "02",
      title: "Multilingual Semantic Embeddings",
      subtitle: "LaBSE & paraphrase-multilingual-MiniLM",
      badge: "Cross-Lingual Vectors",
      icon: Brain,
      points: [
        "Maps Bangla, English, and Banglish into shared embedding space",
        "Captures paraphrasing where words differ but meanings align",
        "Chunk-based dense vector representations (300 words with overlap)",
        "Trained to resist translation-based obfuscation"
      ]
    },
    {
      num: "03",
      title: "Project Concept Fingerprinting",
      subtitle: "Domain, Problem, Method & Target User",
      badge: "Semantic Entities",
      icon: GitFork,
      points: [
        "Extracts structured conceptual tuples: [Problem, Method, Input, Output]",
        "Flags recycled capstone ideas masked by altered terminology",
        "Distinguishes novelty in methodology vs novelty in domain",
        "Assists faculty reviewers with high-level conceptual mapping"
      ]
    },
    {
      num: "04",
      title: "Structural & System Architecture",
      subtitle: "Topology & Component Organization",
      badge: "System Graph Matching",
      icon: Cpu,
      points: [
        "Analyzes System Architecture section and module graphs",
        "Identifies component copying (e.g. Gateway, Microservice, DB)",
        "Inspects section sequencing (Objectives, Methodology, Results)",
        "Uncovers boilerplate architecture re-submissions"
      ]
    }
  ];

  return (
    <section id="perspectives" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5" />
            The 4 Analytical Pillars
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            How Parallax Evaluates Documents
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
            Rather than relying on a single fallible score, Parallax cross-references 
            four distinct analytical dimensions to deliver robust, defensible insights.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {perspectives.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.num}
                className="p-8 rounded-2xl glass-panel glass-panel-hover transition-all duration-300 relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-inner">
                        <Icon className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-500 tracking-wider">PILLAR {p.num}</span>
                        <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {p.title}
                        </h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300">
                      {p.badge}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-slate-400 mb-6 italic">
                    {p.subtitle}
                  </p>

                  <ul className="space-y-2.5">
                    {p.points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-cyan-400 font-medium">
                    <Zap className="w-3.5 h-3.5" />
                    Real-time Pipeline Ready
                  </span>
                  <span className="text-slate-500 font-mono">Weight: 20-35%</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
