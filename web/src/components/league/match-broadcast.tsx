"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useLeague } from "@/context/league-context";
import { simulateGameSteps, SoundEffectType } from "@/lib/league/gameSimulator";
import { generateBroadcastSequence, BroadcastStep } from "@/lib/league/broadcastEngine";
import { STUFFY_RENDER_MAP } from "@/lib/league/assetMap";
import { StuffyIcon } from "@/lib/league/types";
import { cn } from "@/lib/utils";
import { yardLineToFieldPercent, YARD_LINE_LABELS, ENDZONE_PCT, isRedZone } from "@/lib/league/fieldUtils";

// --- Audio Asset Map ---
// All files live in /public/sounds/. Each SoundEffectType maps to one .mp3.
// Updated: 2026-03-26T10:39:44-04:00
const SFX_MAP: Record<SoundEffectType, string> = {
  'WHISTLE':   '/sounds/Referee Whistle.mp3',       // Game start/end, OT only
  'CHEER':     '/sounds/Crowd Cheering 2.mp3',      // First downs, positive plays
  'OOH':       '/sounds/Crowd Cheering 1.mp3',      // Turnovers, sacks, negative
  'DRUM_ROLL': '/sounds/Crowd Cheering Stomping.mp3',// Quarter transitions
  'ZAP':       '/sounds/Crowd Cheering Clapping.mp3',// Misc excitement
  'FG_GOOD':   '/sounds/Crowd Cheering 3.mp3',      // Field goals made
  'TOUCHDOWN': '/sounds/Crowd Cheering 2.mp3',      // Touchdowns
  'KICKOFF':   '/sounds/Crowd Cheering Clapping.mp3' // Kickoffs, punts (NOT whistle)
};

// Background ambience file — loops at low volume during broadcast
const AMBIENT_TRACK = '/sounds/Crowd Cheering Stomping.mp3';



export default function MatchBroadcast() {
  const { activeBroadcastGameId, setActiveBroadcastGameId, games, teams, players, updateGameResult } = useLeague();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);
  const [showHalftime, setShowHalftime] = useState(false);
  const [interactionBoost, setInteractionBoost] = useState({ home: 0, away: 0 });
  
  const game = useMemo(() => games.find(g => g.id === activeBroadcastGameId), [games, activeBroadcastGameId]);
  const homeTeam = useMemo(() => teams.find(t => t.id === game?.homeTeamId), [teams, game]);
  const awayTeam = useMemo(() => teams.find(t => t.id === game?.awayTeamId), [teams, game]);

  const [localSteps, setLocalSteps] = useState<BroadcastStep[]>([]);
  const stepsInitialized = useRef(false);

  // Initial Simulation
  useEffect(() => {
    if (!game || !homeTeam || !awayTeam || stepsInitialized.current) return;
    const initialSteps = simulateGameSteps(game, homeTeam, awayTeam, interactionBoost);
    const broadcastSequence = generateBroadcastSequence(initialSteps, homeTeam, awayTeam, players);
    setLocalSteps(broadcastSequence);
    stepsInitialized.current = true;
  }, [game, homeTeam, awayTeam, interactionBoost, players]);

  // Boost influence: interaction boosts are applied at simulation init time.
  // Re-simulation mid-game would cause visual jumps, so boosts affect
  // the momentum bar and are baked into the next broadcast session.

  const currentStep: BroadcastStep | undefined = localSteps[currentStepIndex];
  const tickerRef = useRef<HTMLDivElement>(null);

  const playSFX = useCallback((type?: SoundEffectType) => {
    if (!type || isMuted) return;
    const url = SFX_MAP[type];
    if (url) {
      const audio = new Audio(url);
      audio.volume = 0.4;
      audio.play().catch(() => {});
    }
  }, [isMuted]);

  // Dynamic Pacing Logic
  useEffect(() => {
    if (isPaused || currentStepIndex >= localSteps.length - 1 || !activeBroadcastGameId || showHalftime) return;

    const baseDelay = currentStep?.playbackDelay || (isTurbo ? 1500 : 4500); 
    const delay = isTurbo ? Math.min(1000, baseDelay / 4) : baseDelay;

    const timer = setTimeout(() => {
      const nextIndex = currentStepIndex + 1;
      const nextStep = localSteps[nextIndex];
      
      if (nextStep?.type === 'HALF_TIME') {
        setShowHalftime(true);
      }
      
      setCurrentStepIndex(nextIndex);
      playSFX(nextStep?.soundEffect);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStepIndex, isPaused, isTurbo, localSteps, activeBroadcastGameId, showHalftime, playSFX, currentStep?.playbackDelay]);

  useEffect(() => {
    if (tickerRef.current) {
        tickerRef.current.scrollTop = tickerRef.current.scrollHeight;
    }
  }, [currentStepIndex]);

  // Background Ambience
  useEffect(() => {
    if (isMuted || !activeBroadcastGameId) return;
    const crowd = new Audio(AMBIENT_TRACK);
    crowd.loop = true;
    crowd.volume = 0.1;
    crowd.play().catch(() => {});
    return () => {
        crowd.pause();
        crowd.src = "";
    };
  }, [isMuted, activeBroadcastGameId]);

  if (!activeBroadcastGameId || !game || !homeTeam || !awayTeam) return null;

  const handleFinish = () => {
    const lastStep = localSteps[localSteps.length - 1];
    const winnerId = lastStep.homeScore > lastStep.awayScore 
      ? homeTeam.id 
      : (lastStep.homeScore < lastStep.awayScore ? awayTeam.id : 'tie');
    
    updateGameResult(game.id, lastStep.homeScore, lastStep.awayScore, winnerId);
    setActiveBroadcastGameId(null);
    setCurrentStepIndex(0);
    setShowHalftime(false);
    stepsInitialized.current = false;
  };

  const handleInteraction = (type: 'CHEER' | 'BOO') => {
    if (type === 'CHEER') {
      setInteractionBoost(prev => ({ ...prev, home: prev.home + 1 }));
    } else {
      // Booing the away team helps the home team's relative momentum
      setInteractionBoost(prev => ({ ...prev, home: prev.home + 0.5, away: prev.away - 0.5 }));
    }
    playSFX(type === 'CHEER' ? 'CHEER' : 'OOH');
  };

  const homeRender = STUFFY_RENDER_MAP[homeTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
  const awayRender = STUFFY_RENDER_MAP[awayTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;



  return (
    <div className="fixed inset-0 z-100 bg-stone-950 flex flex-col items-center overflow-y-auto font-sans selection:bg-emerald-500/10 selection:text-emerald-700 scroll-smooth antialiased elite-broadcast">
      {/* Background Graphic */}
      <div className="fixed inset-0 -z-10 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#10b98120_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[40px_40px]" />
      </div>

      <div className="w-full max-w-5xl flex flex-col items-center gap-4 relative px-6 pt-4 pb-32">
        
        {/* Action Bar */}
        <div className="w-full flex justify-end items-center gap-3 mb-4">
            <button onClick={() => setIsTurbo(!isTurbo)} className={cn("px-4 py-2 rounded-xl text-xs border font-black transition-all", isTurbo ? "bg-yellow-400 text-black border-yellow-500 shadow-[0_4px_0_#ca8a04]" : "bg-white/5 text-white/50 border-white/10")}>
                {isTurbo ? 'TURBO ON' : 'TURBO OFF'}
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button onClick={handleFinish} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <X className="w-4 h-4 text-white/50" />
            </button>
        </div>

        {/* Elite Score Header */}
        <div className="w-full bg-linear-to-b from-stone-800 to-stone-900 border-b-2 border-white/10 shadow-2xl p-4 flex flex-col md:flex-row items-center justify-between rounded-2xl gap-4">
            <div className="flex flex-col items-center flex-1">
                <span className="text-xs text-white/40 uppercase tracking-[0.3em] font-black mb-1">Away Team</span>
                <span className="text-xl md:text-2xl text-rose-400 font-black text-center uppercase tracking-tight italic">{awayTeam.name}</span>
                <motion.span key={currentStep?.awayScore} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-6xl md:text-7xl font-black tabular-nums">{currentStep?.awayScore ?? 0}</motion.span>
                <div className="flex gap-1 mt-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={cn("w-2 h-2 rounded-full", i < (3 + interactionBoost.away) ? "bg-rose-500" : "bg-white/5")} />
                    ))}
                </div>
            </div>
            
            <div className="flex flex-col items-center gap-1 px-8 border-x border-white/5">
                <div className="bg-black/40 px-6 py-2 rounded-lg border border-white/5">
                    <span className="text-4xl text-emerald-400 tabular-nums font-black">{currentStep?.timeRemaining}</span>
                </div>
                <div className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                    {currentStep?.quarter === 5 ? "OVERTIME" : `QUARTER ${currentStep?.quarter ?? 1}`}
                </div>
                <div className="text-yellow-400 text-xs font-black tracking-widest mt-2 px-3 py-1 bg-yellow-400/10 rounded-full">
                    {currentStep?.down ? `${currentStep.down} & ${currentStep.distance}` : "KICKOFF"}
                </div>
            </div>
 
            <div className="flex flex-col items-center flex-1 text-right">
                <span className="text-xs text-white/40 uppercase tracking-[0.3em] font-black mb-1">Home Team</span>
                <span className="text-xl md:text-2xl text-cyan-400 font-black text-center uppercase tracking-tight italic">{homeTeam.name}</span>
                <motion.span key={currentStep?.homeScore} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-6xl md:text-7xl font-black tabular-nums">{currentStep?.homeScore ?? 0}</motion.span>
                <div className="flex gap-1 mt-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={cn("w-2 h-2 rounded-full", i < (3 + interactionBoost.home) ? "bg-cyan-500" : "bg-white/5")} />
                    ))}
                </div>
            </div>
        </div>


        {/* Football Field — 120-yard model: [Away EZ][100yd play][Home EZ] */}
        <div className="w-full flex flex-col items-center gap-6 bg-stone-900 border border-white/5 p-6 rounded-4xl shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)] pointer-events-none" />

            <div className="w-full h-28 relative overflow-hidden flex items-stretch border-2 border-white/20 shadow-inner rounded-lg">

                {/* Away Endzone (left) */}
                <div
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{ width: `${ENDZONE_PCT}%`, background: 'linear-gradient(135deg, #881337 0%, #9f1239 100%)' }}
                >
                  <span className="rotate-270 text-[9px] font-black text-white/50 uppercase tracking-widest whitespace-nowrap">
                    {awayTeam.name}
                  </span>
                  <div className="absolute inset-0 border-r-2 border-white/30" />
                </div>

                {/* 100 Yards of Play — 10 segments */}
                <div className="flex-1 relative bg-linear-to-r from-emerald-800 via-emerald-700 to-emerald-800 flex">

                  {/* 10 equal segments with yard lines between them */}
                  {[...Array(10)].map((_, i) => {
                    // Labels at each yard line: 10, 20, 30, 40, 50, 40, 30, 20, 10
                    // YARD_LINE_LABELS = ['G','10','20','30','40','50','40','30','20','10','G']
                    // Label at the RIGHT edge of segment i = YARD_LINE_LABELS[i+1]
                    const label = YARD_LINE_LABELS[i + 1];
                    return (
                      <div key={i} className="flex-1 relative border-r border-white/25 last:border-r-0">
                        {/* Bottom yard-line number */}
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-black text-white/30 italic select-none">
                          {label !== 'G' ? label : ''}
                        </span>

                        {/* Hashmarks — 4 rows of small tick marks */}
                        <div className="absolute inset-0 flex flex-col justify-between py-2 opacity-15 pointer-events-none">
                          {[0, 1, 2, 3].map(j => (
                            <div key={j} className="flex w-full">
                              {[...Array(5)].map((_, k) => (
                                <div key={k} className="flex-1 border-r border-white/30 h-1" />
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Red zone shading — opponent's 20 */}
                  {isRedZone(currentStep?.yardLine ?? 0) && (
                    <div
                      className="absolute top-0 h-full bg-red-500/10 pointer-events-none transition-opacity duration-500"
                      style={{
                        // Red zone covers the last 20% of the play area, on the side the offense is attacking
                        ...(currentStep?.sideOfField === 'AWAY'
                          ? { right: 0, width: '20%' }
                          : { left: 0, width: '20%' })
                      }}
                    />
                  )}

                  {/* 50-yard line highlight */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-px w-0.5 bg-white/40 pointer-events-none" />

                  {/* Ball marker — positioned via fieldUtils */}
                  <motion.div
                    animate={{
                      left: `${
                        // Map simulator coords to % within the PLAY AREA (not full field)
                        // yardLineToFieldPercent returns % of full 120yd field.
                        // Subtract left endzone %, then scale to play area only.
                        ((yardLineToFieldPercent(currentStep?.yardLine ?? 25, currentStep?.sideOfField ?? 'AWAY') - ENDZONE_PCT)
                          / (100 - 2 * ENDZONE_PCT)) * 100
                      }%`
                    }}
                    transition={{ type: "spring", stiffness: 60, damping: 18 }}
                    className="absolute top-1/2 -translate-y-1/2 w-10 h-10 -translate-x-1/2 flex items-center justify-center z-10"
                  >
                    {/* CSS football shape */}
                    <div className="relative w-8 h-5 bg-[#6b3e23] rounded-[100%] border-2 border-white/50 shadow-lg shadow-black/50">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 items-center">
                        <div className="w-5 h-px bg-white/80 rounded-full" />
                        <div className="flex gap-px">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className="w-px h-1 bg-white/70 rounded-full" />
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Team color indicator below ball */}
                    <div className="absolute top-full mt-0.5 w-full flex justify-center">
                      <div className={cn(
                        "w-1.5 h-2.5 rounded-full blur-[2px]",
                        currentStep?.teamInPossessionId === homeTeam.id ? "bg-cyan-400" : "bg-rose-400"
                      )} />
                    </div>
                  </motion.div>
                </div>

                {/* Home Endzone (right) */}
                <div
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{ width: `${ENDZONE_PCT}%`, background: 'linear-gradient(135deg, #0e7490 0%, #155e75 100%)' }}
                >
                  <span className="rotate-90 text-[9px] font-black text-white/50 uppercase tracking-widest whitespace-nowrap">
                    {homeTeam.name}
                  </span>
                  <div className="absolute inset-0 border-l-2 border-white/30" />
                </div>
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-12 w-full mt-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
                         <div className={cn("absolute inset-0 bg-rose-500/20 blur-3xl transition-opacity", currentStep?.teamInPossessionId === awayTeam.id ? "opacity-100" : "opacity-0")} />
                         {awayTeam.logoUrl ? <Image src={awayTeam.logoUrl} fill className="object-cover scale-105" alt="" sizes="192px" /> : <Image src={awayRender} fill className="object-contain drop-shadow-2xl scale-110 translate-y-2" alt="" sizes="192px" />}
                    </div>
                    {/* Away Interactions */}
                    <div className="flex gap-2">
                         <button onClick={() => handleInteraction('BOO')} className="bg-rose-500 text-white px-6 py-2 rounded-xl text-xs hover:scale-110 active:bg-white active:text-stone-950 transition-all shadow-lg shadow-rose-500/20 font-black">BOO AWAY</button>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4 min-h-[160px] justify-center text-center">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={currentStepIndex}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            className="space-y-4"
                        >
                            <h2 className="text-3xl md:text-4xl text-white font-black leading-tight italic tracking-tight">
                                {currentStep?.commentary || "GAME ON!"}
                            </h2>
                            <p className="text-emerald-400 text-base md:text-lg font-bold tracking-tight max-w-sm mx-auto uppercase">
                                {currentStep?.description}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
                         <div className={cn("absolute inset-0 bg-cyan-500/20 blur-3xl transition-opacity", currentStep?.teamInPossessionId === homeTeam.id ? "opacity-100" : "opacity-0")} />
                         {homeTeam.logoUrl ? <Image src={homeTeam.logoUrl} fill className="object-cover scale-105" alt="" sizes="192px" /> : <Image src={homeRender} fill className="object-contain drop-shadow-2xl scale-110 translate-y-2" alt="" sizes="192px" />}
                    </div>
                    {/* Home Interactions */}
                    <div className="flex gap-2">
                         <button onClick={() => handleInteraction('CHEER')} className="bg-cyan-500 text-white px-6 py-2 rounded-xl text-xs hover:scale-110 active:bg-white active:text-stone-950 transition-all shadow-lg shadow-cyan-500/20 font-black">CHEER HOME</button>
                         <button onClick={() => handleInteraction('BOO')} className="bg-stone-800 text-white px-6 py-2 rounded-xl text-xs hover:scale-110 active:bg-cyan-500 transition-all font-black">BOO HOME</button>
                    </div>
                </div>
            </div>
        </div>

        {/* Character Pop-up Celebration */}
        <AnimatePresence>
            {currentStep?.isScoringPlay && (
                <motion.div 
                    initial={{ scale: 0, rotate: -30, x: -500, y: 500 }}
                    animate={{ scale: 1, rotate: 0, x: 0, y: 0 }}
                    exit={{ scale: 3, opacity: 0, x: 500, y: -500 }}
                    className="fixed inset-0 z-101 flex items-center justify-center pointer-events-none p-10"
                >
                    <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] animate-pulse" />
                        <div className="bg-stone-900/90 p-12 border-8 border-white shadow-[0_0_100px_#10b981] -rotate-3 text-center rounded-3xl relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-white to-transparent opacity-50" />
                             
                             {/* Generated Mascot */}
                             <div className="relative w-64 h-64 mx-auto mb-6">
                                <Image 
                                    src="/arcade_mascot.png" 
                                    fill 
                                    className="object-contain drop-shadow-[0_0_20px_white]" 
                                    alt="TOUCHDOWN!" 
                                />
                             </div>

                             <h1 className="text-6xl md:text-7xl text-white font-black tracking-tighter italic">
                                 {currentStep.type === 'TOUCHDOWN' ? 'TOUCHDOWN!' : 'IT\'S GOOD!'}
                             </h1>
                             <div className="text-emerald-400 text-2xl mt-4 font-black tracking-[0.5em] animate-pulse">
                                 CHAMPIONSHIP PERFORMANCE!
                             </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {showHalftime && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-200 bg-stone-950/98 flex items-center justify-center p-4 md:p-8 backdrop-blur-md">
                    <div className="w-full max-w-4xl bg-stone-900 border-2 border-white/10 p-8 md:p-12 text-center shadow-2xl rounded-3xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-rose-500 via-emerald-500 to-cyan-500" />
                        <h2 className="text-4xl md:text-5xl mb-12 text-white font-black italic tracking-tighter uppercase">STUFFY LEAGUE REPORT</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-16">
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 rounded-full border-4 border-rose-500/20 mb-4 overflow-hidden bg-rose-500/10 flex items-center justify-center">
                                    <span className="text-5xl font-black text-rose-400">{currentStep?.awayScore}</span>
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-white/60">{awayTeam.name}</span>
                            </div>
                             <div className="space-y-6 flex-1 max-w-xs px-4">
                                <div className="flex justify-between text-[11px] md:text-sm text-white/90 border-b border-white/5 pb-3">
                                    <span className="font-black italic">{currentStep?.stats?.away.totalYards} YDS</span>
                                    <span className="text-white/20 font-black uppercase tracking-widest text-[9px]">TOTAL OFFENSE</span>
                                    <span className="font-black italic">{currentStep?.stats?.home.totalYards} YDS</span>
                                </div>
                                <div className="flex justify-between text-[11px] md:text-sm text-white/90 border-b border-white/5 pb-3">
                                    <span className="font-black italic">{currentStep?.stats?.away.firstDowns}</span>
                                    <span className="text-white/20 font-black uppercase tracking-widest text-[9px]">1ST DOWNS</span>
                                    <span className="font-black italic">{currentStep?.stats?.home.firstDowns}</span>
                                </div>
                                <div className="flex justify-between text-[11px] md:text-sm text-white/90">
                                    <span className="font-black italic">{currentStep?.stats?.away.turnovers}</span>
                                    <span className="text-white/20 font-black uppercase tracking-widest text-[9px]">TURNOVERS</span>
                                    <span className="font-black italic">{currentStep?.stats?.home.turnovers}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 rounded-full border-4 border-cyan-500/20 mb-4 overflow-hidden bg-cyan-500/10 flex items-center justify-center">
                                    <span className="text-5xl font-black text-cyan-400">{currentStep?.homeScore}</span>
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-white/60">{homeTeam.name}</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowHalftime(false)} 
                            className="bg-emerald-500 text-stone-950 px-16 py-4 rounded-xl text-lg font-black uppercase tracking-widest hover:bg-white transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20"
                        >
                            Start Second Half
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* Bottom Ticker & Log */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col scale-90 md:scale-100 origin-bottom">
            <div className="w-full flex items-center bg-stone-900 border-t-2 border-white/10 p-4 gap-6 overflow-hidden backdrop-blur-sm">
                <div className="bg-emerald-500 text-stone-950 px-6 py-1 flex items-center gap-2 rounded-full">
                    <Zap className="w-4 h-4 fill-current" />
                    <span className="text-xs font-black uppercase tracking-widest">PRO BROADCAST</span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <motion.div animate={{ x: ['100%', '-100%'] }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} className="flex gap-24 whitespace-nowrap text-white/60 font-black uppercase text-[11px] tracking-[0.2em] italic">
                        <span>STUFFY LEAGUE ELITE: {homeTeam.name} vs {awayTeam.name}</span>
                        <span>NEXT GENERATION SPORTS BROADCAST ENGINE v6.0</span>
                        <span>INTERACTIVE STADIUM MOMENTUM ACTIVE</span>
                        <span>OFFICIAL COLLEGIATE OVERTIME RULES APPLIED</span>
                    </motion.div>
                </div>
                <button onClick={() => setIsPaused(!isPaused)} className="text-[10px] border-2 border-white/5 bg-white/5 px-6 py-2 hover:bg-white hover:text-stone-950 transition-all font-black rounded-full uppercase tracking-widest">
                    {isPaused ? 'RESUME PLAY' : 'PAUSE SIM'}
                </button>
            </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        .blink {
            animation: blink 1s step-end infinite;
        }
         .elite-broadcast {
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </div>
  );
}


