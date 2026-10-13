"use client";

import { Layers, Server, Cpu, Database, Users } from "lucide-react";

export default function ArchitectureSection() {
  const tiers = [
    {
      role: "Tier 1: Presentation Layer",
      tech: "Next.js 16 • React 19 • Tailwind CSS • Recharts",
      port: "Port 3000",
      desc: "Responsive web portal for students, faculty supervisors, and administrators. Offers live report dashboards, radar comparisons, and evidence diff view.",
      icon: Layers
    },
    {
      role: "Tier 2: Backend Orchestration",
      tech: "Node.js • Express • JavaScript / REST API",
      port: "Port 8000",
      desc: "Handles user authentication, file uploads, role permissions, notification queue, and dispatches analysis requests to the Python AI microservice.",
      icon: Server
    },
    {
      role: "Tier 3: AI / NLP Microservice",
      tech: "Python 3.11 • FastAPI • PyTorch • FAISS",
      port: "Port 8001",
      desc: "Performs PDF parsing, sentence cleaning, multilingual LaBSE/MiniLM embedding generation, cosine metrics, and structural fingerprint matching.",
      icon: Cpu
    },
    {
      role: "Tier 4: Storage & Vector Indexes",
      tech: "PostgreSQL 16 • Redis 7 • FAISS Vector Store",
      port: "Port 5432 / 6379",
      desc: "Stores student profiles, metadata, section chunks, and indexed vector embeddings for instant sub-3-second nearest-neighbor similarity search.",
      icon: Database
    }
  ];

  const roles = [
    {
      name: "Student",
      badge: "Upload & Verify",
      desc: "Uploads proposals, theses, or capstone reports; views similarity reports and section overlap evidence before submission."
    },
    {
      name: "Reviewer / Supervisor",
      badge: "Academic Decision",
      desc: "Inspects flagged matches, examines side-by-side evidence, leaves evaluation notes, and records formal academic decisions."
    },
    {
      name: "Researcher & Admin",
      badge: "Corpus & Weights",
      desc: "Curates DIU DSpace repository documents, configures hybrid scoring weights (w1-w4), and evaluates benchmark metrics (F1, Spearman)."
    }
  ];

  return (
    <section id="architecture" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <Server className="w-3.5 h-3.5" />
            System Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Production-Grade Microservice Design
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
            Parallax separates the interactive user interface, business orchestration, 
            and heavy AI computation into decoupled services configured via Docker Compose.
          </p>
        </div>

        {/* 4 Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {tiers.map((t, idx) => {
            const Icon = t.icon;
            return (
              <div key={idx} className="p-6 rounded-2xl glass-panel space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <Icon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {t.port}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{t.role}</h3>
                  <div className="text-xs font-mono text-cyan-400 mb-2">{t.tech}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Role-Based Access Grid */}
        <div className="p-8 rounded-3xl glass-panel space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Role-Based Access Control (RBAC)</h3>
              <p className="text-xs text-slate-400">Tailored workflows designed for the university ecosystem</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((r, i) => (
              <div key={i} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{r.name}</h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {r.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
