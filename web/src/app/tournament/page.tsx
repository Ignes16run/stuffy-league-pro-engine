"use client";
// Last Updated: 2026-03-23T10:05:00-04:00

import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, Trophy } from 'lucide-react';
import { useTournament } from '@/context/tournament-context';
import TournamentSetup from '@/components/tournament/tournament-setup';
import TournamentBracket from '@/components/tournament/tournament-bracket';
import { Button } from '@/components/ui/button';

export default function TournamentPage() {
  const { isStarted } = useTournament();

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center py-12 md:py-20">
      {/* Navigation */}
      <div className="w-full max-w-7xl px-4 md:px-12 mb-12 flex items-center justify-between">
         <Link href="/">
           <Button 
             variant="outline" 
             className="rounded-xl border-stone-200 bg-white/60 text-[10px] font-black uppercase tracking-widest px-6 h-12 gap-3"
           >
             <ArrowLeft className="w-4 h-4" />
             Back to Home
           </Button>
         </Link>

         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center border-b-2 border-amber-700 shadow-lg">
               <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black text-stone-900 uppercase tracking-tight">Stuffy Pro</span>
         </div>
         
         <div className="w-32" /> {/* Spacer */}
      </div>

      <main className="w-full max-w-7xl">
         {isStarted ? (
           <TournamentBracket />
         ) : (
           <TournamentSetup />
         )}
      </main>

      {/* Footer */}
      <footer className="mt-20 py-12 border-t border-stone-200 w-full flex flex-col items-center gap-6">
         <p className="text-stone-300 font-black uppercase tracking-[0.4em] text-[10px]">Standalone Tournament Module v1.0</p>
         <div className="flex items-center gap-8">
            <Link href="/league" className="text-stone-400 font-bold uppercase tracking-widest text-[9px] hover:text-emerald-500 transition-colors">Season League</Link>
            <Link href="/" className="text-stone-400 font-bold uppercase tracking-widest text-[9px] hover:text-stone-800 transition-colors">Home Controller</Link>
         </div>
      </footer>
    </div>
  );
}
