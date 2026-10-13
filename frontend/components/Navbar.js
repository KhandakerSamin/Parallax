"use client";

import { useState } from "react";
import { Cpu, Sparkles, BookOpen, Layers, Menu, X, ArrowRight } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#090d16]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">Parallax</span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  DIU Capstone
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
                Multi-Perspective Academic Reuse Engine
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#analyzer" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Live Engine
            </a>
            <a href="#perspectives" className="hover:text-indigo-400 transition-colors flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              4 Perspectives
            </a>
            <a href="#corpus" className="hover:text-purple-400 transition-colors flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-purple-400" />
              DSpace Corpus
            </a>
            <a href="#architecture" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              Architecture
            </a>
          </div>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#analyzer"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Reviewer Portal
            </a>
            <a
              href="#analyzer"
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              Upload Document
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Hamburger */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#090d16] px-4 pt-3 pb-5 space-y-3">
          <a
            href="#analyzer"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
          >
            Live Engine
          </a>
          <a
            href="#perspectives"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
          >
            4 Perspectives
          </a>
          <a
            href="#corpus"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
          >
            DSpace Corpus
          </a>
          <a
            href="#architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-slate-900"
          >
            Architecture
          </a>
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            <a
              href="#analyzer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white"
            >
              Upload Document for Analysis
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
