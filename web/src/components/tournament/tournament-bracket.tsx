"use client";
// Last Updated: 2026-03-23T09:50:00-04:00

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, RotateCcw, Play, CheckCircle2, Star, RefreshCw, ChevronRight, LayoutDashboard
} from 'lucide-react';
import { useTournament } from '@/context/tournament-context';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Team, PlayoffGame } from '@/lib/league/types';

export default function TournamentBracket() {
  const { 
    tournamentGames, 
    tournamentTeams, 
    isStarted, 
    bracketSize, 
    winnerId,
    handlePick, 
    simulateRound, 
    resetTournament 
  } = useTournament();
  
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async () => {
    setIsSimulating(true);
    // Add a small delay for affect
    await new Promise(r => setTimeout(r, 600));
    simulateRound();
    setIsSimulating(false);
  };

  const rounds = Array.from(new Set(tournamentGames.map(g => g.round))).sort((a, b) => a - b);
  
  const getRoundTitle = (round: number, totalRounds: number) => {
    if (round === totalRounds) return "Championship";
    if (round === totalRounds - 1) return "Semifinals";
    if (round === totalRounds - 2) return "Quarterfinals";
    if (round === totalRounds - 3) return "Round of 16";
    if (round === totalRounds - 4) return "Round of 32";
    return `Round ${round}`;
  };

  const winningTeam = winnerId ? tournamentTeams.find(t => t.id === winnerId) : null;

  return (
    <div className="max-w-[100vw] overflow-x-hidden space-y-12 pb-20 px-4 md:px-8">
      {/* Tournament Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-white/40 backdrop-blur-3xl p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-stone-100 shadow-2xl shadow-stone-200/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-5">
               <div className="w-12 h-12 md:w-16 md:h-16 bg-linear-to-br from-amber-400 to-amber-600 rounded-2xl md:rounded-4xl flex items-center justify-center shadow-2xl shadow-amber-500/40 border-2 border-white/20">
                  <Trophy className="w-6 h-6 md:w-7 md:h-7 text-white" />
               </div>
               <div>
                  <h2 className="text-2xl md:text-4xl font-black text-stone-900 uppercase tracking-tight leading-none">Tournament Mode</h2>
                  <p className="text-stone-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] mt-2 md:mt-3 px-1">{bracketSize} Team Single Elimination</p>
               </div>
            </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 md:gap-4 relative z-10">
          <Button 
            variant="outline" 
            onClick={resetTournament}
            disabled={isSimulating}
            className="h-12 md:h-16 px-4 md:px-8 rounded-xl md:rounded-2xl border-stone-100 bg-white/60 text-stone-400 hover:text-rose-500 transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest gap-2 md:gap-3 shadow-sm group"
          >
            <RotateCcw className="w-3.4 md:w-4 h-3.5 md:h-4 group-hover:rotate-180 transition-transform duration-500" />
            Reset
          </Button>

          {winnerId ? (
            <div className="h-12 md:h-16 px-6 md:px-10 rounded-xl md:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center gap-3 border border-emerald-100 animate-in fade-in zoom-in duration-500">
               <Trophy className="w-5 h-5 fill-emerald-500/20" />
               <span className="font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em]">Winner: {winningTeam?.name}</span>
            </div>
          ) : (
            <Button 
              onClick={handleSimulate}
              disabled={isSimulating}
              className="h-12 md:h-16 px-6 md:px-12 rounded-xl md:rounded-2xl bg-stone-900 border-0 text-white font-black text-[10px] md:text-[11px] uppercase tracking-[0.25em] shadow-2xl hover:bg-black transition-all active:scale-95 gap-3"
            >
              {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              {isSimulating ? 'Simulating...' : 'Simulate Round'}
            </Button>
          )}
        </div>
      </div>

      {/* Bracket View */}
      <div className="relative overflow-x-auto pb-12 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
         <div className="flex gap-8 md:gap-16 items-start min-w-max pb-4">
            {rounds.map(round => (
              <RoundColumn 
                key={round}
                round={round} 
                title={getRoundTitle(round, rounds.length)} 
                games={tournamentGames.filter(g => g.round === round)} 
                teams={tournamentTeams}
                onPick={handlePick}
              />
            ))}
         </div>
      </div>

      {/* Champion Celebration Overlay */}
      <AnimatePresence>
        {winnerId && winningTeam && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 backdrop-blur-md p-6"
            onClick={() => {}} 
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-12 shadow-2xl border border-stone-100 max-w-md w-full text-center space-y-8 relative overflow-hidden"
            >
              <div className="absolute inset-0 pointer-events-none">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-400/20 blur-[80px]" />
              </div>

              <div className="relative space-y-6">
                <div 
                  className="w-32 h-32 mx-auto rounded-3xl flex items-center justify-center border-4 border-white shadow-2xl transition-all duration-700 rotate-12"
                  style={{ 
                    backgroundColor: winningTeam.primaryColor, 
                    borderColor: winningTeam.secondaryColor,
                    boxShadow: `0 20px 50px -10px ${winningTeam.primaryColor}80`
                  }}
                >
                   {winningTeam.logoUrl ? (
                     <img src={winningTeam.logoUrl} className="w-full h-full object-cover rounded-2xl" alt={winningTeam.name} />
                   ) : (
                     <Trophy className="w-16 h-16 text-white" />
                   )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-4xl font-black text-stone-900 uppercase tracking-tight">Champion!</h3>
                  <p className="text-stone-400 font-bold uppercase tracking-[0.3em] text-[10px]">Tournament Victory</p>
                </div>

                <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                   <p className="text-xl font-black text-stone-900 uppercase">{winningTeam.name}</p>
                </div>

                <Button 
                  onClick={resetTournament}
                  className="w-full h-16 rounded-2xl bg-stone-900 text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black"
                >
                  Start New Tournament
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoundColumn({ round, title, games, teams, onPick }: { round: number, title: string, games: PlayoffGame[], teams: Team[], onPick: (gameId: string, winnerId: string) => void }) {
  return (
    <div className="w-[300px] flex-shrink-0 space-y-8 h-full flex flex-col">
      <div className="text-center space-y-1 relative sticky top-0 bg-zinc-50/80 backdrop-blur-sm z-10 py-2">
         <div className="bg-white/60 border border-stone-100 rounded-full inline-block px-4 py-1.5 shadow-sm">
            <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.4em] block">Round {round}</span>
            <h4 className="text-sm font-black text-stone-900 uppercase tracking-tighter">{title}</h4>
         </div>
      </div>
      
      <div className={cn("flex flex-col justify-around gap-12 py-4 flex-grow")}>
        {games.map((game, idx) => (
          <MatchupCard key={game.id} game={game} teams={teams} delay={idx * 0.05} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

function MatchupCard({ game, teams, delay, onPick }: { game: PlayoffGame, teams: Team[], delay: number, onPick: (gameId: string, winnerId: string) => void }) {
  const team1 = teams.find(t => t.id === game.team1Id);
  const team2 = teams.find(t => t.id === game.team2Id);
  
  const Team1Icon = team1 ? (STUFFY_ICONS[team1.icon as keyof typeof STUFFY_ICONS] || STUFFY_ICONS.TeddyBear) : STUFFY_ICONS.TeddyBear;
  const Team2Icon = team2 ? (STUFFY_ICONS[team2.icon as keyof typeof STUFFY_ICONS] || STUFFY_ICONS.TeddyBear) : STUFFY_ICONS.TeddyBear;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative group w-full"
    >
      <div className="bg-white rounded-3xl border border-stone-100 shadow-xl shadow-stone-200/40 overflow-hidden group-hover:shadow-2xl transition-all duration-700 relative">
         {/* Team 1 */}
         <div 
           className={cn(
            "p-5 flex items-center justify-between transition-all duration-500",
            game.winnerId === team1?.id && !!team1?.id ? "bg-emerald-500/5" : "hover:bg-stone-50/50 cursor-pointer"
           )}
           onClick={() => team1 && !game.winnerId && onPick(game.id, team1.id)}
         >
            <div className="flex items-center gap-4">
               <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg transition-all duration-700 group-hover:scale-105"
                style={{ 
                  backgroundColor: team1?.primaryColor || '#f3f4f6', 
                  borderColor: team1?.secondaryColor || '#fff',
                  boxShadow: team1 ? `0 8px 24px -8px ${team1.primaryColor}40` : 'none'
                }}
              >
                {team1?.logoUrl ? (
                  <img src={team1.logoUrl} className="w-full h-full object-cover rounded-lg" alt={team1.name} />
                ) : (
                  <Team1Icon className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest leading-none mb-1.5">Seed #{game.seed1 || '?'}</span>
                 <span className="text-[13px] font-black text-stone-900 uppercase tracking-tight truncate max-w-[140px] leading-none">{team1?.name || '---'}</span>
              </div>
            </div>
            <div className={cn("text-2xl font-black italic tracking-tighter", game.winnerId === team1?.id && !!team1?.id ? "text-emerald-500" : "text-stone-200")}>
               {game.team1Score !== undefined ? game.team1Score : '--'}
            </div>
         </div>

         {/* Visual Divider */}
         <div className="h-px w-full bg-stone-50" />

         {/* Team 2 */}
         <div 
           className={cn(
            "p-5 flex items-center justify-between transition-all duration-500",
            game.winnerId === team2?.id && !!team2?.id ? "bg-emerald-500/5" : "hover:bg-stone-50/50 cursor-pointer"
           )}
           onClick={() => team2 && !game.winnerId && onPick(game.id, team2.id)}
         >
            <div className="flex items-center gap-4">
               <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg transition-all duration-700 group-hover:scale-105"
                style={{ 
                  backgroundColor: team2?.primaryColor || '#f3f4f6', 
                  borderColor: team2?.secondaryColor || '#fff',
                  boxShadow: team2 ? `0 8px 24px -8px ${team2.primaryColor}40` : 'none'
                }}
              >
                {team2?.logoUrl ? (
                  <img src={team2.logoUrl} className="w-full h-full object-cover rounded-lg" alt={team2.name} />
                ) : (
                  <Team2Icon className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest leading-none mb-1.5">Seed #{game.seed2 || '?'}</span>
                 <span className="text-[13px] font-black text-stone-900 uppercase tracking-tight truncate max-w-[140px] leading-none">{team2?.name || '---'}</span>
              </div>
            </div>
            <div className={cn("text-2xl font-black italic tracking-tighter", game.winnerId === team2?.id && !!team2?.id ? "text-emerald-500" : "text-stone-200")}>
               {game.team2Score !== undefined ? game.team2Score : '--'}
            </div>
         </div>

         {/* Winner Badge */}
         <AnimatePresence>
            {game.winnerId && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 text-white rounded-full p-1.5 shadow-2xl shadow-emerald-500/50 border-2 border-white z-20"
              >
                 <CheckCircle2 className="w-5 h-5" />
              </motion.div>
            )}
         </AnimatePresence>
      </div>
      
      {/* Branch Connectors (only if not final round) */}
      <div className="absolute top-1/2 -right-8 w-8 h-px bg-stone-100 -z-10" />
    </motion.div>
  );
}
