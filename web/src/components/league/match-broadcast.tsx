"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
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
import { generateTickerItems } from '@/lib/league/tickerEngine';
import { StuffyIcon, Team, Player } from "@/lib/league/types";
import { cn } from "@/lib/utils";
import { yardLineToFieldPercent, ENDZONE_PCT, isRedZone } from "@/lib/league/fieldUtils";

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



// Last Updated: 2026-03-26T15:27:10-04:00

export default function MatchBroadcast() {
  const { 
    activeBroadcastGameId, setActiveBroadcastGameId, games, playoffGames, 
    teams, players, updateGameResult, updatePlayoffGameResult, currentWeek 
  } = useLeague();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);
  const [showHalftime, setShowHalftime] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [interactionBoost, setInteractionBoost] = useState({ home: 0, away: 0 });
  const [shakeKey, setShakeKey] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; emoji: string }>>([]);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const particleIdRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const game = useMemo(() => {
    const regularGame = games.find(g => g.id === activeBroadcastGameId);
    if (regularGame) return regularGame;
    
    const playoffGame = playoffGames.find(g => g.id === activeBroadcastGameId);
    if (playoffGame) {
      // Normalize PlayoffGame to Game interface for the broadcast engine
      return {
        id: playoffGame.id,
        week: 100, // Dummy week for playoffs
        homeTeamId: playoffGame.team1Id!,
        awayTeamId: playoffGame.team2Id!,
        homeScore: playoffGame.team1Score,
        awayScore: playoffGame.team2Score,
        winnerId: playoffGame.winnerId
      };
    }
    return undefined;
  }, [games, playoffGames, activeBroadcastGameId]);

  const homeTeam = useMemo(() => teams.find(t => t.id === game?.homeTeamId), [teams, game]);
  const awayTeam = useMemo(() => teams.find(t => t.id === game?.awayTeamId), [teams, game]);

  const tickerItems = useMemo(() => {
    if (!game || !homeTeam || !awayTeam) return [
        { category: 'SYSTEM', content: 'INITIALIZING BROADCAST STREAM...', color: 'text-white' },
        { category: 'DATA', content: 'SYNCING WEATHER & FIELD CONDITIONS', color: 'text-white/60' }
    ];
    return generateTickerItems(games, teams, players, currentWeek, activeBroadcastGameId);
  }, [games, teams, players, currentWeek, activeBroadcastGameId, game, homeTeam, awayTeam]);

  // Reset states when the broadcast game changes
  useEffect(() => {
    if (activeBroadcastGameId) {
      setCurrentStepIndex(0);
      setIsPaused(false);
      setShowHalftime(false);
      setShowSummary(false);
      setInteractionBoost({ home: 0, away: 0 });
    }
  }, [activeBroadcastGameId]);

  // Generate sequence exactly once per game change
  const localSteps = useMemo(() => {
    if (!game || !homeTeam || !awayTeam) return [];
    
    const initialSteps = simulateGameSteps(game, homeTeam, awayTeam, players, { home: 0, away: 0 });
    return generateBroadcastSequence(initialSteps, homeTeam, awayTeam, players);
  }, [game, homeTeam, awayTeam, players]);

  // Updated: 2026-03-27T19:34Z

  const currentStep: BroadcastStep | undefined = localSteps[currentStepIndex];

  // Derived Possession & Identity (New)
  const possessionColor = useMemo(() => {
    if (!currentStep?.teamInPossessionId) return "#10b981"; // Neutral Emerald
    if (currentStep.teamInPossessionId === homeTeam?.id) return homeTeam.primaryColor || "#06b6d4";
    if (currentStep.teamInPossessionId === awayTeam?.id) return awayTeam.primaryColor || "#f43f5e";
    return "#10b981";
  }, [currentStep?.teamInPossessionId, homeTeam, awayTeam]);

  const scoringTeam = useMemo(() => {
    if (!currentStep?.isScoringPlay) return null;
    return currentStep.teamInPossessionId === homeTeam?.id ? homeTeam : awayTeam;
  }, [currentStep?.isScoringPlay, currentStep?.teamInPossessionId, homeTeam, awayTeam]);

  const scoringMascot = useMemo(() => {
    if (!scoringTeam) return STUFFY_RENDER_MAP.TeddyBear;
    return STUFFY_RENDER_MAP[scoringTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
  }, [scoringTeam]);

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
      
      if (nextIndex === localSteps.length - 1) {
        // End of game, show summary after a short delay
        setTimeout(() => setShowSummary(true), 2500);
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

  // #2 — Screen Shake: trigger on big plays
  const BIG_PLAY_TYPES = ['TOUCHDOWN', 'INTERCEPTION', 'FUMBLE'];
  useEffect(() => {
    if (currentStep && BIG_PLAY_TYPES.includes(currentStep.type)) {
      setShakeKey(k => k + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep?.type]);

  if (!activeBroadcastGameId || !game || !homeTeam || !awayTeam) return null;

  const handleFinish = () => {
    if (localSteps.length === 0 || !activeBroadcastGameId) return;
    const lastStep = localSteps[localSteps.length - 1];
    const winnerId = lastStep.homeScore > lastStep.awayScore 
      ? homeTeam!.id 
      : (lastStep.homeScore < lastStep.awayScore ? awayTeam!.id : 'tie');
    
    const isPlayoff = playoffGames.some(g => g.id === activeBroadcastGameId);
    
    if (isPlayoff) {
      // Ties aren't allowed in playoffs in this simulation, engine handles it
      updatePlayoffGameResult(activeBroadcastGameId, lastStep.homeScore, lastStep.awayScore, winnerId === 'tie' ? homeTeam!.id : winnerId);
    } else {
      updateGameResult(activeBroadcastGameId, lastStep.homeScore, lastStep.awayScore, winnerId);
    }
    
    setActiveBroadcastGameId(null);
  };

  // #3 — Emoji sets per interaction type
  const CHEER_EMOJIS = ['🧸', '🔥', '👏', '💥', '⚡', '🎉', '✨'];
  const BOO_EMOJIS   = ['😤', '💢', '👎', '🙄', '😮', '❄️'];

  const handleInteraction = (type: 'CHEER' | 'BOO', e: React.MouseEvent<HTMLButtonElement>) => {
    if (type === 'CHEER') {
      setInteractionBoost(prev => ({ ...prev, home: prev.home + 1 }));
    } else {
      setInteractionBoost(prev => ({ ...prev, home: prev.home + 0.5, away: prev.away - 0.5 }));
    }
    playSFX(type === 'CHEER' ? 'CHEER' : 'OOH');

    // #3 — Spawn emoji burst from button position
    const emojis = type === 'CHEER' ? CHEER_EMOJIS : BOO_EMOJIS;
    const rect = e.currentTarget.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top;
    const newParticles = Array.from({ length: 8 }, () => ({
      id: particleIdRef.current++,
      x: originX + (Math.random() - 0.5) * 100,
      y: originY - Math.random() * 10,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }));
    setParticles(prev => [...prev, ...newParticles]);
    const ids = new Set(newParticles.map(p => p.id));
    setTimeout(() => setParticles(prev => prev.filter(p => !ids.has(p.id))), 1500);
  };

  const homeRender = STUFFY_RENDER_MAP[homeTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
  const awayRender = STUFFY_RENDER_MAP[awayTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;



  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center overflow-y-auto font-sans selection:bg-emerald-500/10 selection:text-emerald-700 scroll-smooth antialiased elite-broadcast">
      {/* Background Graphic — 'The Plush Stadium' (Tactical Toy-Core) — High Fidelity Edit */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#16171d]">
        {/* Surface Depth Highlight */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,transparent_80%)]" />
        
        {/* Fiber Texture — Fixed Filter ID & Increased Opacity */}
        <div className="absolute inset-0 opacity-[0.5] mix-blend-soft-light" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='feltFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23feltFilter)'/%3E%3C/svg%3E")` }} 
        />

        {/* High-Contrast Cross-Stitch Grid */}
        <div className="absolute inset-0 opacity-[0.2] bg-size-[64px_64px]" 
             style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1.2px, transparent 0), linear-gradient(45deg, white 0.8px, transparent 0.8px)` }} />
        
        {/* Intense Team Atmosphere Glows */}
        <motion.div 
          animate={{ scale: [1, 1.4, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[10%] -left-[10%] w-[80%] h-[80%] rounded-full blur-[200px]"
          style={{ background: `radial-gradient(circle, ${awayTeam.primaryColor || "#f43f5e"}66 0%, transparent 70%)` }}
        />
        <motion.div 
          animate={{ scale: [1.4, 1, 1.4], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-[10%] -right-[10%] w-[80%] h-[80%] rounded-full blur-[200px]"
          style={{ background: `radial-gradient(circle, ${homeTeam.primaryColor || "#06b6d4"}66 0%, transparent 70%)` }}
        />

        {/* Brilliant Light Beams Scanning the Material */}
        <motion.div 
          animate={{ x: ['-50%', '150%'], opacity: [0, 0.2, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-y-0 w-64 bg-linear-to-r from-transparent via-white/20 to-transparent skew-x-12 blur-2xl"
        />

        {/* Prominent Stuffy Pro Watermark */}
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 opacity-[0.08] select-none pointer-events-none">
             <h3 className="text-[12rem] font-black italic tracking-[0.2em] whitespace-nowrap text-white uppercase">STUFFY PRO</h3>
        </div>

        {/* Soft Tonal Vignette (Light Grey/Blue) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(15,23,42,0.3)_100%)]" />
      </div>

      {/* #2 — Screen Shake wrapper: re-mounts on each big-play shakeKey change */}
      <motion.div
        key={shakeKey}
        animate={shakeKey > 0 ? { x: [0, -10, 10, -7, 7, -3, 3, 0], y: [0, -4, 4, -2, 2, 0] } : {}}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className="w-full max-w-5xl flex flex-col items-center gap-4 relative px-6 pt-4 pb-32"
      >
        
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

        {/* Elite Score Header - Now Reactive to Possession */}
        <motion.div 
          animate={{ 
            borderColor: `${possessionColor}33`,
            boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 20px ${possessionColor}10` 
          }}
          className="w-full bg-linear-to-b from-stone-800 to-stone-900 border-b-2 shadow-2xl px-6 py-8 flex items-center justify-between rounded-3xl gap-4 relative overflow-hidden"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_center,rgba(244,63,94,0.05)_0%,transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_center,rgba(6,182,212,0.05)_0%,transparent_50%)]" />
            
            <div className="flex flex-col items-center flex-1 relative z-10">
                <span className="text-[10px] text-white/50 uppercase tracking-[0.4em] font-black mb-3">Away Personnel</span>
                <span className="text-xl md:text-2xl text-rose-400 font-black text-center uppercase tracking-tight italic mb-2 line-clamp-1">{awayTeam.name}</span>
                <motion.span 
                  key={currentStep?.awayScore} 
                  initial={{ scale: 1.15, opacity: 0, filter: "brightness(1.5)" }} 
                  animate={{ scale: 1, opacity: 1, filter: "brightness(1)" }} 
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="text-8xl md:text-9xl font-black tabular-nums tracking-tighter text-white drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                >
                  {currentStep?.awayScore ?? 0}
                </motion.span>
                <div className="flex gap-1.5 mt-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={cn("w-2.5 h-1 rounded-full", i < (3 + interactionBoost.away) ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-white/5")} />
                    ))}
                </div>
            </div>
            
            {/* Game Control Pod */}
            <div className="flex flex-col items-center gap-2 px-8 py-4 bg-black/40 rounded-2xl border border-white/10 shadow-inner min-w-[180px] relative z-10 backdrop-blur-md">
                <div className="text-4xl md:text-5xl text-emerald-400 tabular-nums font-black tracking-tight flex items-center gap-1">
                    {currentStep?.timeRemaining}
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mt-1" />
                </div>
                <div className="h-px w-12 bg-white/10 my-1" />
                <div className="flex flex-col items-center">
                    <span className="text-white/60 text-[9px] font-black uppercase tracking-[0.3em]">
                        {currentStep?.type === 'GAME_END' ? "FINAL" : (currentStep?.quarter === 5 ? "OVERTIME" : `QUARTER ${currentStep?.quarter ?? 1}`)}
                    </span>
                    <div className="mt-2 px-4 py-1.5 bg-yellow-400 text-stone-950 text-[10px] font-black tracking-widest rounded-full shadow-lg shadow-yellow-400/20 uppercase">
                        {currentStep?.down ? `${currentStep.down} & ${currentStep.distance}` : "KICKOFF"}
                    </div>
                </div>
            </div>
 
            <div className="flex flex-col items-center flex-1 relative z-10">
                <span className="text-[10px] text-white/50 uppercase tracking-[0.4em] font-black mb-3">Home Personnel</span>
                <span className="text-xl md:text-2xl text-cyan-400 font-black text-center uppercase tracking-tight italic mb-2 line-clamp-1">{homeTeam.name}</span>
                <motion.span 
                  key={currentStep?.homeScore} 
                  initial={{ scale: 1.15, opacity: 0, filter: "brightness(1.5)" }} 
                  animate={{ scale: 1, opacity: 1, filter: "brightness(1)" }} 
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="text-8xl md:text-9xl font-black tabular-nums tracking-tighter text-white drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  {currentStep?.homeScore ?? 0}
                </motion.span>
                <div className="flex gap-1.5 mt-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className={cn("w-2.5 h-1 rounded-full", i < (3 + interactionBoost.home) ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-white/5")} />
                    ))}
                </div>
            </div>
        </motion.div>


        {/* Football Field - Now Reactive to Possession */}
        <motion.div 
          animate={{ 
            borderColor: `${possessionColor}22`,
            boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px ${possessionColor}05`
          }}
          className="w-full flex flex-col items-center gap-6 bg-stone-900 border p-6 rounded-4xl shadow-2xl relative overflow-hidden"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)] pointer-events-none" />

            <div className="w-full h-28 relative overflow-hidden flex items-stretch border-2 border-white/20 shadow-inner rounded-lg">

                {/* Away Endzone (left) */}
                <div
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{ width: `${ENDZONE_PCT}%`, background: 'linear-gradient(135deg, #881337 0%, #9f1239 100%)' }}
                >
                  <div className="relative w-full h-full opacity-20 filter grayscale contrast-125">
                      {awayTeam.logoUrl ? (
                          <Image src={awayTeam.logoUrl} fill className="object-cover" alt="" sizes="10vw" />
                      ) : (
                          <Image src={awayRender} fill className="object-contain p-2" alt="" sizes="10vw" />
                      )}
                  </div>
                  <div className="absolute inset-0 border-r-2 border-white/30" />
                </div>

                {/* 100 Yards of Play — Realistic Football Geometry */}
                <div className="flex-1 relative bg-emerald-700 overflow-hidden">
                  {/* Subtle Grass Texture / Striping */}
                  <div className="absolute inset-0 flex">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className={cn("flex-1", i % 2 === 0 ? "bg-emerald-800/20" : "bg-transparent")} />
                    ))}
                  </div>

                  {/* 10-Yard Markers & Labels */}
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((yard) => {
                    const isMidfield = yard === 50;
                    const displayLabel = yard <= 50 ? yard : 100 - yard;
                    return (
                        <div 
                          key={yard} 
                          className={cn(
                            "absolute top-0 bottom-0 border-l border-white/20",
                            isMidfield && "border-l-2 border-white/60 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                          )}
                          style={{ left: `${yard}%` }}
                        >
                            {/* Symmetric Yard Labels */}
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                <span className={cn(
                                    "text-[9px] font-black italic select-none transition-all",
                                    isMidfield ? "text-white/80 scale-125" : "text-white/30"
                                )}>
                                    {displayLabel}
                                </span>
                            </div>
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                <span className={cn(
                                    "text-[9px] font-black italic select-none transition-all",
                                    isMidfield ? "text-white/80 scale-125" : "text-white/30"
                                )}>
                                    {displayLabel}
                                </span>
                            </div>
                        </div>
                    );
                  })}

                  {/* 5-Yard Line Ticks */}
                  {[5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map(yard => (
                    <div 
                      key={yard} 
                      className="absolute top-0 bottom-0 border-l border-white/10"
                      style={{ left: `${yard}%` }}
                    />
                  ))}

                  {/* One-Yard Hashmarks (Top/Middle/Bottom) */}
                  <div className="absolute inset-0 pointer-events-none opacity-20">
                    {[...Array(101)].map((_, i) => {
                      if (i % 5 === 0) return null; // Skip where we have lines
                      return (
                        <div key={i} className="absolute h-full flex flex-col justify-between" style={{ left: `${i}%` }}>
                          <div className="h-1.5 w-px bg-white" />
                          <div className="flex flex-col gap-8">
                             <div className="h-1 w-px bg-white" />
                             <div className="h-1 w-px bg-white" />
                          </div>
                          <div className="h-1.5 w-px bg-white" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Red zone shading — opponent's 20 */}
                  {isRedZone(currentStep?.yardLine ?? 0) && (
                    <div
                      className="absolute top-0 bottom-0 bg-rose-500/10 pointer-events-none transition-opacity duration-1000 animate-pulse"
                      style={{
                        ...(currentStep?.sideOfField === 'AWAY'
                          ? { right: 0, width: '20%' }
                          : { left: 0, width: '20%' })
                      }}
                    />
                  )}

                  {/* Midfield Decoration */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/5 rounded-full border border-white/10 flex items-center justify-center opacity-40">
                    <span className="text-[14px] font-black text-white/20">50</span>
                  </div>

                  {/* Ball marker — positioned via fieldUtils */}
                  <motion.div
                    animate={{
                      left: `${
                        ((yardLineToFieldPercent(currentStep?.yardLine ?? 25, currentStep?.sideOfField ?? 'AWAY') - ENDZONE_PCT)
                          / (100 - 2 * ENDZONE_PCT)) * 100
                      }%`
                    }}
                    transition={{ type: "spring", stiffness: 60, damping: 18 }}
                    className="absolute top-1/2 -translate-y-1/2 w-10 h-10 -translate-x-1/2 flex items-center justify-center z-10"
                  >
                    {/* CSS football shape */}
                    <div className="relative w-8 h-5 bg-[#6b3e23] rounded-[100%] border-2 border-white/50 shadow-lg shadow-black/50 overflow-hidden">
                      <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent" />
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
                    <div className="absolute top-full mt-2 w-full flex justify-center">
                        <motion.div 
                          animate={{ opacity: [0.4, 0.8, 0.4] }} 
                          transition={{ duration: 2, repeat: Infinity }}
                          className={cn(
                            "w-2 h-2 rounded-full blur-[2px]",
                            currentStep?.teamInPossessionId === homeTeam.id ? "bg-cyan-400" : "bg-rose-400"
                          )} 
                        />
                    </div>
                  </motion.div>
                </div>

                {/* Home Endzone (right) */}
                <div
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{ width: `${ENDZONE_PCT}%`, background: 'linear-gradient(135deg, #0e7490 0%, #155e75 100%)' }}
                >
                  <div className="relative w-full h-full opacity-20 filter grayscale contrast-125">
                      {homeTeam.logoUrl ? (
                          <Image src={homeTeam.logoUrl} fill className="object-cover" alt="" sizes="10vw" />
                      ) : (
                          <Image src={homeRender} fill className="object-contain p-2" alt="" sizes="10vw" />
                      )}
                  </div>
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
                         <button onClick={(e) => handleInteraction('BOO', e)} className="bg-rose-500 text-white px-6 py-2 rounded-xl text-xs hover:scale-110 active:bg-white active:text-stone-950 transition-all shadow-lg shadow-rose-500/20 font-black">BOO AWAY</button>
                    </div>
                </div>

                <div
                    className="flex flex-col items-center gap-6 min-h-[160px] justify-center text-center relative"
                    style={{ perspective: '1000px' }}
                    onMouseDown={() => {
                      holdTimerRef.current = setTimeout(() => setIsCardFlipped(true), 450);
                    }}
                    onMouseUp={() => {
                      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                      setIsCardFlipped(false);
                    }}
                    onMouseLeave={() => {
                      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                      setIsCardFlipped(false);
                    }}
                    onTouchStart={() => {
                      holdTimerRef.current = setTimeout(() => setIsCardFlipped(true), 450);
                    }}
                    onTouchEnd={() => {
                      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                      setIsCardFlipped(false);
                    }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div key={currentStepIndex} className="relative w-full">
                            {/* Big Play Emphasis Overlay */}
                            {['INTERCEPTION', 'FUMBLE', 'TURNOVER_ON_DOWNS'].includes(currentStep?.type || '') && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    className="absolute -top-12 left-1/2 -translate-x-1/2 z-20"
                                >
                                    <div className="bg-stone-900 border border-emerald-500/40 text-emerald-400 px-8 py-2.5 rounded-full font-black text-[10px] tracking-[0.4em] uppercase shadow-2xl backdrop-blur-xl whitespace-nowrap">
                                        {currentStep?.type.replace(/_/g, ' ')}
                                    </div>
                                </motion.div>
                            )}

                            {/* #4 — 3D Flip Card */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="relative w-full"
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* Card 3D container */}
                                <motion.div
                                    animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                                    style={{ transformStyle: 'preserve-3d', position: 'relative' }}
                                    className="w-full cursor-pointer select-none"
                                >
                                    {/* — FRONT: Commentary — */}
                                    <div className="space-y-4" style={{ backfaceVisibility: 'hidden' }}>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] block mb-2">Live Play-by-Play</span>
                                            <h2 className="text-3xl md:text-4xl text-white font-black leading-tight italic tracking-tight uppercase">
                                                {currentStep?.commentary || "GAME ON!"}
                                            </h2>
                                        </div>
                                        <div className="h-px w-16 bg-white/10 mx-auto" />
                                        <p className="text-emerald-400/80 text-sm md:text-base font-bold tracking-tight max-w-sm mx-auto uppercase leading-relaxed">
                                            {currentStep?.description}
                                        </p>
                                        {/* Hold hint */}
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: isCardFlipped ? 0 : 0.35 }}
                                            transition={{ delay: 2, duration: 1 }}
                                            className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 block mt-2"
                                        >
                                            Hold card for stats
                                        </motion.span>
                                    </div>

                                    {/* — BACK: Stats Flash — */}
                                    <div
                                        className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-900/95 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
                                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-white/40">Stats Flash</span>
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full max-w-xs">
                                            <div className="text-center">
                                                <div className="text-2xl font-black text-white tabular-nums">{currentStep?.gain ?? 0}</div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Yards</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-black text-white tabular-nums">
                                                    {currentStep?.down ? `${currentStep.down} & ${currentStep.distance}` : '—'}
                                                </div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Down & Dist</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-black tabular-nums" style={{ color: possessionColor }}>
                                                    {currentStep?.type === 'GAME_END' ? "FIN" : (currentStep?.quarter === 5 ? "OT" : `Q${currentStep?.quarter ?? 1}`)}
                                                </div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Quarter</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xs font-black uppercase truncate max-w-[100px] mx-auto" style={{ color: possessionColor }}>
                                                    {currentStep?.teamInPossessionId === homeTeam?.id ? homeTeam?.name : awayTeam?.name}
                                                </div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Ball</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
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
                         <button onClick={(e) => handleInteraction('CHEER', e)} className="bg-cyan-500 text-white px-6 py-2 rounded-xl text-xs hover:scale-110 active:bg-white active:text-stone-950 transition-all shadow-lg shadow-cyan-500/20 font-black">CHEER HOME</button>
                         <button onClick={(e) => handleInteraction('BOO', e)} className="bg-stone-800 text-white px-6 py-2 rounded-xl text-xs hover:scale-110 active:bg-cyan-500 transition-all font-black">BOO HOME</button>
                    </div>
                </div>
            </div>
        </motion.div>

        {/* Character Pop-up Celebration - Now Team Specific */}
        <AnimatePresence>
            {currentStep?.isScoringPlay && (
                <motion.div 
                    initial={{ scale: 0, rotate: -30, x: -500, y: 500 }}
                    animate={{ scale: 1, rotate: 0, x: 0, y: 0 }}
                    exit={{ scale: 3, opacity: 0, x: 500, y: -500 }}
                    onClick={() => currentStepIndex < localSteps.length - 1 && setCurrentStepIndex(currentStepIndex + 1)}
                    className="fixed inset-0 z-101 flex items-center justify-center pointer-events-auto cursor-pointer p-10 backdrop-blur-sm bg-black/20"
                >
                    <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 blur-[100px] rounded-full"
                          style={{ backgroundColor: possessionColor }}
                        />
                        <div 
                          className="bg-stone-900/95 p-12 border-8 shadow-2xl -rotate-3 text-center rounded-4xl relative overflow-hidden"
                          style={{ borderColor: possessionColor, boxShadow: `0 0 100px ${possessionColor}44` }}
                        >
                             <div className="absolute top-0 left-0 w-full h-2 opacity-50" 
                                  style={{ background: `linear-gradient(90deg, transparent, white, transparent)` }} />
                             
                             {/* Generated Team Mascot */}
                             <div className="relative w-72 h-72 mx-auto mb-8">
                                <motion.div
                                  animate={{ y: [0, -20, 0], rotate: [-2, 2, -2] }}
                                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                  className="w-full h-full relative"
                                >
                                    <Image 
                                        src={scoringMascot} 
                                        fill 
                                        className="object-contain drop-shadow-[0_0_30px_white]" 
                                        alt={scoringTeam?.name || "TOUCHDOWN!"} 
                                        sizes="288px"
                                    />
                                </motion.div>
                             </div>

                             <h1 className="text-6xl md:text-7xl text-white font-black tracking-tighter italic uppercase leading-tight">
                                 {currentStep?.type === 'TOUCHDOWN' ? 'TOUCHDOWN!' : 'IT\'S GOOD!'}
                             </h1>
                             <div className="text-2xl mt-4 font-black tracking-[0.4em] animate-pulse uppercase" 
                                  style={{ color: possessionColor }}>
                                 {scoringTeam?.name || 'CHAMPIONSHIP PERFORMANCE!'}
                             </div>
                             <div className="mt-8 px-6 py-2 bg-white/5 rounded-full inline-block border border-white/10">
                                <span className="text-white/40 text-[10px] font-black tracking-widest uppercase">Click to continue broadcast</span>
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
                                <span className="text-xs font-black uppercase tracking-widest text-white/60">{awayTeam?.name || "AWAY TEAM"}</span>
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
                                <span className="text-xs font-black uppercase tracking-widest text-white/60">{homeTeam?.name || "HOME TEAM"}</span>
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
        
        {/* Bottom Ticker & Log - Enhanced with Live Data */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col scale-90 md:scale-100 origin-bottom">
            <div className="w-full flex items-center bg-stone-900 border-t-2 border-white/10 h-16 gap-6 overflow-hidden backdrop-blur-md">
                <div className="bg-emerald-500 text-stone-950 h-full px-6 flex items-center gap-2 shrink-0 border-r-4 border-emerald-600">
                    <Zap className="w-4 h-4 fill-current" />
                    <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">STUFFY LEAGUE NETWORK</span>
                </div>
                
                <div className="flex-1 overflow-hidden h-full flex items-center">
                    <motion.div 
                        animate={{ x: ['30%', '-100%'] }} 
                        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }} 
                        className="flex gap-24 whitespace-nowrap items-center h-full"
                    >
                        {tickerItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <span className="bg-stone-800 text-stone-400 px-3 py-1 rounded text-[10px] font-black uppercase tracking-[0.2em] border border-white/5">
                                    {item.category}
                                </span>
                                <span className={cn(
                                    "text-white/90 font-black uppercase text-[12px] tracking-widest italic",
                                    item.color || ""
                                )}>
                                    {item.content}
                                </span>
                                <div className="h-1 w-1 rounded-full bg-white/20 mx-2" />
                            </div>
                        ))}
                    </motion.div>
                </div>

                <div className="flex items-center gap-4 px-6 shrink-0 border-l border-white/10 h-full bg-stone-950/40">
                    <button 
                      onClick={() => setIsPaused(!isPaused)} 
                      className={cn(
                        "text-[10px] border px-6 py-2 transition-all font-black rounded-full uppercase tracking-widest whitespace-nowrap",
                        isPaused 
                        ? "bg-emerald-500 text-stone-950 border-emerald-500 hover:bg-white hover:border-white shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                        : "bg-white/10 text-white border-white/20 hover:bg-white hover:text-stone-950 hover:border-white"
                      )}
                    >
                        {isPaused ? 'RESUME PLAY' : 'PAUSE SIM'}
                    </button>
                    <button 
                        onClick={() => setActiveBroadcastGameId(null)}
                        className="text-[10px] text-stone-500 hover:text-white transition-colors"
                        title="Close Stream"
                    >
                        EXIT
                    </button>
                </div>
            </div>
        </div>

        <AnimatePresence>
          {showSummary && (
            <PostGameSummary 
              homeTeam={homeTeam} 
              awayTeam={awayTeam} 
              lastStep={localSteps[localSteps.length - 1]} 
              players={players}
              onClose={handleFinish}
            />
          )}
        </AnimatePresence>

      </motion.div>

      {/* #3 — Emoji Particle Burst: fixed-position, rendered above everything */}
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, scale: 0.6, y: 0 }}
            animate={{ opacity: 0, scale: 2, y: -170 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
            className="fixed pointer-events-none z-9999 text-3xl select-none"
            style={{ left: p.x, top: p.y, transform: 'translateX(-50%)' }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

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

function PostGameSummary({ 
  homeTeam, 
  awayTeam, 
  lastStep, 
  onClose,
  players 
}: { 
  homeTeam: Team, 
  awayTeam: Team, 
  lastStep: BroadcastStep, 
  onClose: () => void,
  players: Player[]
}) {
  const playerStats = lastStep.playerStats || {};
  const gamePlayers = players.filter(p => p.teamId === homeTeam.id || p.teamId === awayTeam.id);
  
  const sortedPlayers = [...gamePlayers].sort((a, b) => {
    const sA = playerStats[a.id] || {};
    const sB = playerStats[b.id] || {};
    const scoreA = (sA.passingYards || 0) + (sA.rushingYards || 0) + (sA.receivingYards || 0) + ((sA.passingTds || 0) * 50);
    const scoreB = (sB.passingYards || 0) + (sB.rushingYards || 0) + (sB.receivingYards || 0) + ((sB.passingTds || 0) * 50);
    return scoreB - scoreA;
  });

  const mvp = sortedPlayers[0];
  const mvpStats = playerStats[mvp?.id] || {};
  const mvpTeam = mvp?.teamId === homeTeam.id ? homeTeam : awayTeam;

  if (!lastStep.stats) return null; // Safety guard

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-200 bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 overflow-y-auto"
    >
      <div className="w-full max-w-5xl bg-stone-900 border border-white/10 p-6 md:p-10 shadow-2xl rounded-[3rem] relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-500 via-emerald-500 to-cyan-500 rounded-t-full" />
        
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
            <div className="flex items-center gap-6">
                 <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 p-4">
                    <Image src={awayTeam.logoUrl || "/placeholder.png"} width={80} height={80} className="object-contain" alt="" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-4xl md:text-6xl font-black text-white italic tracking-tighter">{lastStep.awayScore}</span>
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{awayTeam.name}</span>
                 </div>
            </div>

            <div className="text-center">
                <span className="bg-stone-800 text-stone-400 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] border border-white/5 mb-4 block">Final Score Report</span>
                <span className="text-white/20 text-4xl font-black italic">VS</span>
            </div>

            <div className="flex items-center gap-6 text-right">
                 <div className="flex flex-col items-end">
                    <span className="text-4xl md:text-6xl font-black text-white italic tracking-tighter">{lastStep.homeScore}</span>
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{homeTeam.name}</span>
                 </div>
                 <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 p-4">
                    <Image src={homeTeam.logoUrl || "/placeholder.png"} width={80} height={80} className="object-contain" alt="" />
                 </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* MVP Card */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 right-0 p-4">
                    <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="w-32 h-32 rounded-full border-4 border-emerald-500/20 mb-6 overflow-hidden bg-stone-800 relative">
                     <Image src={STUFFY_RENDER_MAP[mvpTeam.icon] || STUFFY_RENDER_MAP.TeddyBear} fill className="object-contain p-4 drop-shadow-2xl" alt="" />
                </div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-2">Player of the Game</span>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight text-center truncate w-full">{mvp?.name}</h3>
                <p className="text-white/40 text-[11px] font-bold uppercase mt-1">{mvp?.position} • {mvp?.teamId === homeTeam.id ? homeTeam.name : awayTeam.name}</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mt-8 pt-8 border-t border-white/5">
                    <div className="text-center">
                        <div className="text-xl font-black text-white">{(mvpStats.passingYards || 0) + (mvpStats.rushingYards || 0) + (mvpStats.receivingYards || 0)}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Total Yds</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-black text-emerald-400">{(mvpStats.passingTds || 0) + (mvpStats.rushingTds || 0) + (mvpStats.receivingTds || 0)}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Total TDs</div>
                    </div>
                </div>
            </div>

            {/* Team Stats */}
            <div className="lg:col-span-2 bg-stone-950/40 border border-white/10 p-8 rounded-[2.5rem]">
                <h4 className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-8">Team Comparison</h4>
                <div className="space-y-6">
                    <StatRow label="Total Yards" home={lastStep.stats.home.totalYards} away={lastStep.stats.away.totalYards} />
                    <StatRow label="Passing Yards" home={lastStep.stats.home.passingYards} away={lastStep.stats.away.passingYards} />
                    <StatRow label="Rushing Yards" home={lastStep.stats.home.rushingYards} away={lastStep.stats.away.rushingYards} />
                    <StatRow label="First Downs" home={lastStep.stats.home.firstDowns} away={lastStep.stats.away.firstDowns} />
                    <StatRow label="Turnovers" home={lastStep.stats.home.turnovers} away={lastStep.stats.away.turnovers} inverse />
                </div>
            </div>
        </div>

        <div className="flex justify-center">
            <button 
                onClick={onClose} 
                className="bg-emerald-500 text-stone-950 px-16 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-white transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20"
            >
                Return to League
            </button>
        </div>
      </div>
    </motion.div>
  );
}

function StatRow({ label, home, away, inverse = false }: { label: string, home: number, away: number, inverse?: boolean }) {
  const homeBetter = inverse ? home < away : home > away;
  const awayBetter = inverse ? away < home : away > home;
  
  return (
    <div className="flex items-center gap-6">
        <span className={cn("text-xl font-black tabular-nums min-w-12", awayBetter ? `text-white` : "text-white/20")}>{away}</span>
        <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex justify-between text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">
                <span>Visitor</span>
                <span>{label}</span>
                <span>Home</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                <div className={cn("h-full transition-all duration-1000", awayBetter ? `bg-rose-500` : "bg-white/10")} style={{ width: `${(away / (home + away || 1)) * 100}%` }} />
                <div className={cn("h-full transition-all duration-1000", homeBetter ? `bg-cyan-500` : "bg-white/10")} style={{ width: `${(home / (home + away || 1)) * 100}%` }} />
            </div>
        </div>
        <span className={cn("text-xl font-black tabular-nums min-w-12 text-right", homeBetter ? `text-white` : "text-white/20")}>{home}</span>
    </div>
  );
}


