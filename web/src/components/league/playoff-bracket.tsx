"use client";
// Last Updated: 2026-03-23T04:20:00-04:00

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, RotateCcw, Play, CheckCircle2, Star, RefreshCw
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_RENDER_MAP, STADIUM_BG } from '@/lib/league/assetMap';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StuffyIcon } from '@/lib/league/types';

export default function PlayoffBracket() {
  // Updated: 2026-03-23T10:16:00-04:00
  const { 
    teams, playoffGames, setPlayoffGames, syncPlayoffGames, 
    completeSeason, handlePick, setActiveTab, generatePlayoffs 
  } = useLeague();
  const [isSimulating, setIsSimulating] = useState(false);

  const resetPlayoffs = async () => {
    await generatePlayoffs();
  };

  const simulatePlayoffRound = async () => {
    if (isSimulating || playoffGames.length === 0) return;
    setIsSimulating(true);

    const nextGames = [...playoffGames];
    const rounds = Array.from(new Set(nextGames.map(g => g.round))).sort((a, b) => a - b);
    
    // Find first unfinished round
    let currentRound = 1;
    for (const r of rounds) {
      if (nextGames.filter(g => g.round === r).some(g => !g.winnerId)) {
        currentRound = r;
        break;
      }
    }

    const gamesInRound = nextGames.filter(g => g.round === currentRound);
    
    for (const game of gamesInRound) {
       if (game.winnerId || !game.team1Id || !game.team2Id) continue;

       const t1 = teams.find(t => t.id === game.team1Id);
       const t2 = teams.find(t => t.id === game.team2Id);
       
       if (t1 && t2) {
          const t1P = (t1.offenseRating || 72) + (t1.defenseRating || 72);
          const t2P = (t2.offenseRating || 72) + (t2.defenseRating || 72);
          
          // Scores - Ensure no ties in playoffs
          let s1 = Math.floor(Math.random() * 20) + 10 + (t1P / 10);
          const s2 = Math.floor(Math.random() * 20) + 10 + (t2P / 10);
          
          if (Math.floor(s1) === Math.floor(s2)) {
             s1 += 1; // Basic no-tie rule for playoffs
          }
          
          game.team1Score = Math.floor(s1);
          game.team2Score = Math.floor(s2);
          game.winnerId = s1 > s2 ? t1.id : t2.id;

          // Propagate to next round
          const nextRound = currentRound + 1;
          const nextMatchIdx = Math.floor(game.matchupIndex / 2);
          const isSlot1 = game.matchupIndex % 2 === 0;
          
          const targetGame = nextGames.find(g => g.round === nextRound && g.matchupIndex === nextMatchIdx);
          if (targetGame) {
             if (isSlot1) {
                targetGame.team1Id = game.winnerId;
                targetGame.seed1 = game.winnerId === game.team1Id ? game.seed1 : game.seed2;
             } else {
                targetGame.team2Id = game.winnerId;
                targetGame.seed2 = game.winnerId === game.team1Id ? game.seed1 : game.seed2;
             }
          }
       }
    }

    setPlayoffGames(nextGames);
    await syncPlayoffGames(nextGames);
    setIsSimulating(false);
  };

  const champGame = playoffGames.find(g => g.round === 3 && g.winnerId);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      {/* Tournament Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 p-8 rounded-3xl border border-stone-100 shadow-sm relative overflow-hidden bg-white/80 backdrop-blur-xl group">
        <div className="absolute inset-0 z-0 overflow-hidden opacity-10">
           <Image src={STADIUM_BG} fill className="object-cover scale-105 group-hover:scale-100 transition-transform duration-1000 saturate-0" alt="Stadium" sizes="100vw" />
           <div className="absolute inset-0 bg-linear-to-t from-white via-stone-50/20 to-transparent" />
        </div>
        
        <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-5">
               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-100">
                  <Trophy className="w-7 h-7 text-emerald-500" />
               </div>
               <div>
                  <h2 className="text-4xl font-black text-stone-900 uppercase tracking-tighter leading-none italic">Playoff Bracket</h2>
                  <p className="text-emerald-500/60 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Road to the Stuffy Bowl</p>
               </div>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Button 
            variant="outline" 
            onClick={resetPlayoffs}
            className="h-14 px-8 rounded-2xl border-stone-100 bg-white text-stone-900 hover:bg-stone-50 transition-all font-black text-[10px] uppercase tracking-widest gap-3 shadow-sm shadow-stone-200/50"
          >
            <RotateCcw className="w-4 h-4 text-emerald-500" />
            Reset Bracket
          </Button>
          <Button 
            onClick={simulatePlayoffRound}
            disabled={isSimulating}
            className={cn(
              "h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 shadow-2xl transition-all active:scale-[0.98]",
              "bg-stone-900 hover:bg-black text-white shadow-stone-900/20"
            )}
          >
            {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isSimulating ? 'Simulating...' : 'Advance Round'}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-10">
        {champGame ? (
          <Button 
            onClick={() => {
              completeSeason(champGame.winnerId!);
              setActiveTab('stats');
            }}
            className="h-16 px-12 rounded-2xl bg-emerald-500 border-0 text-white font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 gap-3"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finalize Season
          </Button>
        ) : (
          <Button 
            onClick={simulatePlayoffRound}
            disabled={isSimulating || playoffGames.length === 0}
            className="h-16 px-12 rounded-2xl bg-stone-900 border-0 text-white font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl hover:bg-black transition-all active:scale-95 gap-3"
          >
            {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            {isSimulating ? 'Simulating...' : 'Next Round Cycle'}
          </Button>
        )}
      </div>

      {/* Bracket View */}
      <div className="relative">
         <div className="flex justify-between gap-4 items-stretch min-h-[500px] overflow-x-auto pb-8 custom-scrollbar px-2">
            {/* Round 1 */}
            <RoundColumn 
              round={1} 
              title="Quarter" 
              games={playoffGames.filter(g => g.round === 1)} 
              teams={teams}
              onPick={handlePick}
            />
            
            {/* Round 2 */}
            <RoundColumn 
              round={2} 
              title="Semi" 
              games={playoffGames.filter(g => g.round === 2)} 
              teams={teams}
              onPick={handlePick}
            />
 
            {/* Finals */}
            <RoundColumn 
              round={3} 
              title="Final" 
              games={playoffGames.filter(g => g.round === 3)} 
              teams={teams}
              onPick={handlePick}
            />
         </div>
      </div>
    </div>
  );
}

import { Team, PlayoffGame } from '@/lib/league/types';

function RoundColumn({ round, title, games, teams, onPick }: { round: number, title: string, games: PlayoffGame[], teams: Team[], onPick: (gameId: string, winnerId: string) => void }) {
  return (
    <div className="flex-1 min-w-[280px] space-y-6">
      <div className="text-center space-y-1 relative">
         <div className="absolute top-1/2 left-0 w-full h-px bg-stone-100 -z-10" />
         <div className="bg-[#fafaf9] inline-block px-4">
            <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.4em]">R{round}</span>
            <h4 className="text-lg font-black text-stone-900 uppercase tracking-tighter">{title}</h4>
         </div>
      </div>
      
      <div className={cn("flex flex-col justify-around gap-8 min-h-full py-6")}>
        {games.map((game, idx) => (
          <MatchupCard key={game.id} game={game} teams={teams} delay={idx * 0.05} onPick={onPick} />
        ))}
        {games.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-stone-100 rounded-2xl text-stone-300 space-y-4 bg-white/30">
             <Star className="w-6 h-6 opacity-20 animate-pulse" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-300 text-center">Awaiting Seeding</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchupCard({ game, teams, delay, onPick }: { game: PlayoffGame, teams: Team[], delay: number, onPick: (gameId: string, winnerId: string) => void }) {
  const team1 = teams.find(t => t.id === game.team1Id);
  const team2 = teams.find(t => t.id === game.team2Id);
  
  const render1 = team1 ? STUFFY_RENDER_MAP[team1.icon as StuffyIcon] : STUFFY_RENDER_MAP.TeddyBear;
  const render2 = team2 ? STUFFY_RENDER_MAP[team2.icon as StuffyIcon] : STUFFY_RENDER_MAP.TeddyBear;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative group scale-95 origin-center"
    >
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden group-hover:border-emerald-500/30 transition-all duration-500">
         {/* Team 1 */}
         <div 
           className={cn(
            "p-3 flex items-center justify-between transition-all duration-500 relative",
            game.winnerId === team1?.id && !!team1?.id ? "bg-emerald-50/50" : "hover:bg-stone-50/50 cursor-pointer"
           )}
           onClick={() => team1 && onPick(game.id, team1.id)}
         >
            <div className="flex items-center gap-3">
               <div 
                className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-stone-100 shadow-md relative overflow-hidden transition-all duration-500 bg-white shrink-0"
                style={{ 
                  borderColor: team1?.logoUrl ? '#f8fafc' : team1?.primaryColor || '#f5f5f4', 
                }}
              >
                {team1?.logoUrl ? (
                  <div className="relative w-full h-full">
                    <Image src={team1.logoUrl} fill className="object-cover scale-105" alt={team1.id} sizes="80px" />
                  </div>
                ) : (
                  <div className="relative w-[130%] h-[130%] translate-y-2">
                     <Image src={render1} fill className="object-contain drop-shadow-lg" alt={team1?.name || '?'} sizes="104px" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest leading-none mb-1">{game.seed1 ? `#${game.seed1}` : '--'}</span>
                 <span className="text-xs font-black text-stone-900 uppercase tracking-tighter truncate max-w-[120px] leading-none italic">{team1?.name || 'Awaiting'}</span>
              </div>
            </div>
            <div className={cn("text-2xl font-black italic tracking-tighter", game.winnerId === team1?.id && !!team1?.id ? "text-emerald-500" : "text-stone-200")}>
               {game.team1Score || 0}
            </div>
            {game.winnerId === team1?.id && (
               <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500" />
            )}
         </div>

         {/* Visual Divider */}
         <div className="h-px w-full bg-stone-100" />

         {/* Team 2 */}
         <div 
           className={cn(
            "p-3 flex items-center justify-between transition-all duration-500 relative",
            game.winnerId === team2?.id && !!team2?.id ? "bg-emerald-50/50" : "hover:bg-stone-50/50 cursor-pointer"
           )}
           onClick={() => team2 && onPick(game.id, team2.id)}
         >
            <div className="flex items-center gap-3">
               <div 
                className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-stone-100 shadow-md relative overflow-hidden transition-all duration-500 bg-white shrink-0"
                style={{ 
                  borderColor: team2?.logoUrl ? '#f8fafc' : team2?.primaryColor || '#f5f5f4', 
                }}
              >
                {team2?.logoUrl ? (
                  <div className="relative w-full h-full">
                    <Image src={team2.logoUrl} fill className="object-cover scale-105" alt={team2.id} sizes="80px" />
                  </div>
                ) : (
                  <div className="relative w-[130%] h-[130%] translate-y-2">
                     <Image src={render2} fill className="object-contain drop-shadow-lg" alt={team2?.name || '?'} sizes="104px" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest leading-none mb-1">{game.seed2 ? `#${game.seed2}` : '--'}</span>
                 <span className="text-xs font-black text-stone-900 uppercase tracking-tighter truncate max-w-[120px] leading-none italic">{team2?.name || 'Awaiting'}</span>
              </div>
            </div>
            <div className={cn("text-2xl font-black italic tracking-tighter", game.winnerId === team2?.id && !!team2?.id ? "text-emerald-500" : "text-stone-200")}>
               {game.team2Score || 0}
            </div>
            {game.winnerId === team2?.id && (
               <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500" />
            )}
         </div>

         {/* Winner Badge - Center Overlay */}
         <AnimatePresence>
            {game.winnerId && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 text-white rounded-lg px-2 py-1 shadow-2xl z-50 transform"
              >
                 <span className="text-[8px] font-black uppercase tracking-tighter">Winner</span>
              </motion.div>
            )}
         </AnimatePresence>
      </div>
      
      {/* Branch Connectors */}
      <div className="absolute top-1/2 -right-12 w-12 h-px bg-stone-200 group-hover:bg-emerald-400/30 transition-colors duration-500" />
    </motion.div>
  );
}
