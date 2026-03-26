"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  FastForward, 
  X, 
  MessageSquare,
  Volume2,
  VolumeX,
  TrendingUp,
  Award,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useLeague } from "@/context/league-context";
import { simulateGameSteps, SoundEffectType } from "@/lib/league/gameSimulator";
import { STUFFY_RENDER_MAP } from "@/lib/league/assetMap";
import { StuffyIcon } from "@/lib/league/types";
import { cn } from "@/lib/utils";

const SFX_MAP: Record<SoundEffectType, string> = {
  'WHISTLE': 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  'CHEER': 'https://assets.mixkit.co/active_storage/sfx/2045/2045-preview.mp3',
  'OOH': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  'DRUM_ROLL': 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  'ZAP': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  'FG_GOOD': 'https://assets.mixkit.co/active_storage/sfx/2045/2045-preview.mp3',
  'KICKOFF': 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
};

export default function MatchBroadcast() {
  const { activeBroadcastGameId, setActiveBroadcastGameId, games, teams, updateGameResult } = useLeague();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2500); // ms per step
  const [isMuted, setIsMuted] = useState(false);
  const [showHalftime, setShowHalftime] = useState(false);
  
  const game = useMemo(() => games.find(g => g.id === activeBroadcastGameId), [games, activeBroadcastGameId]);
  const homeTeam = useMemo(() => teams.find(t => t.id === game?.homeTeamId), [teams, game]);
  const awayTeam = useMemo(() => teams.find(t => t.id === game?.awayTeamId), [teams, game]);

  const steps = useMemo(() => {
    if (!game || !homeTeam || !awayTeam) return [];
    return simulateGameSteps(game, homeTeam, awayTeam);
  }, [game, homeTeam, awayTeam]);

  const currentStep = steps[currentStepIndex];
  const tickerRef = useRef<HTMLDivElement>(null);

  const playSFX = useCallback((type?: SoundEffectType) => {
    if (!type || isMuted) return;
    const url = SFX_MAP[type];
    if (url) {
      const audio = new Audio(url);
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore autoplay blocks
    }
  }, [isMuted]);

  useEffect(() => {
    if (isPaused || currentStepIndex >= steps.length - 1 || !activeBroadcastGameId || showHalftime) return;

    const timer = setTimeout(() => {
      const nextIndex = currentStepIndex + 1;
      const nextStep = steps[nextIndex];
      
      if (nextStep?.type === 'HALF_TIME') {
        setShowHalftime(true);
      }
      
      setCurrentStepIndex(nextIndex);
      playSFX(nextStep?.soundEffect);
    }, playbackSpeed);

    return () => clearTimeout(timer);
  }, [currentStepIndex, isPaused, steps, playbackSpeed, activeBroadcastGameId, showHalftime, playSFX]);

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
    setShowHalftime(false);
  };

  const homeRender = STUFFY_RENDER_MAP[homeTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
  const awayRender = STUFFY_RENDER_MAP[awayTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;

  return (
    <div className="fixed inset-0 z-100 bg-stone-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white overflow-hidden font-sans">
      {/* Background Graphic */}
      <div className="absolute inset-0 -z-10 opacity-30 pointer-events-none">
        <Image src="/assets/renders/stadium-bg.png" fill className="object-cover scale-110 blur-sm" alt="Stadium" />
        <div className="absolute inset-0 bg-linear-to-b from-stone-950 via-stone-950/80 to-stone-950" />
      </div>

      {/* Decorative Lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full translate-y-1/2" />

      {/* Close Button */}
      <button 
        onClick={handleFinish}
        className="absolute top-10 right-10 w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center border border-white/10 group"
      >
        <X className="w-5 h-5 text-white/50 group-hover:text-white group-hover:rotate-90 transition-all" />
      </button>

      {/* Audio Toggle */}
      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-10 right-24 w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center border border-white/10 group"
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
      </button>

      {/* Scoreboard Area */}
      <div className="w-full max-w-5xl flex flex-col items-center gap-8 relative">
        
        {/* Top Banner */}
        <div className="flex items-center gap-4 bg-white/5 px-6 py-2 rounded-full border border-white/10 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Live Broadcast • SPFL Network</span>
        </div>

        <div className="flex items-center justify-between w-full gap-12">
          {/* Away Team Card */}
          <motion.div 
            animate={{ 
                x: currentStep?.teamInPossessionId === awayTeam.id ? 10 : 0,
                scale: currentStep?.teamInPossessionId === awayTeam.id ? 1.05 : 1
            }}
            className="flex flex-col items-center gap-6 flex-1"
          >
            <div className="relative">
                <div className={cn(
                    "w-40 h-40 md:w-56 md:h-56 rounded-3xl bg-linear-to-br from-white/10 to-transparent border-2 border-white/10 overflow-hidden flex items-center justify-center shadow-2xl transition-all duration-500",
                    currentStep?.teamInPossessionId === awayTeam.id ? "border-emerald-500/50 shadow-emerald-500/20" : ""
                )}>
                {awayTeam.logoUrl ? (
                    <Image src={awayTeam.logoUrl} fill className="object-cover" alt={awayTeam.name} />
                ) : (
                    <div className="relative w-[130%] h-[130%] translate-y-6">
                    <Image src={awayRender} fill className="object-contain drop-shadow-2xl" alt={awayTeam.name} />
                    </div>
                )}
                </div>
                {currentStep?.teamInPossessionId === awayTeam.id && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Possession</div>
                )}
            </div>
            <div className="text-center">
              <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-1">{awayTeam.name}</h3>
              <p className="text-[10px] font-bold text-white/30 tracking-[0.3em] uppercase">{awayTeam.city}</p>
            </div>
          </motion.div>

          {/* Central Scoreboard */}
          <div className="flex flex-col items-center gap-6 pointer-events-none">
            <div className="relative">
                {/* Glow behind score */}
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                
                <div className="relative bg-stone-900/80 backdrop-blur-xl rounded-[2.5rem] p-10 border-2 border-white/10 shadow-2xl flex flex-col items-center min-w-[280px]">
                    <div className="flex items-center gap-8 mb-6">
                        <motion.span 
                            key={currentStep?.awayScore}
                            initial={{ scale: 1.2, color: '#10b981' }}
                            animate={{ scale: 1, color: '#10b981' }}
                            className="text-8xl font-black italic tabular-nums tracking-tighter"
                        >
                            {currentStep?.awayScore ?? 0}
                        </motion.span>
                        <span className="text-2xl font-black text-white/10 uppercase italic">VS</span>
                        <motion.span 
                            key={currentStep?.homeScore}
                            initial={{ scale: 1.2, color: '#10b981' }}
                            animate={{ scale: 1, color: '#10b981' }}
                            className="text-8xl font-black italic tabular-nums tracking-tighter"
                        >
                            {currentStep?.homeScore ?? 0}
                        </motion.span>
                    </div>
                    
                    <div className="flex items-center gap-6 py-3 px-8 rounded-2xl bg-white/5 border border-white/10">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">Quarter</span>
                            <span className="text-lg font-black text-white italic tracking-tighter leading-none">Q{currentStep?.quarter ?? 1}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-0.5">Clock</span>
                            <span className="text-lg font-black text-emerald-400 italic tabular-nums tracking-tighter leading-none">{currentStep?.timeRemaining ?? "15:00"}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Momentum Bar */}
            <div className="w-full flex flex-col gap-2 px-4">
                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/20">
                    <span>Away Momentum</span>
                    <span>Home Momentum</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 relative">
                    <motion.div 
                        initial={{ width: '50%' }}
                        animate={{ width: `${50 + ((currentStep?.homeScore || 0) - (currentStep?.awayScore || 0)) * 2}%` }}
                        className="absolute right-1/2 h-full bg-linear-to-l from-emerald-500 to-transparent transition-all duration-1000 origin-right"
                    />
                    <motion.div 
                        initial={{ width: '50%' }}
                        animate={{ width: `${50 + ((currentStep?.awayScore || 0) - (currentStep?.homeScore || 0)) * 2}%` }}
                        className="absolute left-1/2 h-full bg-linear-to-r from-emerald-500 to-transparent transition-all duration-1000 origin-left"
                    />
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20" />
                </div>
            </div>
          </div>

          {/* Home Team Card */}
          <motion.div 
            animate={{ 
                x: currentStep?.teamInPossessionId === homeTeam.id ? -10 : 0,
                scale: currentStep?.teamInPossessionId === homeTeam.id ? 1.05 : 1
            }}
            className="flex flex-col items-center gap-6 flex-1"
          >
            <div className="relative">
                <div className={cn(
                    "w-40 h-40 md:w-56 md:h-56 rounded-3xl bg-linear-to-br from-white/10 to-transparent border-2 border-white/10 overflow-hidden flex items-center justify-center shadow-2xl transition-all duration-500",
                    currentStep?.teamInPossessionId === homeTeam.id ? "border-emerald-500/50 shadow-emerald-500/20" : ""
                )}>
                {homeTeam.logoUrl ? (
                    <Image src={homeTeam.logoUrl} fill className="object-cover" alt={homeTeam.name} />
                ) : (
                    <div className="relative w-[130%] h-[130%] translate-y-6">
                    <Image src={homeRender} fill className="object-contain drop-shadow-2xl" alt={homeTeam.name} />
                    </div>
                )}
                </div>
                {currentStep?.teamInPossessionId === homeTeam.id && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Possession</div>
                )}
            </div>
            <div className="text-center">
              <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-1">{homeTeam.name}</h3>
              <p className="text-[10px] font-bold text-white/30 tracking-[0.3em] uppercase">{homeTeam.city}</p>
            </div>
          </motion.div>
        </div>

        {/* Live Commentary Box */}
        <AnimatePresence mode="wait">
            <motion.div 
                key={currentStepIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-4xl bg-stone-900/40 backdrop-blur-lg border border-white/10 rounded-[2rem] p-8 flex flex-col items-center text-center gap-4 relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                    <motion.div 
                        key={currentStepIndex}
                        initial={{ x: '-100%' }}
                        animate={{ x: '0%' }}
                        transition={{ duration: playbackSpeed / 1000, ease: 'linear' }}
                        className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                    />
                </div>
                
                <div className="flex items-center gap-3 text-emerald-400 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                     <TrendingUp className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Broadcast Commentary</span>
                </div>
                
                <h4 className="text-4xl font-black italic tracking-tighter uppercase leading-tight max-w-2xl text-balance">
                    "{currentStep?.commentary || currentStep?.description}"
                </h4>
                
                <p className="text-white/40 text-sm font-medium italic">
                    {currentStep?.description}
                </p>
            </motion.div>
        </AnimatePresence>

        {/* Ticker / History */}
        <div className="w-full max-w-4xl flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Broadcaster Log</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                         <button onClick={() => setPlaybackSpeed(2500)} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", playbackSpeed === 2500 ? "bg-white text-stone-950" : "text-white/40 hover:text-white")}>Normal</button>
                         <button onClick={() => setPlaybackSpeed(500)} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", playbackSpeed === 500 ? "bg-white text-stone-950" : "text-white/40 hover:text-white")}>Turbo</button>
                    </div>
                    <button onClick={() => setIsPaused(!isPaused)} className="text-[10px] font-black uppercase bg-white/5 px-4 py-2 rounded-xl text-white/60 hover:text-white border border-white/10 transition-all">
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                </div>
            </div>
            
            <div 
                ref={tickerRef}
                className="h-44 bg-linear-to-b from-stone-900/60 to-stone-950/20 rounded-4xl border border-white/10 p-6 overflow-y-auto space-y-3 custom-scrollbar"
            >
                {steps.slice(0, currentStepIndex + 1).map((s, i) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i} 
                        className={cn(
                            "flex items-center gap-4 p-3 rounded-2xl transition-all border",
                            i === currentStepIndex ? "bg-emerald-500/10 border-emerald-500/20" : "border-transparent opacity-30"
                        )}
                    >
                        <div className="shrink-0 flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg">
                            <span className="text-[8px] font-bold text-white/50 tracking-widest uppercase">Q{s.quarter}</span>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-xs font-black text-emerald-400 tabular-nums">{s.timeRemaining}</span>
                        </div>
                        <p className={cn(
                            "text-[13px] font-bold leading-none",
                            i === currentStepIndex ? "text-white" : "text-white/60"
                        )}>
                            {s.description}
                        </p>
                        {i === currentStepIndex && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Global Action Overlay (TD) */}
        <AnimatePresence mode="wait">
            {currentStep?.type === 'TOUCHDOWN' && (
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                    animate={{ scale: 1, opacity: 1, rotate: 3 }}
                    exit={{ scale: 2, opacity: 0, rotate: 10 }}
                    className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center -translate-y-24"
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500 blur-[80px] opacity-40 animate-pulse" />
                        <div className="relative bg-emerald-500 text-white px-16 py-8 rounded-[3rem] shadow-2xl border-8 border-white/30 transform transition-all">
                            <h2 className="text-8xl font-black italic tracking-tighter uppercase leading-none text-shadow-xl">TOUCHDOWN!</h2>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Half-time Show Modal */}
        <AnimatePresence>
            {showHalftime && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] bg-stone-950/95 backdrop-blur-3xl flex items-center justify-center p-8"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="w-full max-w-4xl bg-linear-to-br from-stone-900 to-stone-950 rounded-[4rem] border-2 border-emerald-500/20 p-12 shadow-[0_0_100px_rgba(16,185,129,0.1)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                             <TrendingUp className="w-96 h-96 text-emerald-500" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col items-center gap-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                                <Award className="w-12 h-12 text-emerald-400 mb-2" />
                                <h2 className="text-6xl font-black italic uppercase tracking-tighter">Half-time Report</h2>
                                <p className="text-white/40 font-black uppercase tracking-[0.6em]">SPFL Primetime Show</p>
                            </div>

                            <div className="grid grid-cols-3 gap-12 w-full items-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 relative overflow-hidden flex items-center justify-center">
                                        {awayTeam.logoUrl ? <Image src={awayTeam.logoUrl} fill alt="" /> : <Image src={awayRender} fill alt="" className="translate-y-2" />}
                                    </div>
                                    <span className="text-5xl font-black italic">{currentStep?.awayScore}</span>
                                    <span className="text-xs font-black uppercase text-white/40 tracking-widest">{awayTeam.name}</span>
                                </div>
                                
                                <div className="flex flex-col gap-6">
                                    {[
                                        { label: 'Total Offense', away: '245yd', home: '198yd' },
                                        { label: 'First Downs', away: '12', home: '9' },
                                        { label: 'Time of Poss.', away: '16:32', home: '13:28' }
                                    ].map((stat, i) => (
                                        <div key={i} className="flex flex-col gap-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/30">
                                                <span>{stat.away}</span>
                                                <span>{stat.label}</span>
                                                <span>{stat.home}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                                                <div className="h-full bg-emerald-500/40 w-1/2 flex justify-end">
                                                    <div className="h-full bg-emerald-500 w-[70%]" />
                                                </div>
                                                <div className="h-full bg-emerald-500/20 w-1/2">
                                                    <div className="h-full bg-emerald-500 w-[60%]" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 relative overflow-hidden flex items-center justify-center">
                                        {homeTeam.logoUrl ? <Image src={homeTeam.logoUrl} fill alt="" /> : <Image src={homeRender} fill alt="" className="translate-y-2" />}
                                    </div>
                                    <span className="text-5xl font-black italic">{currentStep?.homeScore}</span>
                                    <span className="text-xs font-black uppercase text-white/40 tracking-widest">{homeTeam.name}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowHalftime(false)}
                                className="h-16 px-16 rounded-full bg-emerald-500 text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
                            >
                                Back to Second Half
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Bottom CTA Area */}
        <div className="flex items-center gap-6 mt-8">
            <div className="flex items-center gap-2 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                 <ShieldCheck className="w-4 h-4 text-emerald-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Verified Sim v4.2</span>
            </div>
            
            {currentStepIndex >= steps.length - 1 ? (
                <button 
                    onClick={handleFinish}
                    className="h-16 px-16 rounded-full bg-emerald-500 text-white font-black uppercase tracking-widest text-sm shadow-2xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                    Finalize Result
                    <Trophy className="w-5 h-5" />
                </button>
            ) : (
                <button 
                    onClick={() => {
                        const scoreStep = steps[steps.length - 1];
                        updateGameResult(game.id, scoreStep.homeScore, scoreStep.awayScore, 
                            scoreStep.homeScore > scoreStep.awayScore ? homeTeam.id : (scoreStep.homeScore < scoreStep.awayScore ? awayTeam.id : 'tie')
                        );
                        setActiveBroadcastGameId(null);
                    }}
                    className="h-14 px-10 rounded-full bg-white/5 text-white/40 font-black uppercase tracking-widest text-[11px] border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center gap-3"
                >
                    <FastForward className="w-4 h-4" />
                    Skip Broadcast
                </button>
            )}
        </div>
      </div>
    </div>
  );
}
