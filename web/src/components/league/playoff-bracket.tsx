"use client";
// Last Updated: 2026-03-21T17:48:00-04:00

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, RefreshCw, Play, CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { Team, PlayoffGame } from '@/lib/league/types';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { calculateStandings } from '@/lib/league/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';

export default function PlayoffBracket() {
  const { teams, games, playoffGames, setPlayoffGames, completeSeason, handlePick } = useLeague();
  const standings = useMemo(() => calculateStandings(teams, games), [teams, games]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Auto-generate if empty
  useEffect(() => {
    if (standings.length >= 4 && playoffGames.length === 0) {
      refreshSeeding();
    }
  }, [standings.length, playoffGames.length]);

  const refreshSeeding = () => {
    const size = standings.length >= 8 ? 8 : 4;
    const initialGames: PlayoffGame[] = [];
    
    let round1Matchups: [number, number][] = [];
    if (size === 8) {
      round1Matchups = [[1, 8], [4, 5], [2, 7], [3, 6]];
    } else {
      round1Matchups = [[1, 4], [2, 3]];
    }

    // Round 1
    round1Matchups.forEach(([s1, s2], i) => {
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

    // Round 2
    for (let i = 0; i < size / 4; i++) {
      initialGames.push({ id: `round-2-match-${i}`, round: 2, matchupIndex: i });
    }

    // Round 3
    if (size === 8) {
      initialGames.push({ id: `round-3-match-0`, round: 3, matchupIndex: 0 });
    }

    setPlayoffGames(initialGames);
  };

  const simulatePlayoffs = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    
    // Work on a deep copy
    let currentBracket = playoffGames.map(g => ({ ...g }));
    const maxR = Math.max(...currentBracket.map(g => g.round), 0);

    for (let r = 1; r <= maxR; r++) {
      let roundChanged = false;
      const roundGames = currentBracket.filter(g => g.round === r);
      
      for (const game of roundGames) {
        if (game.team1Id && game.team2Id && !game.winnerId) {
          const t1 = teams.find(t => t.id === game.team1Id);
          const t2 = teams.find(t => t.id === game.team2Id);
          
          if (t1 && t2) {
            const t1Pow = (t1.offenseRating || 70) + (t1.defenseRating || 70);
            const t2Pow = (t2.offenseRating || 70) + (t2.defenseRating || 70);
            const luck = (game.seed1 || 8) < (game.seed2 || 8) ? 10 : 0;
            
            const winnerId = Math.random() * (t1Pow + t2Pow + luck) < (t1Pow + luck) ? t1.id : t2.id;
            game.winnerId = winnerId;
            roundChanged = true;

            // Propagation
            const nR = r + 1;
            const nIdx = Math.floor(game.matchupIndex / 2);
            const isT1Next = game.matchupIndex % 2 === 0;
            const nextG = currentBracket.find(bg => bg.round === nR && bg.matchupIndex === nIdx);
            
            if (nextG) {
              const wSeed = game.winnerId === game.team1Id ? game.seed1 : game.seed2;
              if (isT1Next) {
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

      if (roundChanged) {
        setPlayoffGames([...currentBracket]);
        await new Promise(res => setTimeout(res, 800));
      }
    }
    setIsSimulating(false);
  };

  const sortedRounds = Array.from(new Set(playoffGames.map(g => g.round))).sort((a, b) => a - b);
  const champGame = playoffGames.find(g => g.round === Math.max(...sortedRounds, 1));

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <Card className="rounded-[2.5rem] border border-stone-100 shadow-xl p-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-black text-stone-900 uppercase tracking-widest leading-none mb-1">Playoff Tournament</h2>
            <p className="text-stone-500 text-xs">Simulate or pick winners to crown the champion</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={refreshSeeding} disabled={isSimulating} className="rounded-xl font-bold uppercase text-[10px]">
              <RefreshCw className="mr-1.5 h-3 w-3" /> Reset Bracket
            </Button>
            <Button size="lg" onClick={simulatePlayoffs} disabled={isSimulating || (champGame?.winnerId ? true : false)} className="bg-stone-900 text-white rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-[10px]">
              {isSimulating ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isSimulating ? 'SIMULATING...' : 'RUN SIMULATION'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto pb-8 scrollbar-hide">
        <div className="flex justify-between gap-12 min-w-max px-4">
          {sortedRounds.map(roundNum => (
            <div key={roundNum} className="w-64 space-y-6">
               <div className="text-center">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em] bg-stone-50 px-3 py-1 rounded-full">
                    {roundNum === 1 ? 'Quarter-Finals' : roundNum === 2 ? 'Semi-Finals' : 'Championship'}
                  </span>
               </div>
               <div className="flex flex-col h-full justify-around gap-12 min-h-[400px]">
                  {playoffGames.filter(g => g.round === roundNum).map(game => (
                    <PlayoffMatchup key={game.id} game={game} teams={teams} handlePick={handlePick} />
                  ))}
               </div>
            </div>
          ))}

          {/* Winner Portal */}
          {champGame?.winnerId && (
            <div className="flex flex-col items-center justify-center">
               <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center p-12 bg-white rounded-[4rem] border-2 border-dashed border-stone-100 min-w-[320px] shadow-2xl">
                  <div className="relative mb-8">
                     <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-400/40">
                        <Trophy className="w-12 h-12 text-white" />
                     </div>
                     <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 2.5 }} className="absolute inset-0 bg-yellow-400 rounded-full -z-10 blur-3xl" />
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-[0.5em] text-yellow-600 mb-2">League Champion</p>
                  <h2 className="text-3xl font-black text-stone-900 mb-8 tracking-tight">
                     {teams.find(t => t.id === champGame.winnerId)?.name || 'Unknown Team'}
                  </h2>
                  <Button 
                    onClick={() => champGame.winnerId && completeSeason(champGame.winnerId)}
                    className="h-16 px-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl shadow-emerald-500/30"
                  >
                    Complete Season
                  </Button>
               </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayoffMatchup({ game, teams, handlePick }: { game: PlayoffGame, teams: Team[], handlePick: any }) {
  return (
    <div className="bg-white rounded-[2rem] shadow-lg border border-stone-100 overflow-hidden w-full divide-y divide-stone-50 transition-transform hover:scale-[1.02]">
       {[1, 2].map(pos => {
         const tId = pos === 1 ? game.team1Id : game.team2Id;
         const seed = pos === 1 ? game.seed1 : game.seed2;
         const team = teams.find(t => t.id === tId);
         const Icon = team ? (STUFFY_ICONS[team.icon as keyof typeof STUFFY_ICONS] || STUFFY_ICONS.TeddyBear) : null;
         
         return (
           <button 
             key={pos}
             onClick={() => team && handlePick(game.id, team.id)} 
             className={cn(
               "w-full flex items-center justify-between p-4 transition-all border-l-[6px]",
               game.winnerId === tId && tId ? "border-emerald-500 bg-emerald-50/20" : "border-transparent hover:bg-stone-50/50"
             )}
           >
             <div className="flex items-center gap-4">
               <div 
                 className="w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-inner text-white overflow-hidden"
                 style={{ backgroundColor: team?.primaryColor || '#f9fafb', borderColor: team?.secondaryColor || '#f3f4f6' }}
               >
                 {team?.logoUrl ? (
                   <img src={team.logoUrl} className="w-full h-full object-cover p-1" alt={team.id} />
                 ) : team && Icon ? (
                   <Icon className="w-5 h-5" />
                 ) : (
                   <AlertCircle className="w-5 h-5 text-stone-200" />
                 )}
               </div>
               <div className="text-left">
                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-0.5">
                    Seed {seed || 'TBD'}
                  </p>
                  <p className={cn("font-black text-sm tracking-tight", team ? "text-stone-900" : "text-stone-300 italic")}>
                    {team?.name || 'TBD'}
                  </p>
               </div>
             </div>
             {game.winnerId === tId && tId && (
               <div className="bg-emerald-500 rounded-full p-1 shadow-lg shadow-emerald-500/20">
                 <CheckCircle2 className="w-3.5 h-3.5 text-white" />
               </div>
             )}
           </button>
         );
       })}
    </div>
  );
}
