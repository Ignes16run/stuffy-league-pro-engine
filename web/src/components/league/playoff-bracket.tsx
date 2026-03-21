"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, RefreshCw, Play, CheckCircle2
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { PlayoffGame } from '@/lib/league/types';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { calculateStandings } from '@/lib/league/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';

export default function PlayoffBracket() {
  const { teams, games, playoffGames, setPlayoffGames, completeSeason, handlePick } = useLeague();
  const standings = useMemo(() => calculateStandings(teams, games), [teams, games]);
  const [isSimulating, setIsSimulating] = useState(false);

  const refreshSeeding = () => {
    const size = standings.length >= 8 ? 8 : 4;
    const initialGames: PlayoffGame[] = [];
    
    let matchups: [number, number][] = [];
    if (size === 8) {
      matchups = [[1, 8], [4, 5], [2, 7], [3, 6]];
    } else {
      matchups = [[1, 4], [2, 3]];
    }

    matchups.forEach(([seed1, seed2], i) => {
      initialGames.push({
        id: `p-1-${i}`,
        round: 1,
        matchupIndex: i,
        team1Id: standings[seed1 - 1].teamId,
        team2Id: standings[seed2 - 1].teamId,
        seed1,
        seed2,
      });
    });

    for (let i = 0; i < size / 4; i++) {
      initialGames.push({ id: `p-2-${i}`, round: 2, matchupIndex: i });
    }

    if (size === 8) {
      initialGames.push({ id: `p-3-0`, round: 3, matchupIndex: 0 });
    }

    setPlayoffGames(initialGames);
  };

  const simulatePlayoffs = async () => {
    setIsSimulating(true);
    const rounds = Math.max(...playoffGames.map(g => g.round));
    
    for (let r = 1; r <= rounds; r++) {
      const roundGames = playoffGames.filter(g => g.round === r);
      for (const game of roundGames) {
        let currentGame = game;
        // Re-read latest state to get updated team IDs from previous round
        // In this modular world, we'll access it through state.
        if (!currentGame.team1Id || !currentGame.team2Id) {
           // We might need to wait for state to update or use a more robust simulation approach
           // For now, assume it's correctly propagated or re-fetch.
        }

        if (currentGame.team1Id && currentGame.team2Id && !currentGame.winnerId) {
          const team1 = teams.find(t => t.id === currentGame.team1Id);
          const team2 = teams.find(t => t.id === currentGame.team2Id);
          
          if (team1 && team2) {
             const t1Power = (team1.offenseRating || 75) + (team1.defenseRating || 75);
             const t2Power = (team2.offenseRating || 75) + (team2.defenseRating || 75);
             const seedBoost = (currentGame.seed1 || 0) < (currentGame.seed2 || 0) ? 10 : 0;
             const winnerId = Math.random() * (t1Power + t2Power + seedBoost) < (t1Power + seedBoost) ? currentGame.team1Id! : currentGame.team2Id!;
             
             handlePick(currentGame.id, winnerId, false);
             await new Promise(resolve => setTimeout(resolve, 400));
          }
        }
      }
    }
    setIsSimulating(false);
  };

  useEffect(() => {
    if (standings.length >= 4 && playoffGames.length === 0) {
      refreshSeeding();
    }
  }, [standings.length, playoffGames.length]);

  if (standings.length < 4) {
    return (
      <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-stone-200">
        <Trophy className="w-16 h-16 text-stone-200 mx-auto mb-6" />
        <h3 className="text-2xl font-black text-stone-800 mb-2">Playoffs Pending</h3>
        <p className="text-stone-500 max-w-xs mx-auto">The league needs at least 4 teams to establish a playoff bracket.</p>
      </div>
    );
  }

  const rounds = Array.from(new Set(playoffGames.map(g => g.round))).sort();

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-12">
      <Card className="rounded-[2.5rem] border border-stone-100 shadow-xl overflow-hidden p-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <CardTitle className="text-2xl font-black text-stone-900 uppercase tracking-widest leading-none mb-1">
              Championship Bracket
            </CardTitle>
            <CardDescription className="text-stone-500 text-sm">
              The road to the Stuffy Cup
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={refreshSeeding} disabled={isSimulating}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh Seeding
            </Button>
            <Button size="lg" onClick={simulatePlayoffs} disabled={isSimulating || playoffGames.every(g => g.winnerId)} className="bg-stone-900 text-white rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs">
              {isSimulating ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isSimulating ? 'Simulating...' : 'Simulate Playoffs'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto pb-8">
        <div className="flex justify-between gap-10 min-w-max px-2">
          {rounds.map(round => (
            <div key={round} className="w-72 space-y-6">
               <div className="text-center">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">
                    {round === 1 ? 'Quarter-Finals' : round === 2 ? 'Semi-Finals' : 'Championship'}
                  </span>
               </div>
               <div className="flex flex-col h-full justify-around gap-12 pt-4">
                  {playoffGames.filter(g => g.round === round).map(game => (
                    <PlayoffMatchup key={game.id} game={game} />
                  ))}
               </div>
            </div>
          ))}

          {/* Champion Display */}
          {playoffGames.find(g => g.round === Math.max(...rounds))?.winnerId && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border-2 border-dashed border-stone-100 min-w-[320px]">
               <div className="relative mb-6">
                  <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-400/50">
                     <Trophy className="w-12 h-12 text-white" />
                  </div>
                  <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.4, 0.1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-yellow-400 rounded-full -z-10 blur-2xl" />
               </div>
               <p className="text-[10px] uppercase font-black tracking-[0.4em] text-yellow-600 mb-2">Champion</p>
               <h2 className="text-3xl font-black text-stone-900 mb-6">
                  {teams.find(t => t.id === playoffGames.find(g => g.round === Math.max(...rounds))?.winnerId)?.name}
               </h2>
               <Button 
                 onClick={() => {
                   const winId = playoffGames.find(g => g.round === Math.max(...rounds))?.winnerId;
                   if (winId) completeSeason(winId);
                 }}
                 className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20"
               >
                 Complete Season & Archive
               </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayoffMatchup({ game }: { game: PlayoffGame }) {
  const { teams, handlePick } = useLeague();
  const t1 = teams.find(t => t.id === game.team1Id);
  const t2 = teams.find(t => t.id === game.team2Id);

  return (
    <div className="bg-white rounded-[1.5rem] shadow-sm border border-stone-100 overflow-hidden w-full divide-y divide-stone-50">
       {[t1, t2].map((team, idx) => (
         <button 
           key={idx} 
           onClick={() => team && handlePick(game.id, team.id)} 
           className={cn(
             "w-full flex items-center justify-between p-4 transition-all border-l-4",
             game.winnerId === team?.id ? "border-emerald-500 bg-emerald-50/20" : "border-transparent hover:bg-stone-50"
           )}
         >
           <div className="flex items-center gap-3">
           <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-sm text-white"
                style={{ backgroundColor: team?.primaryColor || '#f9fafb', borderColor: team?.secondaryColor || '#f3f4f6' }}
              >
                 {team?.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-cover" alt={team.name} /> : (team ? <span className="opacity-0">?</span> : <span className="text-stone-300 font-bold">?</span>)}
                 {team && !team.logoUrl && React.createElement(STUFFY_ICONS[team.icon], { className: "w-5 h-5" })}
              </div>
              <div className="text-left">
                 <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">Seed {idx === 0 ? game.seed1 : game.seed2}</p>
                 <span className={cn("font-black text-sm", team ? "text-stone-900" : "text-stone-300 italic")}>{team?.name || 'TBD'}</span>
              </div>
           </div>
           {game.winnerId === team?.id && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
         </button>
       ))}
    </div>
  );
}
