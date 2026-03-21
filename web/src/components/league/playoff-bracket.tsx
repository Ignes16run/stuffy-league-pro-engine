"use client";
// Last Updated: 2026-03-21T17:52:00-04:00

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, RefreshCw, Play, CheckCircle2,
  AlertCircle, ChevronRight
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { Team, PlayoffGame } from '@/lib/league/types';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { calculateStandings } from '@/lib/league/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';

export default function PlayoffBracket() {
  const { teams, games, playoffGames, setPlayoffGames, completeSeason, handlePick, isLoaded, syncPlayoffGames } = useLeague();
  const standings = useMemo(() => calculateStandings(teams, games), [teams, games]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeRound, setActiveRound] = useState(0); // For highlight during sim

  useEffect(() => {
    if (isLoaded && standings.length >= 4 && playoffGames.length === 0) {
      refreshSeeding();
    }
  }, [isLoaded, standings.length, playoffGames.length]);

  const refreshSeeding = () => {
    const size = standings.length >= 8 ? 8 : 4;
    const initialGames: PlayoffGame[] = [];
    
    let matchups: [number, number][] = size === 8 
      ? [[1, 8], [4, 5], [2, 7], [3, 6]]
      : [[1, 4], [2, 3]];

    matchups.forEach(([s1, s2], i) => {
      initialGames.push({
        id: `round-1-match-${i}`,
        round: 1,
        matchupIndex: i,
        team1Id: standings[s1 - 1].teamId,
        team2Id: standings[s2 - 1].teamId,
        seed1: s1,
        seed2: s2,
      });
    });

    for (let i = 0; i < size / 4; i++) {
      initialGames.push({ id: `round-2-match-${i}`, round: 2, matchupIndex: i });
    }

    if (size === 8) {
      initialGames.push({ id: `round-3-match-0`, round: 3, matchupIndex: 0 });
    }

    setPlayoffGames(initialGames);
    syncPlayoffGames(initialGames);
  };

  const simulatePlayoffs = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    
    // We'll update the context state iteratively
    const maxR = Math.max(...playoffGames.map(g => g.round), 1);
    let finalBracket: PlayoffGame[] = [];

    for (let r = 1; r <= maxR; r++) {
      setActiveRound(r);
      let changedThisRound = false;

      // Use a functional update to get the latest state each time
      await new Promise<void>(resolve => {
        setPlayoffGames((prev: PlayoffGame[]) => {
          const bracket = prev.map(g => ({ ...g }));
          const roundGames = bracket.filter(g => g.round === r);
          
          for (const game of roundGames) {
            if (game.team1Id && game.team2Id && !game.winnerId) {
              const t1 = teams.find(t => t.id === game.team1Id);
              const t2 = teams.find(t => t.id === game.team2Id);
              
              if (t1 && t2) {
                const t1P = (t1.offenseRating || 72) + (t1.defenseRating || 72);
                const t2P = (t2.offenseRating || 72) + (t2.defenseRating || 72);
                const luck = (game.seed1 || 10) < (game.seed2 || 10) ? 12 : 0;
                
                const winnerId = Math.random() * (t1P + t2P + luck) < (t1P + luck) ? t1.id : t2.id;
                game.winnerId = winnerId;
                changedThisRound = true;

                // Propagate
                const nR = r + 1;
                const nIdx = Math.floor(game.matchupIndex / 2);
                const isH = game.matchupIndex % 2 === 0;
                const nextG = bracket.find(bg => bg.round === nR && bg.matchupIndex === nIdx);
                
                if (nextG) {
                  const wSeed = game.winnerId === game.team1Id ? game.seed1 : game.seed2;
                  if (isH) {
                    nextG.team1Id = winnerId;
                    nextG.seed1 = wSeed;
                  } else {
                    nextG.team2Id = winnerId;
                    nextG.seed2 = wSeed;
                  }
                }
              }
            }
          }
          finalBracket = bracket;
          resolve(); // Resolve promise after setter returns
          return bracket;
        });
      });

      if (changedThisRound) {
        await new Promise(res => setTimeout(res, 800));
      }
    }
    
    // Batch sync results to Supabase
    if (finalBracket.length > 0) {
      await syncPlayoffGames(finalBracket);
    }

    setActiveRound(0);
    setIsSimulating(false);
  };

  const rounds = Array.from(new Set(playoffGames.map(g => g.round))).sort((a, b) => a - b);
  const champGame = playoffGames.find(g => g.round === Math.max(...rounds, 1));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      {/* Dynamic Header */}
      <Card className="rounded-[2.5rem] border border-stone-100 shadow-xl p-6 bg-gradient-to-br from-white to-stone-50/50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tighter italic">Stuffy Playoffs</h2>
              <p className="text-stone-400 font-bold text-[10px] uppercase tracking-widest">Simulation Engine 2.1</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={refreshSeeding} disabled={isSimulating} className="rounded-xl hover:bg-stone-100 px-4 h-10 font-bold text-stone-500 text-xs">
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Reset
            </Button>
            <Button size="lg" onClick={simulatePlayoffs} disabled={isSimulating || !!champGame?.winnerId} className="bg-stone-900 hover:bg-black text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-stone-900/20">
              {isSimulating ? <RefreshCw className="animate-spin mr-2 h-3.5 w-3.5" /> : <Play className="mr-2 h-3.5 w-3.5 fill-white" />}
              {isSimulating ? 'SIMULATING' : 'LIVE SIMULATION'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Bracket View */}
      <div className="pb-8 scrollbar-hide">
        <div className="flex justify-center gap-4 w-full">
          {rounds.map(rNum => (
            <div key={rNum} className="w-60 space-y-6">
               <div className="flex items-center justify-center gap-2">
                  <div className={cn("h-1 w-3 rounded-full", activeRound === rNum ? "bg-stone-900 animate-pulse" : "bg-stone-200")} />
                  <span className={cn("text-[9px] font-black uppercase tracking-[0.4em]", activeRound === rNum ? "text-stone-900" : "text-stone-300 whitespace-nowrap")}>
                    {rNum === 1 ? 'Quarters' : rNum === 2 ? 'Semis' : 'Final'}
                  </span>
                  <div className={cn("h-1 w-3 rounded-full", activeRound === rNum ? "bg-stone-900 animate-pulse" : "bg-stone-200")} />
               </div>
               <div className="flex flex-col h-full justify-around gap-8 min-h-[450px]">
                  {playoffGames.filter(g => g.round === rNum).map(game => (
                    <PlayoffMatchup key={game.id} game={game} teams={teams} handlePick={handlePick} />
                  ))}
               </div>
            </div>
          ))}

          {/* Winner Section */}
          <AnimatePresence>
            {champGame?.winnerId && (
              <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex flex-col items-center justify-center">
                 <div className="bg-white rounded-[3rem] border border-stone-100 p-8 text-center shadow-2xl min-w-[280px] relative overflow-hidden">
                    {/* Background Shine */}
                    <div className="absolute top-0 left-0 w-full h-full bg-linear-to-br from-yellow-400/5 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10">
                      <div className="relative inline-block mb-6">
                        <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-400/50">
                          <Trophy className="w-10 h-10 text-white drop-shadow-lg" />
                        </div>
                        <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl -z-10" />
                      </div>
                      
                      <p className="text-[9px] font-black uppercase tracking-widest text-yellow-600 mb-2 bg-yellow-50 px-3 py-1 rounded-full inline-block">League Champion</p>
                      <h2 className="text-2xl font-black text-stone-900 mb-6 leading-tight truncate px-2">
                        {teams.find(t => t.id === champGame.winnerId)?.name || 'TBD'}
                      </h2>
                      
                      <Button 
                        size="lg"
                        onClick={() => champGame.winnerId && completeSeason(champGame.winnerId)}
                        className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0"
                      >
                        Finalize
                      </Button>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PlayoffMatchup({ game, teams, handlePick }: { game: PlayoffGame, teams: Team[], handlePick: any }) {
  const round1 = game.round === 1;
  return (
    <div className="relative group w-full">
      {/* Connector lines (visual only) */}
      {!round1 && <div className="absolute -left-4 top-1/2 w-4 h-px bg-stone-100" />}
      <div className="absolute -right-4 top-1/2 w-4 h-px bg-stone-100" />
      
      <div className="bg-white rounded-[1.5rem] shadow-lg border border-stone-100 overflow-hidden w-full divide-y divide-stone-50 transition-all hover:shadow-xl hover:-translate-y-0.5">
         {[1, 2].map(slot => {
           const teamId = slot === 1 ? game.team1Id : game.team2Id;
           const seed = slot === 1 ? game.seed1 : game.seed2;
           const team = teams.find(t => t.id === teamId);
           const Icon = team ? (STUFFY_ICONS[team.icon as keyof typeof STUFFY_ICONS] || STUFFY_ICONS.TeddyBear) : null;
           const isWinner = game.winnerId === teamId && teamId;

           return (
             <button 
               key={slot}
               onClick={() => team && handlePick(game.id, team.id)} 
               className={cn(
                 "w-full flex items-center justify-between p-3 transition-all outline-none",
                 isWinner ? "bg-emerald-50/20" : "hover:bg-stone-50/30"
               )}
             >
               <div className="flex items-center gap-3">
                 <div 
                   className={cn(
                     "w-9 h-9 rounded-xl flex items-center justify-center border-2 shadow-inner text-white overflow-hidden transition-all shrink-0",
                     isWinner ? "scale-105" : ""
                   )}
                   style={{ 
                     backgroundColor: team?.primaryColor || '#f9fafb', 
                     borderColor: team?.secondaryColor || '#f3f4f6' 
                   }}
                 >
                   {team?.logoUrl ? (
                     <img src={team.logoUrl} className="w-full h-full object-cover p-1" alt={team.name} />
                   ) : team && Icon ? (
                     <Icon className="w-5 h-5" />
                   ) : (
                     <AlertCircle className="w-5 h-5 text-stone-100" />
                   )}
                 </div>
                 <div className="text-left min-w-0">
                    <div className="flex items-center gap-1.5 mb-0">
                      <span className="text-[8px] font-black text-stone-300 uppercase tracking-widest">{seed ? `Seed ${seed}` : 'TBD'}</span>
                      {isWinner && <span className="text-emerald-500 text-[7px] font-black uppercase">Win</span>}
                    </div>
                    <p className={cn("font-black text-xs tracking-tight truncate max-w-[100px]", team ? "text-stone-900" : "text-stone-200")}>
                      {team?.name || 'TBD'}
                    </p>
                 </div>
               </div>
               {isWinner && (
                 <div className="bg-emerald-500 rounded-full p-1 shadow-lg shadow-emerald-500/10 shrink-0">
                   <CheckCircle2 className="w-3 h-3 text-white" />
                 </div>
               )}
             </button>
           );
         })}
      </div>
    </div>
  );
}
