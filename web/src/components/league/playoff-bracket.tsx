"use client";

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
import { StuffyIcon, Team, PlayoffGame } from '@/lib/league/types';

// Updated: 2026-03-29T10:00:00-04:00

export default function PlayoffBracket() {
  const { 
    teams, playoffGames, 
    completeSeason, setActiveTab, generatePlayoffs, updatePlayoffGameResult
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
          
          let s1 = Math.floor(Math.random() * 20) + 10 + (t1P / 10);
          const s2 = Math.floor(Math.random() * 20) + 10 + (t2P / 10);
          
          if (Math.floor(s1) === Math.floor(s2)) {
             s1 += 1;
          }
          
          updatePlayoffGameResult(game.id, Math.floor(s1), Math.floor(s2), s1 > s2 ? t1.id : t2.id);
       }
    }
    setIsSimulating(false);
  };

  const champGame = playoffGames.find(g => g.round === 3 && g.winnerId);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 p-8 rounded-4xl border border-stone-100 shadow-sm relative overflow-hidden bg-white/80 backdrop-blur-xl group">
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

       <div className="relative overflow-hidden rounded-[3rem] border border-stone-100 bg-white shadow-2xl">
         <div className="flex justify-start gap-8 md:gap-16 items-start overflow-x-auto scroll-smooth snap-x snap-mandatory pt-12 pb-20 px-12 custom-scrollbar">
            <RoundColumn 
              round={1} 
              title="Quarter Finals" 
              games={playoffGames.filter(g => g.round === 1)} 
              teams={teams}
            />
            
            <RoundColumn 
              round={2} 
              title="Semi Finals" 
              games={playoffGames.filter(g => g.round === 2)} 
              teams={teams}
            />
 
            <RoundColumn 
              round={3} 
              title="THE STUFFY BOWL" 
              games={playoffGames.filter(g => g.round === 3)} 
              teams={teams}
            />
         </div>
         
         <div className="absolute inset-y-0 left-0 w-32 bg-linear-to-r from-white to-transparent pointer-events-none z-10" />
         <div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-white to-transparent pointer-events-none z-10" />
      </div>

      <style jsx global>{`
         .custom-scrollbar::-webkit-scrollbar {
           height: 8px;
         }
         .custom-scrollbar::-webkit-scrollbar-track {
           background: transparent;
         }
         .custom-scrollbar::-webkit-scrollbar-thumb {
           background: #e5e7eb;
           border-radius: 10px;
         }
         .custom-scrollbar::-webkit-scrollbar-thumb:hover {
           background: #d1d5db;
         }
      `}</style>
    </div>
  );
}

function RoundColumn({ round, title, games, teams }: { round: number, title: string, games: PlayoffGame[], teams: Team[] }) {
  return (
    <div className="flex-1 min-w-[320px] max-w-[400px] space-y-12 snap-center">
      <div className="text-center space-y-1 relative">
         <div className="absolute top-1/2 left-0 w-full h-px bg-stone-100 -z-10" />
         <div className="bg-[#fafaf9] inline-block px-4">
            <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.4em]">R{round}</span>
            <h4 className="text-lg font-black text-stone-900 uppercase tracking-tighter">{title}</h4>
         </div>
      </div>
      
      <div className={cn("flex flex-col justify-around gap-8 min-h-full py-6")}>
        {games.map((game, idx) => (
          <MatchupCard key={game.id} game={game} teams={teams} delay={idx * 0.05} />
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

function MatchupCard({ game, teams, delay }: { game: PlayoffGame, teams: Team[], delay: number }) {
  const { updatePlayoffGameResult, setActiveBroadcastGameId } = useLeague();
  const team1 = teams.find(t => t.id === game.team1Id);
  const team2 = teams.find(t => t.id === game.team2Id);
  
  const render1 = team1 ? STUFFY_RENDER_MAP[team1.icon as StuffyIcon] : STUFFY_RENDER_MAP.TeddyBear;
  const render2 = team2 ? STUFFY_RENDER_MAP[team2.icon as StuffyIcon] : STUFFY_RENDER_MAP.TeddyBear;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative group scale-100 origin-center"
    >
      <div className="bg-white rounded-4xl border-2 border-stone-100 shadow-xl overflow-hidden group-hover:border-emerald-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/5">
         {/* Team 1 */}
         <div 
           className={cn(
            "p-3 flex items-center justify-between transition-all duration-500 relative",
            game.winnerId === team1?.id && !!team1?.id ? "bg-emerald-50/50" : "hover:bg-stone-50/50 cursor-pointer"
           )}
           onClick={() => team1 && updatePlayoffGameResult(game.id, 24, 14, team1.id)}
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

         <div className="h-px w-full bg-stone-100" />

         {/* Team 2 */}
         <div 
           className={cn(
            "p-3 flex items-center justify-between transition-all duration-500 relative",
            game.winnerId === team2?.id && !!team2?.id ? "bg-emerald-50/50" : "hover:bg-stone-50/50 cursor-pointer"
           )}
           onClick={() => team2 && updatePlayoffGameResult(game.id, 14, 24, team2.id)}
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

          {/* Match Actions */}
          <div className="bg-stone-50 border-t border-stone-100 p-2 flex items-center justify-between">
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 if (team1 && team2) setActiveBroadcastGameId(game.id);
               }}
               disabled={!team1 || !team2}
               className={cn(
                 "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 (!team1 || !team2) ? "text-stone-300 pointer-events-none" : "hover:bg-stone-900 hover:text-white group-hover:bg-stone-900 group-hover:text-white"
               )}
             >
               <Play className="w-3 h-3 fill-current" />
               Launch Broadcast
             </button>
          </div>
       </div>
      
      <div className="absolute top-1/2 -right-12 w-12 h-px bg-stone-200 group-hover:bg-emerald-400/30 transition-colors duration-500" />
    </motion.div>
  );
}
