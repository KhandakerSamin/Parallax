"use client";

import { Database, CheckCircle2, Shield } from "lucide-react";

export default function CorpusSection() {
  const stats = [
    { label: "DIU Project Reports", value: "642", detail: "Software Engineering Community" },
    { label: "Thesis Dissertations", value: "356", detail: "Undergraduate & Graduate" },
    { label: "Internship Reports", value: "22", detail: "Industry Experience Reviews" },
    { label: "FAISS Vector Latency", value: "< 2.8s", detail: "Sub-3-second Nearest Neighbor" }
  ];

  const pipelineSteps = [
    {
      step: "01",
      title: "DSpace Ingestion",
      desc: "Metadata and open PDF harvesting respecting DIU repository access regulations."
    },
    {
      step: "02",
      title: "Cleaning & Sectioning",
      desc: "PyMuPDF extraction with automated removal of headers, page numbers, and reference lists."
    },
    {
      step: "03",
      title: "Overlapping Chunking",
      desc: "300-word sliding windows ensuring context across sentence & section boundaries."
    },
    {
      step: "04",
      title: "FAISS Vector Index",
      desc: "Dense semantic vector indexing with candidate retrieval of top-20 nearest matches."
    }
  ];

  return (
    <section id="corpus" className="py-24 bg-slate-950/70 border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" />
              Institutional Academic Repository
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Powered by DIU DSpace Academic Corpus
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Daffodil International University produces hundreds of project and thesis reports every semester. 
              Parallax anchors its knowledge base directly in indexed past university works, enabling supervisors 
              and students to immediately detect duplicate methodologies and prior art.
            </p>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            {stats.map((s, idx) => (
              <div key={idx} className="p-4 rounded-xl glass-panel space-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {s.value}
                </div>
                <div className="text-xs font-semibold text-indigo-400">{s.label}</div>
                <div className="text-[11px] text-slate-500 leading-tight">{s.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Cards */}
        <div className="p-8 rounded-3xl glass-panel space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">The Document Ingestion & Retrieval Pipeline</h3>
              <p className="text-xs text-slate-400 mt-0.5">From raw PDF upload to high-speed similarity candidate ranking</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Deterministic & Reproducible
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pipelineSteps.map((st) => (
              <div key={st.step} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 relative">
                <span className="text-xs font-bold text-purple-400/80 font-mono tracking-wider">
                  STAGE {st.step}
                </span>
                <h4 className="text-base font-semibold text-white">{st.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>

          {/* Ethical & Governance Notice */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3">
            <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Ethical Governance & Privacy Guarantee:</strong> Uploaded student documents 
              are processed solely for academic similarity evaluation. Author credentials can be anonymized, 
              and results are provided as potential similarity evidence rather than definitive plagiarism verdicts.
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
