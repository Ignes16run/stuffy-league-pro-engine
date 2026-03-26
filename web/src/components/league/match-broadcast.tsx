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
  'DRUM_ROLL': 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3',
  'ZAP': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  'FG_GOOD': 'https://assets.mixkit.co/active_storage/sfx/2045/2045-preview.mp3',
  'TOUCHDOWN': 'https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3',
  'KICKOFF': 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
};

export default function MatchBroadcast() {
  const { activeBroadcastGameId, setActiveBroadcastGameId, games, teams, updateGameResult } = useLeague();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(3500); // 3.5s per step (slower)
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
      audio.volume = 0.4;
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
    <div className="fixed inset-0 z-100 bg-stone-950/98 backdrop-blur-2xl flex flex-col items-center justify-start py-20 px-6 text-white overflow-y-auto font-sans custom-scrollbar">
      {/* Background Graphic */}
      <div className="fixed inset-0 -z-10 opacity-30 pointer-events-none">
        <Image src="/assets/renders/stadium-bg.png" fill className="object-cover scale-110 blur-sm" alt="Stadium" />
        <div className="absolute inset-0 bg-linear-to-b from-stone-950 via-stone-950/80 to-stone-950" />
      </div>

      {/* Decorative Lights */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -translate-y-1/2" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full translate-y-1/2" />

      {/* Action Bar (Pinned Top) */}
      <div className="fixed top-6 right-6 flex items-center gap-3 z-50">
        <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center border border-white/10 group backdrop-blur-xl shadow-2xl"
        >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>
        <button 
            onClick={handleFinish}
            className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center border border-white/10 group backdrop-blur-xl shadow-2xl"
        >
            <X className="w-5 h-5 text-white/50 group-hover:text-white group-hover:rotate-90 transition-all" />
        </button>
      </div>

      {/* Main Broadcast Content (Scrollable Container) */}
      <div className="w-full max-w-6xl flex flex-col items-center gap-12 relative pb-20">
        
        {/* Top Banner */}
        <div className="flex items-center gap-4 bg-white/5 px-6 py-2 rounded-full border border-white/10 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60">Live Broadcast • SPFL Primetime Network</span>
        </div>

        <div className="flex items-center justify-between w-full gap-8 md:gap-12 flex-wrap md:flex-nowrap">
          {/* Away Team Card */}
          <motion.div 
            animate={{ 
                x: currentStep?.teamInPossessionId === awayTeam.id ? 10 : 0,
                scale: currentStep?.teamInPossessionId === awayTeam.id ? 1.05 : 1
            }}
            className="flex flex-col items-center gap-6 flex-1 min-w-[280px]"
          >
            <div className="relative">
                <div className={cn(
                    "w-48 h-48 md:w-64 md:h-64 rounded-[3rem] bg-linear-to-br from-white/10 to-transparent border-2 border-white/10 overflow-hidden flex items-center justify-center shadow-2xl transition-all duration-500",
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
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border-2 border-white/20">Possession</motion.div>
                )}
            </div>
            <div className="text-center">
              <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-1 drop-shadow-lg">{awayTeam.name}</h3>
              <p className="text-[10px] font-bold text-white/30 tracking-[0.3em] uppercase">Away Team</p>
            </div>
          </motion.div>

          {/* Central Scoreboard */}
          <div className="flex flex-col items-center gap-8 pointer-events-none">
            <div className="relative">
                {/* Glow behind score */}
                <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
                
                <div className="relative bg-stone-900/90 backdrop-blur-2xl rounded-[3rem] p-12 border-2 border-white/10 shadow-2xl flex flex-col items-center min-w-[320px]">
                    <div className="flex items-center gap-10 mb-8">
                        <motion.span 
                            key={currentStep?.awayScore}
                            initial={{ scale: 1.3, color: '#10b981' }}
                            animate={{ scale: 1, color: '#10b981' }}
                            className="text-8xl md:text-9xl font-black italic tabular-nums tracking-tighter"
                        >
                            {currentStep?.awayScore ?? 0}
                        </motion.span>
                        <span className="text-3xl font-black text-white/10 uppercase italic">VS</span>
                        <motion.span 
                            key={currentStep?.homeScore}
                            initial={{ scale: 1.3, color: '#10b981' }}
                            animate={{ scale: 1, color: '#10b981' }}
                            className="text-8xl md:text-9xl font-black italic tabular-nums tracking-tighter"
                        >
                            {currentStep?.homeScore ?? 0}
                        </motion.span>
                    </div>
                    
                    <div className="flex items-center gap-8 py-4 px-10 rounded-[2rem] bg-stone-800/50 border border-white/10 shadow-inner">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Quarter</span>
                            <span className="text-2xl font-black text-white italic tracking-tighter leading-none">{currentStep?.quarter === 5 ? "OT" : `Q${currentStep?.quarter ?? 1}`}</span>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Clock</span>
                            <span className="text-2xl font-black text-emerald-400 italic tabular-nums tracking-tighter leading-none">{currentStep?.timeRemaining ?? "15:00"}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Momentum Bar */}
            <div className="w-full flex flex-col gap-3 px-4 max-w-sm">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/30">
                    <span>Momentum</span>
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                </div>
                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                    <motion.div 
                        initial={{ width: '50%' }}
                        animate={{ width: `${Math.min(100, Math.max(0, 50 + ((currentStep?.homeScore || 0) - (currentStep?.awayScore || 0)) * 5))}%` }}
                        className="absolute right-1/2 h-full bg-linear-to-l from-emerald-500 to-transparent transition-all duration-1000 origin-right"
                    />
                    <motion.div 
                        initial={{ width: '50%' }}
                        animate={{ width: `${Math.min(100, Math.max(0, 50 + ((currentStep?.awayScore || 0) - (currentStep?.homeScore || 0)) * 5))}%` }}
                        className="absolute left-1/2 h-full bg-linear-to-r from-emerald-500 to-transparent transition-all duration-1000 origin-left"
                    />
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30" />
                </div>
            </div>
          </div>

          {/* Home Team Card */}
          <motion.div 
            animate={{ 
                x: currentStep?.teamInPossessionId === homeTeam.id ? -10 : 0,
                scale: currentStep?.teamInPossessionId === homeTeam.id ? 1.05 : 1
            }}
            className="flex flex-col items-center gap-6 flex-1 min-w-[280px]"
          >
            <div className="relative">
                <div className={cn(
                    "w-48 h-48 md:w-64 md:h-64 rounded-[3rem] bg-linear-to-br from-white/10 to-transparent border-2 border-white/10 overflow-hidden flex items-center justify-center shadow-2xl transition-all duration-500",
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
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border-2 border-white/20">Possession</motion.div>
                )}
            </div>
            <div className="text-center">
              <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-1 drop-shadow-lg">{homeTeam.name}</h3>
              <p className="text-[10px] font-bold text-white/30 tracking-[0.3em] uppercase">Home Team</p>
            </div>
          </motion.div>
        </div>

        {/* Live Commentary Box */}
        <AnimatePresence mode="wait">
            <motion.div 
                key={currentStepIndex}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-4xl bg-stone-900/60 backdrop-blur-2xl border border-white/10 rounded-4xl p-10 flex flex-col items-center text-center gap-6 relative overflow-hidden shadow-2xl"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5 overflow-hidden">
                    <motion.div 
                        key={currentStepIndex}
                        initial={{ x: '-100%' }}
                        animate={{ x: '0%' }}
                        transition={{ duration: playbackSpeed / 1000, ease: 'linear' }}
                        className="h-full bg-emerald-500 shadow-[0_0_15px_#10b981]"
                    />
                </div>
                
                <div className="flex items-center gap-3 text-emerald-400 px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                     <TrendingUp className="w-4 h-4" />
                     <span className="text-[11px] font-black uppercase tracking-widest">Broadcast Commentary</span>
                </div>
                
                <h4 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-[1.1] max-w-3xl text-balance">
                    &ldquo;{currentStep?.commentary || currentStep?.description}&rdquo;
                </h4>
                
                <p className="text-white/40 text-base font-medium italic max-w-xl">
                    {currentStep?.description}
                </p>
            </motion.div>
        </AnimatePresence>

        {/* Ticker / History / Controls Area */}
        <div className="w-full max-w-5xl flex flex-col gap-6">
            <div className="flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-emerald-500" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/40">Broadcaster Log</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-lg">
                         <button onClick={() => setPlaybackSpeed(3500)} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", playbackSpeed === 3500 ? "bg-white text-stone-950 shadow-lg" : "text-white/40 hover:text-white")}>Normal</button>
                         <button onClick={() => setPlaybackSpeed(800)} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", playbackSpeed === 800 ? "bg-white text-stone-950 shadow-lg" : "text-white/40 hover:text-white")}>Turbo</button>
                    </div>
                    <button onClick={() => setIsPaused(!isPaused)} className="text-[11px] font-black uppercase bg-white/5 px-6 py-3 rounded-2xl text-white/60 hover:text-white border border-white/10 transition-all backdrop-blur-xl hover:bg-white/10">
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                </div>
            </div>
            
            <div 
                ref={tickerRef}
                className="h-64 bg-linear-to-b from-stone-900/80 to-stone-950/40 rounded-[3rem] border border-white/10 p-8 overflow-y-auto space-y-4 custom-scrollbar shadow-2xl backdrop-blur-sm"
            >
                {steps.slice(0, currentStepIndex + 1).map((s, i) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i} 
                        className={cn(
                            "flex items-center gap-6 p-4 rounded-3xl transition-all border",
                            i === currentStepIndex ? "bg-emerald-500/10 border-emerald-500/20 shadow-lg" : "border-transparent opacity-30"
                        )}
                    >
                        <div className="shrink-0 flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                            <span className="text-[10px] font-bold text-white/50 tracking-widest uppercase">{s.quarter > 4 ? "OT" : `Q${s.quarter}`}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            <span className="text-sm font-black text-emerald-400 tabular-nums">{s.timeRemaining}</span>
                        </div>
                        <p className={cn(
                            "text-base font-bold leading-tight",
                            i === currentStepIndex ? "text-white" : "text-white/60"
                        )}>
                            {s.description}
                        </p>
                        {i === currentStepIndex && <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }} className="ml-auto w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />}
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Global Action Overlay (TD / FG / INT) */}
        <AnimatePresence mode="wait">
            {(currentStep?.type === 'TOUCHDOWN' || currentStep?.type === 'FIELD_GOAL') && (
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0, y: 100 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 2, opacity: 0, y: -200 }}
                    className="fixed inset-0 z-101 pointer-events-none flex flex-col items-center justify-center p-20"
                >
                    <div className="relative">
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity }} className="absolute inset-0 bg-emerald-500 blur-[100px] opacity-50" />
                        <div className="relative bg-emerald-500 text-white px-20 py-10 rounded-[4rem] shadow-[0_0_100px_rgba(16,185,129,0.5)] border-8 border-white/40 transform -rotate-3">
                            <h2 className="text-8xl md:text-9xl font-black italic tracking-tighter uppercase leading-none text-shadow-2xl">
                                {currentStep.type === 'TOUCHDOWN' ? 'TOUCHDOWN!' : 'IT\'S GOOD!'}
                            </h2>
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
                    className="fixed inset-0 z-200 bg-stone-950/98 backdrop-blur-3xl flex items-center justify-center p-8 overflow-y-auto"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        className="w-full max-w-4xl bg-linear-to-br from-stone-900 via-stone-950 to-stone-900 rounded-[5rem] border-2 border-emerald-500/30 p-16 shadow-[0_0_150px_rgba(16,185,129,0.2)] relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                             <TrendingUp className="w-96 h-96 text-emerald-500" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col items-center gap-14 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity }}><Award className="w-16 h-16 text-emerald-400 mb-2" /></motion.div>
                                <h2 className="text-7xl font-black italic uppercase tracking-tighter drop-shadow-2xl">Half-time Report</h2>
                                <div className="h-1 w-32 bg-emerald-500/50 rounded-full mb-2" />
                                <p className="text-white/50 font-black uppercase tracking-[0.8em] text-[12px]">SPFL Primetime Show</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 w-full items-center">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-white/5 border border-white/10 relative overflow-hidden flex items-center justify-center shadow-2xl">
                                        {awayTeam.logoUrl ? <Image src={awayTeam.logoUrl} fill alt="" className="object-cover" /> : <Image src={awayRender} fill alt="" className="translate-y-2 object-contain" />}
                                    </div>
                                    <span className="text-7xl font-black italic tabular-nums text-emerald-400">{currentStep?.awayScore}</span>
                                    <span className="text-sm font-black uppercase text-white/60 tracking-widest">{awayTeam.name}</span>
                                </div>
                                
                                <div className="flex flex-col gap-8">
                                    {[
                                        { label: 'Total Offense', away: '245yd', home: '198yd', ratio: 0.6 },
                                        { label: 'First Downs', away: '12', home: '9', ratio: 0.55 },
                                        { label: 'Time of Poss.', away: '16:32', home: '13:28', ratio: 0.52 }
                                    ].map((stat, i) => (
                                        <div key={i} className="flex flex-col gap-3">
                                            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-white/40">
                                                <span>{stat.away}</span>
                                                <span className="text-emerald-500/60">{stat.label}</span>
                                                <span>{stat.home}</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex border border-white/5 shadow-inner">
                                                <div className="h-full bg-emerald-500/40" style={{ width: `${stat.ratio * 100}%` }}>
                                                    <div className="h-full bg-emerald-500 w-full rounded-r-full shadow-[0_0_10px_#10b981]" />
                                                </div>
                                                <div className="flex-1 bg-emerald-500/10" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col items-center gap-6">
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-white/5 border border-white/10 relative overflow-hidden flex items-center justify-center shadow-2xl">
                                        {homeTeam.logoUrl ? <Image src={homeTeam.logoUrl} fill alt="" className="object-cover" /> : <Image src={homeRender} fill alt="" className="translate-y-2 object-contain" />}
                                    </div>
                                    <span className="text-7xl font-black italic tabular-nums text-emerald-400">{currentStep?.homeScore}</span>
                                    <span className="text-sm font-black uppercase text-white/60 tracking-widest">{homeTeam.name}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowHalftime(false)}
                                className="h-20 px-20 rounded-full bg-emerald-500 text-white font-black uppercase tracking-widest text-base shadow-[0_0_50px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group"
                            >
                                Start Second Half
                                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Bottom CTA Area */}
        <div className="flex items-center gap-8 mt-12 bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                 <ShieldCheck className="w-5 h-5 text-emerald-400" />
                 <span className="text-[11px] font-black uppercase tracking-widest text-white/50">Sim Engine v5.0 (OT Enhanced)</span>
            </div>
            
            {currentStepIndex >= steps.length - 1 ? (
                <button 
                    onClick={handleFinish}
                    className="h-16 px-16 rounded-full bg-emerald-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 border-2 border-white/20"
                >
                    Finalize Result
                    <Trophy className="w-5 h-5 shadow-2xl" />
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
                    className="h-14 px-10 rounded-full bg-white/5 text-white/50 font-black uppercase tracking-widest text-[11px] border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center gap-4"
                >
                    <FastForward className="w-4 h-4" />
                    Skip to Final
                </button>
            )}
        </div>
      </div>
    </div>
  );
}

