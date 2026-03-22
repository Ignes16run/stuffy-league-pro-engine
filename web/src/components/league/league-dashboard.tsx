"use client";
// Last Updated: 2026-03-22T15:30:00-04:00

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, Trash2, Trophy, History, PlayCircle, Star, Users, LayoutDashboard, LayoutGrid, BarChart3, User as UserIcon
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import TeamSetup from './team-setup';
import SeasonPredictor from './season-predictor';
import Standings from './standings';
import PlayoffBracket from './playoff-bracket';
import TrainingCamp from './training-camp';
import LeagueHistory from './league-history';
import RosterView from './roster-view';
import { AwardsSelection } from './awards-selection';

export default function LeagueDashboard() {
  const { activeTab, setActiveTab, resetLeague, resetPredictions } = useLeague();
  const { user } = useAuth();

  const tabs = [
    { id: 'setup', label: 'Teams', icon: LayoutGrid },
    { id: 'players', label: 'Personnel', icon: Users },
    { id: 'season', label: 'Season', icon: PlayCircle },
    { id: 'standings', label: 'Rankings', icon: BarChart3 },
    { id: 'playoffs', label: 'Playoffs', icon: Trophy },
    { id: 'training', label: 'Camp', icon: Star },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 scroll-smooth antialiased">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-stone-100 shadow-sm shadow-stone-100/50">
        <div className="container mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-emerald-500 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Trophy className="w-6 h-6 text-white" />
             </div>
             <div>
                <h1 className="text-xl font-black text-stone-900 uppercase tracking-widest leading-none mb-1">Stuffy League Pro</h1>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] leading-none">Global Simulation Engine</p>
             </div>
          </div>

          <div className="hidden lg:flex items-center bg-stone-100/50 p-1.5 rounded-2xl border border-stone-100">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  activeTab === tab.id 
                    ? "bg-white text-stone-900 shadow-sm shadow-stone-200/50 border border-stone-100" 
                    : "text-stone-400 hover:text-stone-600 hover:bg-white/50"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" onClick={resetPredictions} title="Reset Progress" className="w-10 h-10 rounded-xl text-stone-400"><RefreshCw className="w-4 h-4" /></Button>
             <Button variant="ghost" size="icon" onClick={resetLeague} title="Clear League" className="w-10 h-10 rounded-xl text-stone-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></Button>
             <Link href={user ? "/profile" : "/auth"}>
                <Button variant="ghost" className="h-10 w-10 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center p-0 overflow-hidden hover:bg-stone-100 transition-all ml-2">
                  {user ? (
                    <div className="w-full h-full flex items-center justify-center font-black text-emerald-500 bg-emerald-50 uppercase text-[10px] tracking-tighter">
                      {user.email?.[0]}
                    </div>
                  ) : (
                    <UserIcon className="w-4 h-4 text-stone-400" />
                  )}
                </Button>
             </Link>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-xl shadow-2xl border border-stone-100 rounded-[2.5rem] p-2 flex items-center gap-1 w-[90%] max-w-sm">
         {tabs.map(tab => (
            <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={cn(
                  "flex-1 py-4 flex flex-col items-center gap-1.5 rounded-[1.75rem] transition-all",
                  activeTab === tab.id ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" : "text-stone-400"
               )}
            >
               <tab.icon className="w-4 h-4" />
               <span className="text-[8px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
            </button>
         ))}
      </div>

      <main className="container mx-auto px-4 py-12 lg:py-20 relative min-h-screen">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {activeTab === 'setup' && <TeamSetup />}
              {activeTab === 'players' && <RosterView />}
              {activeTab === 'season' && <SeasonPredictor />}
              {activeTab === 'standings' && <Standings />}
              {activeTab === 'playoffs' && <PlayoffBracket />}
              {activeTab === 'training' && <TrainingCamp />}
              {activeTab === 'history' && <LeagueHistory />}
            </motion.div>
          </AnimatePresence>
          <AwardsSelection />
      </main>

      <footer className="w-full py-16 border-t border-stone-100 px-4">
          <div className="container mx-auto text-center">
             <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <LayoutDashboard className="w-5 h-5 text-stone-400" />
             </div>
             <p className="text-[10px] uppercase font-black tracking-[0.5em] text-stone-400 mb-2">Stuffy League Pro</p>
             <p className="text-stone-300 text-xs font-medium">Built with Advanced Stuffy Physics Engine v4.0.0</p>
          </div>
      </footer>
    </div>
  );
}
