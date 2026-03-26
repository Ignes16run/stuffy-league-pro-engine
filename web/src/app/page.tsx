"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Users, 
  Github, 
  BookOpen, 
  Play, 
  ChevronRight, 
  Zap,
  BarChart3,
  Calendar
} from "lucide-react";
import Typing from "@/components/typing";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between border-b border-stone-200/50 bg-white/70 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Image
            src="/assets/league-logos/full_noback_stuffyprologo.png"
            alt="Stuffy Pro Logo"
            width={40}
            height={40}
            className="w-8 h-8 object-contain"
          />
          <span className="text-sm font-black uppercase tracking-tighter text-stone-900">SPFL</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="/league" className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors">League</Link>
          <Link href="/tournament" className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors">Tournament</Link>
          <a href="https://github.com/vudovn/antigravity-kit" target="_blank" className="text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors">Source</a>
          <Link href="/league" className="h-9 px-4 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center shadow-lg shadow-emerald-500/20">
            Play Now
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/50 blur-[120px] rounded-full" />
            <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-amber-100/50 blur-[100px] rounded-full" />
          </div>

          <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative mb-12"
            >
              <div className="absolute inset-0 bg-stone-200/20 blur-3xl rounded-full" />
              <Image
                src="/assets/league-logos/full_noback_stuffyprologo.png"
                alt="Stuffy Pro Logo"
                width={200}
                height={200}
                priority
                className="relative z-10 w-48 h-48 md:w-64 md:h-64 object-contain"
              />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-7xl font-black text-stone-950 tracking-tight leading-[0.9] mb-6"
            >
              THE WORLD'S <br />
              <span className="text-emerald-500">PRETTIEST</span> SPORT.
            </motion.h1>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-8"
            >
              <Typing />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Link href="/league">
                <button className="h-14 px-8 rounded-full bg-stone-950 text-white font-black uppercase tracking-widest text-xs flex items-center group overflow-hidden relative shadow-2xl shadow-stone-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  <span className="relative z-10 flex items-center">
                    Enter the League
                    <Play className="w-3.5 h-3.5 ml-2 fill-current" />
                  </span>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 transform translate-y-full group-hover:translate-y-0 transition-transform" />
                </button>
              </Link>

              <Link href="/tournament">
                <button className="h-14 px-8 rounded-full border-2 border-stone-200 bg-white text-stone-900 font-black uppercase tracking-widest text-xs flex items-center hover:bg-stone-50 transition-all active:scale-[0.98]">
                  Tournament Bracket
                  <Trophy className="w-3.5 h-3.5 ml-2 text-amber-500" />
                </button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-24 bg-white">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {/* Feature 1 */}
              <motion.div variants={item} className="group p-8 rounded-[2.5rem] bg-stone-50 border border-stone-100 hover:border-emerald-200 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-2 uppercase tracking-tight">Stuffy Pro Engine</h3>
                <p className="text-sm text-stone-500 leading-relaxed font-medium">
                  Experience lightning-fast season simulations driven by our advanced RNG-based deterministic logic. Every result is earned.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div variants={item} className="group p-8 rounded-[2.5rem] bg-stone-50 border border-stone-100 hover:border-amber-200 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-2 uppercase tracking-tight">Deep Analytics</h3>
                <p className="text-sm text-stone-500 leading-relaxed font-medium">
                  Track every touchdown, interception, and stuffy tackle. Comprehensive player stats across seasons provide unparalleled depth.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div variants={item} className="group p-8 rounded-[2.5rem] bg-stone-50 border border-stone-100 hover:border-blue-200 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-black text-stone-900 mb-2 uppercase tracking-tight">Dynamic Stories</h3>
                <p className="text-sm text-stone-500 leading-relaxed font-medium">
                  Our storyline generator creates narratives for every game, turning simulation results into epic sports dramas.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Hero Image Showcase */}
        <section className="px-6 py-12">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto rounded-[3rem] overflow-hidden bg-stone-900 relative aspect-video shadow-2xl group shadow-stone-900/40"
          >
            <Image
              src="/assets/renders/stadium-bg.png"
              alt="SPFL Arena"
              fill
              className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-stone-950/20" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
              <span className="text-emerald-400 font-black uppercase tracking-[0.3em] text-[10px] mb-4">Official Arena of SPFL</span>
              <h2 className="text-4xl md:text-6xl font-black text-white leading-none uppercase tracking-tighter mb-8 max-w-2xl">
                Ready for the Big Dance?
              </h2>
              <Link href="/league">
                <button className="h-12 px-6 rounded-full bg-white text-stone-950 font-black uppercase tracking-widest text-[10px] flex items-center hover:bg-stone-100 transition-all">
                  Join the Season
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Dev Footer Section */}
        <section className="px-6 py-24 bg-stone-50 border-t border-stone-100">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="max-w-sm text-center md:text-left">
              <h3 className="text-2xl font-black text-stone-900 mb-4 uppercase tracking-tighter">Open Infrastructure</h3>
              <p className="text-sm text-stone-500 font-medium leading-relaxed mb-6">
                Stuffy League Pro is built on the Antigravity Kit. Explore the code, contribute to the engine, or build your own league.
              </p>
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <a href="https://github.com/vudovn/antigravity-kit" target="_blank" className="p-3 rounded-full bg-stone-200 hover:bg-stone-300 transition-colors">
                  <Github className="w-5 h-5 text-stone-700" />
                </a>
                <Link href="/docs" className="p-3 rounded-full bg-stone-200 hover:bg-stone-300 transition-colors">
                  <BookOpen className="w-5 h-5 text-stone-700" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-white border border-stone-200/50 flex flex-col items-center text-center">
                <span className="text-3xl font-black text-stone-900 leading-none mb-1">32</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Teams</span>
              </div>
              <div className="p-6 rounded-3xl bg-white border border-stone-200/50 flex flex-col items-center text-center">
                <span className="text-3xl font-black text-stone-900 leading-none mb-1">100%</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Stuffy</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 py-12 border-t border-stone-200/50 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/assets/league-logos/full_noback_stuffyprologo.png"
              alt="Stuffy Pro Logo"
              width={24}
              height={24}
              className="w-6 h-6 object-contain grayscale"
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">© 2026 SPFL | Stuffy Pro League</span>
          </div>
          
          <div className="flex items-center gap-8">
            <Link href="/league" className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">League</Link>
            <Link href="/tournament" className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">Tournament</Link>
            <Link href="/docs" className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
