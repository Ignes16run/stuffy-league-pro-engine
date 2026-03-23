"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, RotateCcw, RefreshCw, Zap, Star
} from 'lucide-react';
import { useTournament, TournamentGame } from '@/context/tournament-context';
import { STUFFY_RENDER_MAP } from '@/lib/league/assetMap';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Team, StuffyIcon } from '@/lib/league/types';

const REGIONS = ['North', 'South', 'East', 'West'];

export default function TournamentBracket() {
  const { 
    tournamentGames, 
    tournamentTeams, 
    bracketSize, 
    winnerId,
    handlePick, 
    simulateFullTournament,
    resetTournament 
  } = useTournament();
  
  const [activeRegion, setActiveRegion] = useState(REGIONS[0]);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateAll = async () => {
    setIsSimulating(true);
    await new Promise(r => setTimeout(r, 800));
    simulateFullTournament();
    setIsSimulating(false);
  };

  const currentRegionGames = tournamentGames.filter(g => g.regionId === activeRegion);
  const finalFourGames = tournamentGames.filter(g => g.regionId === 'Final Four');
  const championshipGame = tournamentGames.find(g => g.regionId === 'Championship');

  const winningTeam = winnerId ? tournamentTeams.find(t => t.id === winnerId) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
      {/* Dynamic Header */}
      <div className="bg-stone-900 rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/20 blur-[120px] -mr-48 -mt-48 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center shadow-xl shadow-amber-500/20">
                <Trophy className="w-8 h-8 text-white" />
             </div>
             <div>
                <h2 className="text-3xl font-black uppercase tracking-tight italic">March Madness Mode</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-amber-500 text-[10px] font-black uppercase tracking-wider">{bracketSize} Teams</span>
                  <div className="w-1 h-1 bg-stone-700 rounded-full" />
                  <span className="text-stone-400 text-[10px] font-black uppercase tracking-wider">Single Elimination</span>
                </div>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              variant="outline" 
              onClick={resetTournament}
              className="h-12 px-6 rounded-xl border-stone-800 bg-stone-800/50 text-stone-400 hover:text-rose-400 hover:border-rose-400 transition-all font-black text-[10px] uppercase tracking-widest gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
            
            <Button 
              onClick={handleSimulateAll}
              disabled={isSimulating || !!winnerId}
              className="h-12 px-8 rounded-xl bg-amber-500 text-white border-0 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-amber-600 transition-all gap-2"
            >
              {isSimulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
              {isSimulating ? 'Processing...' : 'Simulate All'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-stone-100 rounded-2xl md:rounded-3xl border border-stone-200/50">
        {REGIONS.map(region => (
          <button
            key={region}
            onClick={() => setActiveRegion(region)}
            className={cn(
              "flex-1 min-w-[100px] py-3 px-4 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeRegion === region 
                ? "bg-white text-stone-900 shadow-sm" 
                : "text-stone-400 hover:text-stone-600"
            )}
          >
            {region}
          </button>
        ))}
        <button
          onClick={() => setActiveRegion('Final Four')}
          className={cn(
            "flex-1 min-w-[120px] py-3 px-4 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeRegion === 'Final Four' 
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
              : "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
          )}
        >
          Final Four
        </button>
      </div>

      {/* Region Rendering */}
      <div className="relative min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeRegion !== 'Final Four' ? (
            <motion.div 
              key={activeRegion}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-4 md:gap-8 overflow-x-auto pb-8 custom-scrollbar pt-2"
            >
              <RegionalBracket 
                games={currentRegionGames}
                teams={tournamentTeams}
                handlePick={handlePick}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="final-four"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-12 pt-8"
            >
               <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
                  <RoundColumn 
                    title="Final Four"
                    round={finalFourGames[0]?.round || 0}
                    games={finalFourGames}
                    teams={tournamentTeams}
                    onPick={handlePick}
                  />
                  <div className="flex flex-col items-center gap-8">
                    <div className="w-px h-12 bg-stone-200" />
                    <RoundColumn 
                      title="Championship"
                      round={championshipGame?.round || 0}
                      games={championshipGame ? [championshipGame] : []}
                      teams={tournamentTeams}
                      onPick={handlePick}
                    />
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Winner Overlay */}
      <AnimatePresence>
        {winnerId && winningTeam && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xl p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-2xl border border-stone-100 max-w-lg w-full text-center space-y-10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-400/20 blur-[100px] pointer-events-none" />
              
              <div className="relative space-y-8">
                 <div 
                  className="w-40 h-40 mx-auto rounded-[2.5rem] flex items-center justify-center border-8 border-white shadow-2xl transition-all duration-700 hover:rotate-6 relative overflow-hidden"
                  style={{ 
                    backgroundColor: winningTeam.primaryColor, 
                    borderColor: winningTeam.secondaryColor,
                    boxShadow: `0 30px 60px -15px ${winningTeam.primaryColor}90`
                  }}
                >
                   {winningTeam.logoUrl ? (
                     <Image src={winningTeam.logoUrl} fill className="object-cover" alt={winningTeam.name} />
                   ) : (
                     <div className="relative w-[130%] h-[130%] translate-y-4">
                        <Image src={STUFFY_RENDER_MAP[winningTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear} fill className="object-contain drop-shadow-2xl" alt={winningTeam.name} />
                     </div>
                   )}
                </div>

                <div className="space-y-4">
                  <div className="inline-block px-6 py-2 bg-amber-100 rounded-full">
                    <span className="text-amber-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                       <Star className="w-3.5 h-3.5 fill-current" /> National Champion <Star className="w-3.5 h-3.5 fill-current" />
                    </span>
                  </div>
                  <h3 className="text-5xl font-black text-stone-900 uppercase tracking-tighter leading-none">{winningTeam.name}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <Button 
                    variant="outline"
                    onClick={() => {}} 
                    className="h-14 rounded-2xl border-stone-100 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-stone-50"
                  >
                    View Stats
                  </Button>
                  <Button 
                    onClick={resetTournament}
                    className="h-14 rounded-2xl bg-stone-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black"
                  >
                    Play Again
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RegionalBracket({ games, teams, handlePick }: { games: TournamentGame[], teams: Team[], handlePick: (g: string, w: string) => void }) {
  const rounds = Array.from(new Set(games.map(g => g.round))).sort((a, b) => a - b);
  const titles = ["Round 1", "Regional Semi", "Regional Final"];

  return (
     <>
      {rounds.map((r, i) => (
         <RoundColumn 
          key={r}
          round={r}
          title={titles[i] || `Round ${r}`}
          games={games.filter(g => g.round === r)}
          teams={teams}
          onPick={handlePick}
         />
      ))}
     </>
  );
}

function RoundColumn({ round, title, games, teams, onPick }: { round: number, title: string, games: TournamentGame[], teams: Team[], onPick: (gameId: string, winnerId: string) => void }) {
  return (
    <div className="w-[240px] shrink-0 space-y-4 h-full flex flex-col items-center">
      <div className="text-center w-full bg-stone-50 py-3 rounded-2xl border border-stone-100">
          <span className="text-[8px] font-black text-stone-400 uppercase tracking-[0.3em] block mb-1">Depth {round}</span>
          <h4 className="text-[11px] font-black text-stone-900 uppercase tracking-tight">{title}</h4>
      </div>
      
      <div className="flex flex-col justify-around gap-6 py-2 grow w-full">
        {games.map((game, idx) => (
          <MatchupCard key={game.id} game={game} teams={teams} delay={idx * 0.05} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

function MatchupCard({ game, teams, delay, onPick }: { game: TournamentGame, teams: Team[], delay: number, onPick: (gameId: string, winnerId: string) => void }) {
  const team1 = teams.find(t => t.id === game.team1Id);
  const team2 = teams.find(t => t.id === game.team2Id);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="relative w-full"
    >
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-lg overflow-hidden relative min-h-[72px]">
         {/* Team 1 Slot */}
         <div 
           className={cn(
            "p-2.5 flex items-center justify-between transition-all cursor-pointer border-b border-stone-50 h-[36px]",
            game.winnerId === team1?.id ? "bg-amber-500/10" : "hover:bg-stone-50"
           )}
           onClick={() => team1 && onPick(game.id, team1.id)}
         >
            <div className="flex items-center gap-3 overflow-hidden">
               <span className="text-[9px] font-black text-stone-400 w-4">{game.seed1 || '•'}</span>
               {team1 ? (
                 <>
                   <div className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white relative overflow-hidden" style={{ backgroundColor: team1.primaryColor }}>
                     <Image src={STUFFY_RENDER_MAP[team1.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear} fill className="object-contain p-0.5" alt={team1.name} />
                   </div>
                   <span className="text-[10px] font-black text-stone-900 uppercase truncate">{team1.name}</span>
                 </>
               ) : (
                 <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest italic">Waiting...</span>
               )}
            </div>
            {game.team1Score !== undefined && (
              <span className={cn("text-xs font-black", game.winnerId === team1?.id ? "text-amber-600" : "text-stone-400")}>{game.team1Score}</span>
            )}
         </div>

         {/* Team 2 Slot */}
         <div 
           className={cn(
            "p-2.5 flex items-center justify-between transition-all cursor-pointer h-[36px]",
            game.winnerId === team2?.id ? "bg-amber-500/10" : "hover:bg-stone-50"
           )}
           onClick={() => team2 && onPick(game.id, team2.id)}
         >
            <div className="flex items-center gap-3 overflow-hidden">
               <span className="text-[9px] font-black text-stone-400 w-4">{game.seed2 || '•'}</span>
               {team2 ? (
                 <>
                   <div className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white relative overflow-hidden" style={{ backgroundColor: team2.primaryColor }}>
                     <Image src={STUFFY_RENDER_MAP[team2.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear} fill className="object-contain p-0.5" alt={team2.name} />
                   </div>
                   <span className="text-[10px] font-black text-stone-900 uppercase truncate">{team2.name}</span>
                 </>
               ) : (
                 <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest italic">Waiting...</span>
               )}
            </div>
            {game.team2Score !== undefined && (
              <span className={cn("text-xs font-black", game.winnerId === team2?.id ? "text-amber-600" : "text-stone-400")}>{game.team2Score}</span>
            )}
         </div>

         {/* Selection Indicator */}
         <AnimatePresence>
            {game.winnerId && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute right-0 top-0 bottom-0 w-1 bg-amber-500" />
            )}
         </AnimatePresence>
      </div>
      
      {/* Visual Branch Line */}
      <div className="absolute top-1/2 -right-4 w-4 h-px bg-stone-200 -z-10" />
    </motion.div>
  );
}
