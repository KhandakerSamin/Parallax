"use client";

import { useState, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from "recharts";
import { 
  Sparkles, Sliders, AlertTriangle, CheckCircle, FileText, 
  HelpCircle, ChevronRight, RefreshCw, Eye 
} from "lucide-react";

const SCENARIOS = [
  {
    id: "cross-lingual",
    name: "Bangla-English Cross-Lingual Reuse",
    tag: "Translation & Paraphrasing",
    sourceType: "Thesis Proposal (SE 331)",
    matchedTitle: "ডিপ লার্নিং ফেস এমবেডিং ভিত্তিক স্বয়ংক্রিয় উপস্থিতি ব্যবস্থাপনা (DIU DSpace #2419)",
    matchedYear: "2023",
    submissionSnippet: 
      "We propose an automated attendance system using deep learning face embeddings via MobileNetV2 and real-time webcam frame processing with SQLite storage and attendance reporting.",
    corpusSnippet: 
      "আমরা ডিপ লার্নিং ফেস এমবেডিং এবং MobileNetV2 ব্যবহার করে রিয়েল-টাইম ওয়েবক্যাম ফ্রেম প্রক্রিয়াকরণ ও SQLite ডেটাবেজ যুক্ত একটি স্বয়ংক্রিয় ছাত্র উপস্থিতি শনাক্তকরণ পদ্ধতি প্রস্তুত করেছি।",
    lexical: 12,
    semantic: 91,
    concept: 86,
    structural: 78,
    explanation:
      "Lexical/word matching fails (12%) because the source is Bangla and submission is English. However, LaBSE multilingual embeddings discover 91% semantic equivalence, and fingerprint extraction reveals identical Problem, Model (MobileNetV2), and Data Storage pipelines.",
    evidencePoints: [
      "Exact algorithmic pipeline translated from Bangla to English",
      "Shared model architecture: MobileNetV2 with webcam ingestion",
      "Identical database schema target: SQLite attendance logging"
    ]
  },
  {
    id: "architecture",
    name: "Architectural & Structural Copying",
    tag: "Design Pattern Reuse",
    sourceType: "Capstone Final Report",
    matchedTitle: "Distributed Microservices Framework for Multi-Vendor Retail (DIU DSpace #1842)",
    matchedYear: "2022",
    submissionSnippet: 
      "Our medicine delivery platform deploys a Next.js client, an Express API gateway, asynchronous RabbitMQ message queue, Redis session cache, and PostgreSQL orders storage.",
    corpusSnippet: 
      "The proposed grocery platform architecture features a React web client, an Express API gateway, RabbitMQ event bus for dispatching tasks, Redis caching, and PostgreSQL database.",
    lexical: 34,
    semantic: 68,
    concept: 62,
    structural: 94,
    explanation:
      "While the domain wording shifts from 'grocery' to 'medicine', the system architecture fingerprint is a 94% clone: identical gateway orchestration, message broker, caching tier, and relational storage topology.",
    evidencePoints: [
      "Component-for-component architectural topology match (94%)",
      "Identical messaging pipeline (RabbitMQ event bus pattern)",
      "Unmodified state management and caching tier (Redis + Postgres)"
    ]
  },
  {
    id: "original",
    name: "Novel & Distinct Academic Work",
    tag: "Genuine Research",
    sourceType: "Research Project Proposal",
    matchedTitle: "Acoustic Sensor Mesh for Urban Traffic Noise Monitoring in Dhaka (DIU DSpace #3105)",
    matchedYear: "2024",
    submissionSnippet: 
      "We investigate decentralized smart contracts on Ethereum to produce tamper-proof academic credentials and verifiable transcript verification for university registries.",
    corpusSnippet: 
      "This study deploys distributed low-cost microcontroller microphones across five major intersections in Dhaka to capture spatial acoustic decibel fluctuations.",
    lexical: 6,
    semantic: 14,
    concept: 8,
    structural: 11,
    explanation:
      "All four analytical perspectives show minimal overlap. The proposal uses unique domain concepts, cryptographic primitives, and blockchain architectural topologies.",
    evidencePoints: [
      "Zero conceptual intersection with indexed university reports",
      "Distinct cryptographic paradigm vs sensor telemetry",
      "Safe to approve for academic registration"
    ]
  }
];

export default function InteractiveAnalyzer() {
  const [selectedScenarioId, setSelectedScenarioId] = useState("cross-lingual");
  const [wLexical, setWLexical] = useState(0.20);
  const [wSemantic, setWSemantic] = useState(0.35);
  const [wConcept, setWConcept] = useState(0.25);
  const [wStructural, setWStructural] = useState(0.20);

  const currentScenario = useMemo(() => {
    return SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];
  }, [selectedScenarioId]);

  // Compute Hybrid Score: (w1*L + w2*S + w3*C + w4*A) / sum(w)
  const totalWeight = wLexical + wSemantic + wConcept + wStructural;
  const normalizedHybridScore = useMemo(() => {
    if (totalWeight <= 0) return 0;
    const raw = (
      wLexical * currentScenario.lexical +
      wSemantic * currentScenario.semantic +
      wConcept * currentScenario.concept +
      wStructural * currentScenario.structural
    ) / totalWeight;
    return Math.round(raw);
  }, [currentScenario, wLexical, wSemantic, wConcept, wStructural, totalWeight]);

  const chartData = [
    { name: "Lexical (TF-IDF)", score: currentScenario.lexical, fill: "#38bdf8" },
    { name: "Semantic (LaBSE)", score: currentScenario.semantic, fill: "#6366f1" },
    { name: "Concept Fingerprint", score: currentScenario.concept, fill: "#a855f7" },
    { name: "Structural Topology", score: currentScenario.structural, fill: "#ec4899" }
  ];

  return (
    <section id="analyzer" className="py-20 bg-slate-950/60 border-y border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Live Demonstration Sandbox
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            See the 4-Perspective Engine in Action
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
            Test how Parallax evaluates documents across Lexical, Semantic (Multilingual), 
            Concept, and Structural perspectives. Adjust formula weights to simulate reviewer tuning.
          </p>
        </div>

        {/* Scenario Selector Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {SCENARIOS.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <button
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <span>{sc.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  isSelected ? "bg-cyan-500/30 text-cyan-200" : "bg-slate-800 text-slate-400"
                }`}>
                  {sc.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Sandbox Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Document Comparison View (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Document Comparison Card */}
            <div className="p-6 rounded-2xl glass-panel space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Document Excerpt Comparison
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{currentScenario.sourceType}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-400">Match Target:</span>
                  <span className="text-indigo-400 font-medium truncate max-w-[200px]">
                    {currentScenario.matchedTitle}
                  </span>
                </div>
              </div>

              {/* Side-by-Side Excerpts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Submission */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                    <span className="text-cyan-400">Student Submission (English)</span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded">New Upload</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                    &ldquo;{currentScenario.submissionSnippet}&rdquo;
                  </p>
                </div>

                {/* DSpace Corpus Match */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                    <span className="text-purple-400">DIU Repository Prior Work</span>
                    <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                      {currentScenario.matchedYear}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                    &ldquo;{currentScenario.corpusSnippet}&rdquo;
                  </p>
                </div>
              </div>

              {/* Evidence and Explainability */}
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <span>Explainability Analysis (Why Flagged)</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {currentScenario.explanation}
                </p>
                <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                  <div className="text-[11px] font-medium text-slate-400">Key Evidence Points:</div>
                  {currentScenario.evidencePoints.map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Configurable Hybrid Scoring Weights */}
            <div className="p-6 rounded-2xl glass-panel space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-semibold text-white">Hybrid Formula Weights (w₁, w₂, w₃, w₄)</h4>
                </div>
                <button
                  onClick={() => {
                    setWLexical(0.20);
                    setWSemantic(0.35);
                    setWConcept(0.25);
                    setWStructural(0.20);
                  }}
                  className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Defaults
                </button>
              </div>

              <p className="text-xs text-slate-400">
                SRS Formula: <code className="text-indigo-300 font-mono">Final = (w₁×Lex + w₂×Sem + w₃×Con + w₄×Str) / TotalWeight</code>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-cyan-400 font-medium">Lexical (w₁)</span>
                    <span className="text-slate-300">{wLexical.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={wLexical}
                    onChange={(e) => setWLexical(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-indigo-400 font-medium">Semantic (w₂)</span>
                    <span className="text-slate-300">{wSemantic.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={wSemantic}
                    onChange={(e) => setWSemantic(parseFloat(e.target.value))}
                    className="w-full accent-indigo-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-purple-400 font-medium">Concept (w₃)</span>
                    <span className="text-slate-300">{wConcept.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={wConcept}
                    onChange={(e) => setWConcept(parseFloat(e.target.value))}
                    className="w-full accent-purple-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-pink-400 font-medium">Structure (w₄)</span>
                    <span className="text-slate-300">{wStructural.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={wStructural}
                    onChange={(e) => setWStructural(parseFloat(e.target.value))}
                    className="w-full accent-pink-400 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Calculated Scores & Recharts Breakdown (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Overall Score Badge Card */}
            <div className="p-6 rounded-2xl glass-panel text-center relative overflow-hidden">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
                Computed Hybrid Similarity Score
              </div>

              <div className="flex items-center justify-center my-4">
                <div className={`relative flex items-center justify-center w-32 h-32 rounded-full border-4 ${
                  normalizedHybridScore >= 70 
                    ? "border-rose-500/80 bg-rose-500/10 shadow-lg shadow-rose-500/20 text-rose-400"
                    : normalizedHybridScore >= 40
                    ? "border-amber-500/80 bg-amber-500/10 shadow-lg shadow-amber-500/20 text-amber-400"
                    : "border-emerald-500/80 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 text-emerald-400"
                }`}>
                  <span className="text-4xl font-extrabold tracking-tight">
                    {normalizedHybridScore}%
                  </span>
                </div>
              </div>

              {/* Status Verdict */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3 border">
                {normalizedHybridScore >= 70 ? (
                  <span className="text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    High Potential Reuse Detected
                  </span>
                ) : normalizedHybridScore >= 40 ? (
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Moderate Conceptual Overlap
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Original / Distinct Academic Work
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-tight">
                * Academic Notice: Parallax provides potential similarity evidence only. 
                Final academic determination rests with the faculty supervisor.
              </p>
            </div>

            {/* Recharts Bar Breakdown */}
            <div className="p-6 rounded-2xl glass-panel space-y-4">
              <h4 className="text-sm font-semibold text-white flex items-center justify-between">
                <span>Multi-Perspective Score Breakdown</span>
                <span className="text-xs text-slate-400">Scale: 0 - 100%</span>
              </h4>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      tick={{ fontSize: 10 }}
                      width={110} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#f8fafc"
                      }}
                      formatter={(val) => [`${val}%`, "Similarity"]}
                    />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Quick Summary Pill List */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">Lexical:</span>
                  <span className="font-semibold text-cyan-400">{currentScenario.lexical}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">Semantic:</span>
                  <span className="font-semibold text-indigo-400">{currentScenario.semantic}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">Concept:</span>
                  <span className="font-semibold text-purple-400">{currentScenario.concept}%</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400">Structural:</span>
                  <span className="font-semibold text-pink-400">{currentScenario.structural}%</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
