"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  FastForward, 
  X, 
  MessageSquare
} from "lucide-react";
import { useLeague } from "@/context/league-context";
import { simulateGameSteps } from "@/lib/league/gameSimulator";
import { STUFFY_RENDER_MAP } from "@/lib/league/assetMap";
import { StuffyIcon } from "@/lib/league/types";
import { cn } from "@/lib/utils";

export default function MatchBroadcast() {
  const { activeBroadcastGameId, setActiveBroadcastGameId, games, teams, updateGameResult } = useLeague();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2500); // ms per step
  
  const game = useMemo(() => games.find(g => g.id === activeBroadcastGameId), [games, activeBroadcastGameId]);
  const homeTeam = useMemo(() => teams.find(t => t.id === game?.homeTeamId), [teams, game]);
  const awayTeam = useMemo(() => teams.find(t => t.id === game?.awayTeamId), [teams, game]);

  const steps = useMemo(() => {
    if (!game || !homeTeam || !awayTeam) return [];
    return simulateGameSteps(game, homeTeam, awayTeam);
  }, [game, homeTeam, awayTeam]);

  const currentStep = steps[currentStepIndex];
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPaused || currentStepIndex >= steps.length - 1 || !activeBroadcastGameId) return;

    const timer = setTimeout(() => {
      setCurrentStepIndex(prev => prev + 1);
    }, playbackSpeed);

    return () => clearTimeout(timer);
  }, [currentStepIndex, isPaused, steps.length, playbackSpeed, activeBroadcastGameId]);

  // Scroll ticker to bottom
  useEffect(() => {
    if (tickerRef.current) {
        tickerRef.current.scrollTop = tickerRef.current.scrollHeight;
    }
  }, [currentStepIndex]);

  if (!activeBroadcastGameId || !game || !homeTeam || !awayTeam) return null;

  const handleFinish = () => {
    const lastStep = steps[steps.length - 1];
    const winnerId = lastStep.homeScore > lastStep.awayScore 
      ? homeTeam.id 
      : (lastStep.homeScore < lastStep.awayScore ? awayTeam.id : 'tie');
    
    updateGameResult(game.id, lastStep.homeScore, lastStep.awayScore, winnerId);
    setActiveBroadcastGameId(null);
    setCurrentStepIndex(0);
  };

  const homeRender = STUFFY_RENDER_MAP[homeTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
  const awayRender = STUFFY_RENDER_MAP[awayTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;

  return (
    <div className="fixed inset-0 z-100 bg-stone-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none">
        <Image src="/assets/renders/stadium-bg.png" fill className="object-cover" alt="Stadium" />
        <div className="absolute inset-0 bg-stone-950/80" />
      </div>

      {/* Close Button */}
      <button 
        onClick={handleFinish}
        className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Top Header: Scoreboard */}
      <div className="w-full max-w-4xl flex flex-col items-center gap-12">
        <div className="flex items-center justify-between w-full gap-8">
          {/* Away Team */}
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex flex-col items-center gap-4 flex-1 text-center"
          >
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/5 border-4 border-white/10 relative overflow-hidden flex items-center justify-center shadow-2xl">
              {awayTeam.logoUrl ? (
                <Image src={awayTeam.logoUrl} fill className="object-cover" alt={awayTeam.name} />
              ) : (
                <div className="relative w-[120%] h-[120%] translate-y-4">
                  <Image src={awayRender} fill className="object-contain" alt={awayTeam.name} />
                </div>
              )}
              {currentStep?.teamInPossessionId === awayTeam.id && (
                <div className="absolute inset-0 border-4 border-emerald-500 animate-pulse rounded-full" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Away</p>
              <h3 className="text-2xl font-black italic tracking-tighter uppercase">{awayTeam.name}</h3>
            </div>
          </motion.div>

          {/* Central Score */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-stone-900 rounded-3xl p-6 border-2 border-white/10 shadow-inner flex flex-col items-center min-w-[180px]">
              <div className="flex items-center gap-6 mb-2">
                <span className="text-6xl font-black italic tabular-nums text-emerald-400">{currentStep?.awayScore ?? 0}</span>
                <span className="text-2xl font-black text-white/20">VS</span>
                <span className="text-6xl font-black italic tabular-nums text-emerald-400">{currentStep?.homeScore ?? 0}</span>
              </div>
              <div className="flex items-center gap-4 py-2 px-6 rounded-full bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Q{currentStep?.quarter ?? 1}</span>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 tabular-nums">{currentStep?.timeRemaining ?? "15:00"}</span>
              </div>
            </div>
            
            {/* Momentum Bar */}
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                    animate={{ width: `${50 + ((currentStep?.homeScore || 0) - (currentStep?.awayScore || 0)) * 2}%` }}
                    className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                />
            </div>
          </div>

          {/* Home Team */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex flex-col items-center gap-4 flex-1 text-center"
          >
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/5 border-4 border-white/10 relative overflow-hidden flex items-center justify-center shadow-2xl">
              {homeTeam.logoUrl ? (
                <Image src={homeTeam.logoUrl} fill className="object-cover" alt={homeTeam.name} />
              ) : (
                <div className="relative w-[120%] h-[120%] translate-y-4">
                  <Image src={homeRender} fill className="object-contain" alt={homeTeam.name} />
                </div>
              )}
              {currentStep?.teamInPossessionId === homeTeam.id && (
                <div className="absolute inset-0 border-4 border-emerald-500 animate-pulse rounded-full" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Home</p>
              <h3 className="text-2xl font-black italic tracking-tighter uppercase">{homeTeam.name}</h3>
            </div>
          </motion.div>
        </div>

        {/* Dynamic Highlight Overlay */}
        <AnimatePresence mode="wait">
            {currentStep?.type === 'TOUCHDOWN' && (
                <motion.div 
                    key={`${currentStepIndex}-td`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className="absolute inset-center z-50 pointer-events-none flex flex-col items-center"
                >
                    <div className="bg-emerald-500 text-white px-12 py-4 rounded-2xl shadow-[0_20px_50px_rgba(16,185,129,0.4)] border-4 border-white/20 transform -rotate-3">
                        <h2 className="text-6xl font-black italic tracking-tighter uppercase leading-none">TOUCHDOWN!</h2>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Ticker / Log */}
        <div className="w-full flex flex-col gap-4 mt-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Broadcaster Log</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setPlaybackSpeed(s => s === 500 ? 2500 : 500)} className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                        Speed: {playbackSpeed === 500 ? 'Fast' : 'Normal'}
                    </button>
                    <button onClick={() => setIsPaused(!isPaused)} className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                </div>
            </div>
            
            <div 
                ref={tickerRef}
                className="h-48 bg-stone-900/60 rounded-4xl border border-white/10 p-6 overflow-y-auto scroll-smooth space-y-3 custom-scrollbar"
            >
                {steps.slice(0, currentStepIndex + 1).map((s, i) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i} 
                        className={cn(
                            "flex items-start gap-3 p-3 rounded-2xl transition-all",
                            i === currentStepIndex ? "bg-white/10 border border-white/10" : "opacity-40"
                        )}
                    >
                        <div className="h-6 w-12 shrink-0 rounded bg-white/5 flex items-center justify-center text-[8px] font-bold text-white/30 tracking-tighter uppercase">
                            {s.timeRemaining}
                        </div>
                        <p className={cn(
                            "text-sm font-medium",
                            i === currentStepIndex ? "text-white" : "text-white/70"
                        )}>
                            {s.description}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex items-center gap-4 mt-4">
            {currentStepIndex >= steps.length - 1 ? (
                <button 
                    onClick={handleFinish}
                    className="h-14 px-12 rounded-full bg-emerald-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 hover:scale-[1.05] transition-all flex items-center gap-2"
                >
                    Complete Broadcast
                    <Trophy className="w-4 h-4" />
                </button>
            ) : (
                <button 
                    onClick={() => setCurrentStepIndex(steps.length - 1)}
                    className="h-12 px-8 rounded-full bg-white/5 text-white/50 font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"
                >
                    <FastForward className="w-4 h-4" />
                    Skip to End
                </button>
            )}
        </div>
      </div>
    </div>
  );
}
