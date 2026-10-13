"use client";

import { Layers, GraduationCap, ShieldAlert } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-[#090d16] pt-16 pb-12 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">
          
          {/* Project Info (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Parallax</span>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              A Multi-Perspective Semantic and Structural Similarity Detection System for Bangla-English Academic Reuse. 
              Designed and built for the Software Engineering community at Daffodil International University (DIU).
            </p>

            <div className="flex items-center gap-2 pt-2">
              <a
                href="https://github.com/KhandakerSamin/Parallax"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub Repository
              </a>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                v0.1.0-alpha
              </span>
            </div>
          </div>

          {/* Academic Context (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              Capstone Details
            </div>
            
            <div className="text-xs space-y-1.5 text-slate-400">
              <div><strong className="text-slate-300">Course:</strong> Software Engineering Design Capstone Project</div>
              <div><strong className="text-slate-300">Code:</strong> SE 331 (Section 42 - E1)</div>
              <div><strong className="text-slate-300">Teacher:</strong> Partho Chanda, Lecturer (SWE, DIU)</div>
              <div><strong className="text-slate-300">Institution:</strong> Daffodil International University</div>
            </div>

            <div className="pt-2 text-xs">
              <div className="font-semibold text-slate-300 mb-1">Project Authors:</div>
              <ul className="space-y-0.5 text-slate-400">
                <li>1. Khandaker Samin Yeasar (241-35-182)</li>
                <li>2. Nusrat Jahan (241-35-072)</li>
              </ul>
            </div>
          </div>

          {/* Quick Links / Disclaimers (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              Academic Ethics
            </div>

            <p className="text-[11px] leading-relaxed text-slate-400">
              Parallax reports potential similarity with supporting evidence. Final academic judgment, 
              context evaluation, and disciplinary verdicts always remain with the human authority and supervisor.
            </p>

            <div className="pt-2 text-[11px] text-slate-500">
              &copy; 2026 Parallax Research Team. Open source under MIT License.
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>Built with Next.js, FastAPI, Sentence Transformers & FAISS.</div>
          <div className="flex items-center gap-4">
            <a href="#analyzer" className="hover:text-slate-400 transition-colors">Analyzer</a>
            <a href="#perspectives" className="hover:text-slate-400 transition-colors">Perspectives</a>
            <a href="#corpus" className="hover:text-slate-400 transition-colors">DSpace Corpus</a>
            <a href="#architecture" className="hover:text-slate-400 transition-colors">Architecture</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
