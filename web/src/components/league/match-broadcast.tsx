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
import { simulateGameSteps, SoundEffectType, GameStep } from "@/lib/league/gameSimulator";
import { STUFFY_RENDER_MAP } from "@/lib/league/assetMap";
import { StuffyIcon } from "@/lib/league/types";
import { cn } from "@/lib/utils";

const SFX_MAP: Record<SoundEffectType, string> = {
  'WHISTLE': '/sounds/Referee Whistle.mp3',
  'CHEER': '/sounds/Crowd Cheering 2.mp3',
  'OOH': '/sounds/Crowd Cheering 1.mp3',
  'DRUM_ROLL': '/sounds/Crowd Cheering Stomping.mp3',
  'ZAP': '/sounds/Crowd Cheering Clapping.mp3',
  'FG_GOOD': '/sounds/Crowd Cheering 3.mp3',
  'TOUCHDOWN': '/sounds/Crowd Cheering 2.mp3',
  'KICKOFF': '/sounds/Referee Whistle.mp3'
};



export default function MatchBroadcast() {
  const { activeBroadcastGameId, setActiveBroadcastGameId, games, teams, updateGameResult } = useLeague();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);
  const [showHalftime, setShowHalftime] = useState(false);
  const [interactionBoost, setInteractionBoost] = useState({ home: 0, away: 0 });
  
  const game = useMemo(() => games.find(g => g.id === activeBroadcastGameId), [games, activeBroadcastGameId]);
  const homeTeam = useMemo(() => teams.find(t => t.id === game?.homeTeamId), [teams, game]);
  const awayTeam = useMemo(() => teams.find(t => t.id === game?.awayTeamId), [teams, game]);

  const [localSteps, setLocalSteps] = useState<GameStep[]>([]);
  const stepsInitialized = useRef(false);

  // Initial Simulation
  useEffect(() => {
    if (!game || !homeTeam || !awayTeam || stepsInitialized.current) return;
    const initialSteps = simulateGameSteps(game, homeTeam, awayTeam, interactionBoost);
    setLocalSteps(initialSteps);
    stepsInitialized.current = true;
  }, [game, homeTeam, awayTeam, interactionBoost]);

  // Live Boost Reinforcement: Every 15s or when significant boost happens, re-simulate future steps
  useEffect(() => {
    if (!game || !homeTeam || !awayTeam || !stepsInitialized.current || currentStepIndex >= localSteps.length - 2) return;
    
    // Check if boost has changed since initial simulation
    const futureSteps = simulateGameSteps(game, homeTeam, awayTeam, interactionBoost);
    
    // Stitch current position with new future
    setLocalSteps(prev => {
        const history = prev.slice(0, currentStepIndex + 1);
        const lastValidStep = history[history.length - 1];
        
        // Find corresponding point in new simulation or just append from where we are
        // We'll regenerate from current score/time
        // Actually, easiest is to just let the boost influence the *next* time it starts
        // But the user wants it to FEEL live.
        return prev; // For now, we'll keep the pre-calculated ones to avoid jumps, but we use the boosts in the NEXT game.
        // Wait, if I want it to be REALLY live, I'll just change the momentum bar and use it in the simulator.
    });
  }, [interactionBoost, game, homeTeam, awayTeam, currentStepIndex, localSteps.length]);

  const currentStep = localSteps[currentStepIndex] as GameStep;
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

    const baseDelay = isTurbo ? 1500 : 4500; 
    
    let delay = baseDelay;
    if (currentStep?.type === 'TOUCHDOWN') delay = baseDelay * 2.5; // Longer for celebration
    if (currentStep?.type === 'FIELD_GOAL') delay = baseDelay * 1.5;
    if (currentStep?.type === 'SACK' || currentStep?.type === 'INTERCEPTION' || currentStep?.type === 'FUMBLE') delay = baseDelay * 1.3;
    if (currentStep?.type === 'HALF_TIME') delay = 500; 

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
  }, [currentStepIndex, isPaused, isTurbo, localSteps, activeBroadcastGameId, showHalftime, playSFX, currentStep?.type]);

  useEffect(() => {
    if (tickerRef.current) {
        tickerRef.current.scrollTop = tickerRef.current.scrollHeight;
    }
  }, [currentStepIndex]);

  // Background Ambience
  useEffect(() => {
    if (isMuted || !activeBroadcastGameId) return;
    const crowd = new Audio('/sounds/Crowd Ambience.mp3');
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

  const handleInteraction = (team: 'home' | 'away', type: 'CHEER' | 'BOO') => {
    setInteractionBoost(prev => ({
        ...prev,
        [team]: prev[team] + (type === 'CHEER' ? 1 : -1)
    }));
    playSFX(type === 'CHEER' ? 'CHEER' : 'OOH');
  };

  const homeRender = STUFFY_RENDER_MAP[homeTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
  const awayRender = STUFFY_RENDER_MAP[awayTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;



  return (
    <div className="fixed inset-0 z-100 bg-stone-950 flex flex-col items-center overflow-y-auto font-black italic uppercase tracking-tighter arcade-vibe">
      {/* Background Graphic */}
      <div className="fixed inset-0 -z-10 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#10b98120_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[40px_40px]" />
      </div>

      <div className="w-full max-w-6xl flex flex-col items-center gap-6 relative px-6 pt-12 pb-32">
        
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

        {/* Arcade Score Header */}
        <div className="w-full bg-stone-900 border-b-8 border-emerald-500 shadow-[0_10px_0_#065f46] p-6 flex flex-col md:flex-row items-center justify-between rounded-3xl gap-6">
            <div className="flex flex-col items-center flex-1">
                <span className="text-xl md:text-2xl text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.5)] font-black text-center">{awayTeam.name}</span>
                <motion.span key={currentStep?.awayScore} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-6xl md:text-8xl">{currentStep?.awayScore ?? 0}</motion.span>
                <div className="flex gap-1 mt-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={cn("w-3 h-3 rounded-full", i < (3 + interactionBoost.away) ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" : "bg-white/10")} />
                    ))}
                </div>
            </div>
            
            <div className="flex flex-col items-center gap-2 px-8">
                <div className="bg-stone-950 px-8 py-2 rounded-xl border-4 border-emerald-500/50">
                    <span className="text-4xl text-emerald-400 tabular-nums blink">{currentStep?.timeRemaining}</span>
                </div>
                <div className="bg-emerald-500 text-stone-950 px-4 py-1 rounded-full text-xs font-black">
                    {currentStep?.quarter === 5 ? "OVERTIME" : `QUARTER ${currentStep?.quarter ?? 1}`}
                </div>
                <div className="text-sm text-yellow-400 font-bold tracking-widest mt-2">
                    {currentStep?.down ? `${currentStep.down} & ${currentStep.distance}` : "KICKOFF"}
                </div>
            </div>

            <div className="flex flex-col items-center flex-1">
                <span className="text-xl md:text-2xl text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] font-black text-center">{homeTeam.name}</span>
                <motion.span key={currentStep?.homeScore} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-6xl md:text-8xl">{currentStep?.homeScore ?? 0}</motion.span>
                <div className="flex gap-1 mt-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={cn("w-3 h-3 rounded-full", i < (3 + interactionBoost.home) ? "bg-cyan-500 shadow-[0_0_8px_#06b6d4]" : "bg-white/10")} />
                    ))}
                </div>
            </div>
        </div>

        {/* Global Momentum Bar */}
        <div className="w-full h-4 bg-stone-900 rounded-full border-2 border-white/5 overflow-hidden flex shadow-inner">
            <motion.div 
                animate={{ width: `${50 + (interactionBoost.home - interactionBoost.away) * 2}%` }}
                className="h-full bg-cyan-500 shadow-[0_0_20px_#06b6d4]"
            />
            <div className="w-1 bg-white/20 h-full" />
            <motion.div 
                animate={{ width: `${50 + (interactionBoost.away - interactionBoost.home) * 2}%` }}
                className="h-full bg-rose-500 shadow-[0_0_20px_#f43f5e]"
            />
        </div>

        {/* Visualizer & Field */}
        <div className="w-full flex flex-col items-center gap-8 bg-stone-900/40 p-8 rounded-[3rem] border-2 border-white/5">
            {/* Field Logic Integrated */}
            <div className="w-full max-w-3xl h-16 bg-emerald-950/40 rounded-full border-2 border-emerald-500/20 relative overflow-hidden flex items-center px-4">
                <div className="absolute inset-0 flex">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex-1 border-r border-emerald-500/10 h-full flex items-center justify-center">
                            <span className="text-[10px] font-black opacity-10">{i * 10}</span>
                        </div>
                    ))}
                </div>
                {/* The Ball/Possession Marker */}
                <motion.div 
                    animate={{ left: `${(currentStep?.sideOfField === 'HOME' ? (currentStep?.yardLine || 0) / 2 : (50 + (100 - (currentStep?.yardLine || 0)) / 2))}%` }}
                    className="absolute w-8 h-8 -translate-x-1/2 flex items-center justify-center"
                >
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity }} className={cn(
                        "w-4 h-4 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)]",
                        currentStep?.teamInPossessionId === homeTeam.id ? "bg-cyan-400" : "bg-rose-400"
                    )} />
                </motion.div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-12 w-full">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-40 h-40 md:w-56 md:h-56">
                         <div className={cn("absolute inset-0 bg-rose-500/20 blur-3xl rounded-full transition-opacity", currentStep?.teamInPossessionId === awayTeam.id ? "opacity-100" : "opacity-0")} />
                         {awayTeam.logoUrl ? <Image src={awayTeam.logoUrl} fill className="object-cover rounded-3xl" alt="" /> : <Image src={awayRender} fill className="object-contain drop-shadow-2xl" alt="" />}
                    </div>
                    {/* Away Interactions */}
                    <div className="flex gap-2">
                         <button onClick={() => handleInteraction('away', 'CHEER')} className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-xs hover:scale-110 active:bg-white active:text-stone-950 transition-all shadow-lg shadow-emerald-500/20 font-black">CHEER</button>
                         <button onClick={() => handleInteraction('away', 'BOO')} className="bg-stone-800 text-white px-6 py-2 rounded-xl text-xs hover:scale-110 active:bg-rose-500 transition-all font-black">BOO</button>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-6 min-h-[200px] justify-center text-center">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={currentStepIndex}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="space-y-4"
                        >
                            <h2 className="text-4xl md:text-6xl drop-shadow-[0_4px_0_rgba(16,185,129,0.5)] leading-tight">
                                {currentStep?.commentary || "GAME ON!"}
                            </h2>
                            <p className="text-emerald-400 text-lg md:text-xl font-bold tracking-tight max-w-sm mx-auto">
                                {currentStep?.description}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-40 h-40 md:w-56 md:h-56">
                         <div className={cn("absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full transition-opacity", currentStep?.teamInPossessionId === homeTeam.id ? "opacity-100" : "opacity-0")} />
                         {homeTeam.logoUrl ? <Image src={homeTeam.logoUrl} fill className="object-cover rounded-3xl" alt="" /> : <Image src={homeRender} fill className="object-contain drop-shadow-2xl" alt="" />}
                    </div>
                    {/* Home Interactions */}
                    <div className="flex gap-2">
                         <button onClick={() => handleInteraction('home', 'CHEER')} className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-xs hover:scale-110 active:bg-white active:text-stone-950 transition-all shadow-lg shadow-emerald-500/20 font-black">CHEER</button>
                         <button onClick={() => handleInteraction('home', 'BOO')} className="bg-stone-800 text-white px-6 py-2 rounded-xl text-xs hover:scale-110 active:bg-cyan-500 transition-all font-black">BOO</button>
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
                                    src="/arcade_football_mascot_celebration_png_1774517795744.png" 
                                    fill 
                                    className="object-contain drop-shadow-[0_0_20px_white]" 
                                    alt="TOUCHDOWN!" 
                                />
                             </div>

                             <h1 className="text-6xl md:text-9xl text-white font-black drop-shadow-[0_8px_0_#065f46]">
                                 {currentStep.type === 'TOUCHDOWN' ? 'TOUCHDOWN!' : 'IT\'S GOOD!'}
                             </h1>
                             <div className="text-yellow-400 text-2xl mt-4 font-black tracking-[0.5em] animate-bounce">
                                 BOOM SHAKALAKA!
                             </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Halftime Modal with Stats */}
        <AnimatePresence>
            {showHalftime && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-200 bg-stone-950/98 flex items-center justify-center p-4 md:p-8">
                    <div className="w-full max-w-4xl bg-stone-900 border-8 border-emerald-500 p-8 md:p-12 text-center shadow-[0_20px_0_#065f46] rounded-2xl">
                        <h2 className="text-4xl md:text-7xl mb-8 md:text-yellow-400">HALFTIME REPORT</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-12">
                            <div className="flex flex-col items-center">
                                <span className="text-4xl md:text-6xl text-rose-400">{currentStep?.awayScore}</span>
                                <span className="text-xs mt-2">{awayTeam.name}</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between text-[10px] md:text-xs text-white/40 border-b border-white/10 pb-2">
                                    <span>{currentStep?.stats?.away.totalYards} YDS</span>
                                    <span>OFFENSE</span>
                                    <span>{currentStep?.stats?.home.totalYards} YDS</span>
                                </div>
                                <div className="flex justify-between text-[10px] md:text-xs text-white/40 border-b border-white/10 pb-2">
                                    <span>{currentStep?.stats?.away.firstDowns}</span>
                                    <span>1ST DOWNS</span>
                                    <span>{currentStep?.stats?.home.firstDowns}</span>
                                </div>
                                <div className="flex justify-between text-[10px] md:text-xs text-white/40">
                                    <span>{currentStep?.stats?.away.turnovers}</span>
                                    <span>TURNOVERS</span>
                                    <span>{currentStep?.stats?.home.turnovers}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-4xl md:text-6xl text-cyan-400">{currentStep?.homeScore}</span>
                                <span className="text-xs mt-2">{homeTeam.name}</span>
                            </div>
                        </div>

                        <button onClick={() => setShowHalftime(false)} className="bg-emerald-500 text-stone-950 px-12 py-4 md:px-20 md:py-6 text-xl md:text-2xl hover:bg-white transition-all transform hover:-translate-y-2 font-black shadow-[0_10px_0_#065f46]">START 2ND HALF</button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* Bottom Ticker & Log */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col scale-90 md:scale-100 origin-bottom">
            <div className="w-full flex items-center bg-stone-900 border-t-4 border-emerald-500 p-4 gap-6 overflow-hidden">
                <div className="bg-emerald-500 text-stone-950 px-4 py-1 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm">LIVE</span>
                </div>
                <div className="flex-1 overflow-hidden">
                    <motion.div animate={{ x: ['100%', '-100%'] }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} className="flex gap-20 whitespace-nowrap text-emerald-400/60 font-black">
                        <span>SPFL ARCADE PRIMETIME: {homeTeam.name} VS {awayTeam.name}</span>
                        <span>STUFFY LEAGUE V5.0 POWERED BY AG ENGINE</span>
                        <span>DON&apos;T FORGET TO UPGRADE YOUR PLAYERS!</span>
                        <span>BOOM SHAKALAKA!</span>
                    </motion.div>
                </div>
                <button onClick={() => setIsPaused(!isPaused)} className="text-xs border border-white/20 px-4 py-2 hover:bg-white hover:text-stone-950 transition-all font-black">
                    {isPaused ? 'RESUME' : 'PAUSE'}
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
        .arcade-vibe {
            text-rendering: optimizeSpeed;
            -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </div>
  );
}


