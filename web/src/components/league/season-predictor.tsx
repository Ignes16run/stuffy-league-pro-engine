"use client";

import React, { useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  PlayCircle,
  Settings,
  FastForward,
  Monitor,
  Users,
  Wrench,
  Star
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { calculateStandings } from '@/lib/league/utils';
import { generateGameStorylines } from '@/lib/league/storylineEngine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateDivisionSchedule } from '@/lib/league/structureEngine';

// Last Updated: 2026-03-29T05:39Z

export default function SeasonPredictor() {
  const {
    teams, games, setGames, simulateSeason, simulateGames, handlePick,
    isSimulating, numWeeks, setNumWeeks, history,
    setActiveBroadcastGameId, currentWeek, advanceWeek, setCurrentWeek
  } = useLeague();

  const weekGames = useMemo(() => games.filter(g => g.week === currentWeek), [games, currentWeek]);

  const handleFixSchedule = () => {
    const newGames = generateDivisionSchedule(teams, numWeeks);
    setGames(newGames);
  };

  const allWeekGamesFinished = useMemo(() => weekGames.every(g => g.winnerId || g.isTie || (g.homeScore !== undefined && g.awayScore !== undefined)), [weekGames]);
  const allSeasonGamesFinished = useMemo(() => games.every(g => g.winnerId || g.isTie || (g.homeScore !== undefined && g.awayScore !== undefined)), [games]);

  const currentStandings = useMemo(() => calculateStandings(teams, games), [teams, games]);
// Updated: 2026-03-27T20:13Z

  const sortedWeekGames = useMemo(() => {
    const withDetails = weekGames.map(game => {
      const storylines = generateGameStorylines(game, teams, currentStandings, history);
      const typeWeights: Record<string, number> = {
        'Streak': 100,           // Clash of Titans (Top performance)
        'Rivalry': 80,           // High stakes grudge match
        'PlayoffRematch': 60,    // Defending Champ
        'UpsetWatch': 40,        // David vs Goliath
        'FirstMeeting': 20
      };
      
      const weight = storylines.reduce((sum, s) => sum + (typeWeights[s.type as string] || 0), 0);
      const home = teams.find(t => t.id === game.homeTeamId);
      const away = teams.find(t => t.id === game.awayTeamId);
      const combinedOvr = (home?.overallRating || 0) + (away?.overallRating || 0);
      
      return { 
        game, 
        storylines, 
        totalWeight: weight + (combinedOvr / 1000)
      };
    });

    return withDetails.sort((a, b) => b.totalWeight - a.totalWeight);
  }, [weekGames, teams, currentStandings, history]);

  const teamRecords = useMemo(() => {
    const records: Record<string, string> = {};
    currentStandings.forEach(s => {
      records[s.teamId] = `${s.wins}-${s.losses}-${s.ties}`;
    });
    return records;
  }, [currentStandings]);

  if (teams.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-4xl bg-stone-50 border border-dashed border-stone-200 col-span-full">
        <Users className="w-16 h-16 text-stone-200 mx-auto mb-6" />
        <h3 className="text-2xl font-black text-stone-800 mb-2">The League is Empty</h3>
        <p className="text-stone-500 max-w-xs mx-auto text-sm">Head over to Team Setup to recruit your first stuffy competitors.</p>
      </div>
    );
  }

  const teamsOnBye = teams.filter(t => !weekGames.some(g => g.homeTeamId === t.id || g.awayTeamId === t.id));

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Dynamic Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/60 backdrop-blur-2xl p-6 rounded-[2.5rem] shadow-sm border border-stone-100/50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 text-stone-300 hover:text-stone-900 transition-all rounded-xl"
            disabled={currentWeek === 1}
            onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="text-center min-w-[120px]">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em] mb-1">Active Week</p>
            <h2 className="text-3xl font-black text-stone-900 leading-none italic tracking-tighter">
              {currentWeek} <span className="text-stone-200 not-italic">/</span> {numWeeks}
            </h2>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 text-stone-300 hover:text-stone-900 transition-all rounded-xl"
            disabled={currentWeek === numWeeks}
            onClick={() => setCurrentWeek(Math.min(numWeeks, currentWeek + 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-2xl border-stone-200 hover:border-stone-400 transition-all font-black"
                  disabled={isSimulating}
                >
                  <Settings className="w-5 h-5 text-stone-400" />
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-stone-900 uppercase italic tracking-tighter">League Settings</DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="numWeeks" className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                    Season Length (Weeks)
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="numWeeks"
                      type="number"
                      min={1}
                      max={32}
                      value={numWeeks}
                      onChange={(e) => setNumWeeks(parseInt(e.target.value) || 0)}
                      className="rounded-2xl border-2 border-stone-100 font-bold h-12"
                    />
                    <p className="text-xs text-stone-400 italic">Default: {teams.length - 1} weeks</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100">
                   <Button 
                      onClick={handleFixSchedule}
                      variant="outline"
                      className="w-full h-12 rounded-2xl border-amber-200 text-amber-600 hover:bg-amber-50 gap-2 font-bold"
                   >
                     <Wrench className="w-4 h-4" />
                     Regenerate Schedule
                   </Button>
                   <p className="text-[10px] text-stone-400 mt-2 text-center uppercase tracking-widest leading-relaxed px-4">
                     Fixes issues where teams appear on bye by rebuilding matchups correctly.
                   </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="h-10 w-px bg-stone-100 mx-2 hidden md:block" />
          
          {allWeekGamesFinished && currentWeek < numWeeks ? (
            <Button
              onClick={advanceWeek}
              className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:scale-105 transition-all border-none"
            >
              <ChevronRight className="w-4 h-4 mr-2.5" />
              Advance to Week {currentWeek + 1}
            </Button>
          ) : (
            <Button
              onClick={() => simulateGames(currentWeek)}
              disabled={isSimulating || allWeekGamesFinished}
              className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-stone-900 text-white shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:scale-105 transition-all border-none"
            >
              <PlayCircle className="w-4 h-4 mr-2.5 text-emerald-400" />
              Simulate Week
            </Button>
          )}

          <Button
            onClick={simulateSeason}
            disabled={isSimulating || allSeasonGamesFinished}
            variant="outline"
            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-stone-200 text-stone-600 hover:bg-stone-50 transition-all ml-2"
          >
            <FastForward className="w-4 h-4 mr-2.5 text-amber-500" />
            Finish Season
          </Button>
        </div>
      </div>

      {/* Matchups Grid */}
      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {sortedWeekGames.map(({ game, storylines }, index) => {
            const home = teams.find(t => t.id === game.homeTeamId);
            const away = teams.find(t => t.id === game.awayTeamId);
            const isCompleted = !!(game.winnerId || game.isTie || (game.homeScore !== undefined && game.awayScore !== undefined));
            const isGotw = index === 0 && sortedWeekGames.length > 1 && storylines.length > 0;

            if (!home || !away) return null;

            return (
              <motion.div
                layout
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                    "max-w-5xl mx-auto w-full group relative",
                    isGotw && "z-10"
                )}
              >
                {isGotw && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center mb-[-20px] relative z-30 pointer-events-none"
                    >
                        <div className="bg-stone-900 text-white px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.5em] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-stone-800 flex items-center gap-4 italic">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            Game of the Week
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        </div>
                    </motion.div>
                )}
                <Card className={cn(
                  "border border-stone-100 bg-white/80 backdrop-blur-md overflow-hidden transition-all hover:shadow-xl hover:border-emerald-500/20 rounded-4xl p-6 pr-8 relative",
                   isCompleted && "bg-stone-50/40",
                   isGotw && "ring-[6px] ring-stone-900/5 border-stone-900 shadow-2xl",
                   storylines.length > 0 && storylines[0].type === 'Rivalry' && "border-rose-200 bg-rose-50/20 shadow-[0_20px_40px_rgba(244,63,94,0.04)]",
                   storylines.length > 0 && storylines[0].type === 'UpsetWatch' && "border-amber-200 bg-amber-50/20 shadow-[0_20px_40px_rgba(245,158,11,0.04)]",
                   storylines.length > 0 && storylines[0].type === 'PlayoffRematch' && "border-indigo-200 bg-indigo-50/20 shadow-[0_20px_40px_rgba(79,70,229,0.04)]",
                   storylines.length > 0 && storylines[0].type === 'Streak' && "border-emerald-200 bg-emerald-50/20 shadow-[0_20px_40px_rgba(16,185,129,0.04)]"
                )}>
                  {/* Themed Accent Bar */}
                  {storylines.length > 0 && (
                    <div className={cn(
                      "absolute top-0 bottom-0 left-0 w-1.5",
                      storylines[0].type === 'Rivalry' && "bg-rose-500",
                      storylines[0].type === 'UpsetWatch' && "bg-amber-500",
                      storylines[0].type === 'PlayoffRematch' && "bg-indigo-500",
                      storylines[0].type === 'Streak' && "bg-emerald-500"
                    )} />
                  )}
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Away Team */}
                    <button 
                      onClick={() => !isSimulating && handlePick(game.id, away.id)}
                      className={cn(
                        "flex items-center gap-6 flex-1 p-4 rounded-2xl transition-all text-left",
                        game.winnerId === away.id ? "bg-rose-500/5 ring-1 ring-rose-500/20 shadow-sm" : "hover:bg-stone-50"
                      )}
                    >
                      <div className="relative group/logo shrink-0">
                        <div 
                          className="w-36 h-36 rounded-[2rem] flex items-center justify-center border shadow-sm relative z-10 bg-white overflow-hidden"
                          style={{ borderColor: (away.primaryColor || "#000000") + '20' }}
                        >
                          <div className="relative w-[108px] h-[108px]">
                            <Image src={away.logoUrl || "/placeholder.png"} fill className="object-contain group-hover/logo:scale-110 transition-transform" alt={away.name} sizes="108px" />
                          </div>
                        </div>
                        <div className="absolute inset-0 blur-xl opacity-10 rounded-full" style={{ backgroundColor: away.primaryColor || "#000000" }} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-black text-stone-300 uppercase tracking-widest leading-none mb-1.5">VISITOR</span>
                        <span 
                          className="text-2xl font-black text-stone-900 uppercase tracking-tighter italic leading-[0.9] whitespace-normal text-wrap-balance min-w-0"
                          title={away.name}
                        >
                          {away.name}
                        </span>
                        <span className="text-[11px] text-stone-400 font-bold tabular-nums mt-1.5">{teamRecords[away.id]}</span>
                      </div>
                      {isCompleted && (
                        <span className={cn(
                          "text-4xl font-black tabular-nums tracking-tighter ml-auto italic",
                          game.winnerId === away.id ? "text-rose-500" : "text-stone-300"
                        )}>
                          {game.awayScore}
                        </span>
                      )}
                     </button>

                    {/* Minimal Center Component */}
                    <div className="flex flex-col items-center justify-center min-w-[160px] gap-4 relative">
                      {storylines.length > 0 && (
                        <div className={cn(
                          "px-4 py-1.5 rounded-full border shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-all group-hover:scale-105",
                          storylines[0].type === 'Rivalry' && "bg-rose-50 border-rose-200 text-rose-600 ring-4 ring-rose-500/5",
                          storylines[0].type === 'UpsetWatch' && "bg-amber-50 border-amber-200 text-amber-600 ring-4 ring-amber-500/5",
                          storylines[0].type === 'PlayoffRematch' && "bg-indigo-50 border-indigo-200 text-indigo-600 ring-4 ring-indigo-500/5",
                          storylines[0].type === 'Streak' && "bg-emerald-50 border-emerald-200 text-emerald-600 ring-4 ring-emerald-500/5",
                          !['Rivalry', 'UpsetWatch', 'PlayoffRematch', 'Streak'].includes(storylines[0].type) && "bg-stone-50 border-stone-200 text-stone-600"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full animate-pulse",
                            storylines[0].type === 'Rivalry' && "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
                            storylines[0].type === 'UpsetWatch' && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]",
                            storylines[0].type === 'PlayoffRematch' && "bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]",
                            storylines[0].type === 'Streak' && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                            !['Rivalry', 'UpsetWatch', 'PlayoffRematch', 'Streak'].includes(storylines[0].type) && "bg-stone-400"
                          )} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{storylines[0].label}</span>
                        </div>
                      )}

                      <div className="flex flex-col items-center gap-4 bg-white px-6 py-4 rounded-3xl border border-stone-100 shadow-sm relative z-10 w-full">
                        {!isCompleted ? (
                          <>
                            <span className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em]">VS</span>
                            <div className="flex gap-2.5">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveBroadcastGameId(game.id); }}
                                  className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-100 shadow-sm"
                                  title="Broadcast Mode"
                                >
                                  <Monitor className="w-4.5 h-4.5" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handlePick(game.id, 'tie'); }}
                                  className={cn(
                                    "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                    game.isTie ? "bg-amber-500 border-amber-500 text-white" : "bg-stone-50 border-stone-100 text-stone-400 hover:text-stone-900 font-bold"
                                  )}
                                >
                                  TIE
                                </button>
                            </div>
                          </>
                        ) : (
                          <div className={cn(
                            "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em]",
                            game.isTie ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                          )}>
                             {game.isTie ? 'Final / Tie' : 'Final'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Home Team */}
                    <button 
                      onClick={() => !isSimulating && handlePick(game.id, home.id)}
                      className={cn(
                        "flex items-center gap-6 flex-1 p-4 rounded-2xl transition-all text-right justify-end",
                        game.winnerId === home.id ? "bg-cyan-500/5 ring-1 ring-cyan-500/20 shadow-sm" : "hover:bg-stone-50"
                      )}
                    >
                      {isCompleted && (
                        <span className={cn(
                          "text-4xl font-black tabular-nums tracking-tighter mr-auto italic",
                          game.winnerId === home.id ? "text-cyan-500" : "text-stone-300"
                        )}>
                          {game.homeScore}
                        </span>
                      )}
                      <div className="flex flex-col min-w-0 items-end">
                        <span className="text-[11px] font-black text-stone-300 uppercase tracking-widest leading-none mb-1.5">HOME</span>
                        <span 
                          className="text-2xl font-black text-stone-900 uppercase tracking-tighter italic leading-[0.9] whitespace-normal text-wrap-balance min-w-0"
                          title={home.name}
                        >
                          {home.name}
                        </span>
                        <span className="text-[11px] text-stone-400 font-bold tabular-nums mt-1.5">{teamRecords[home.id]}</span>
                      </div>
                      <div className="relative group/logo shrink-0">
                        <div 
                          className="w-36 h-36 rounded-[2rem] flex items-center justify-center border shadow-sm relative z-10 bg-white overflow-hidden"
                          style={{ borderColor: (home.primaryColor || "#000000") + '20' }}
                        >
                          <div className="relative w-[108px] h-[108px]">
                            <Image src={home.logoUrl || "/placeholder.png"} fill className="object-contain group-hover/logo:scale-110 transition-transform" alt={home.name} sizes="108px" />
                          </div>
                        </div>
                        <div className="absolute inset-0 blur-xl opacity-10 rounded-full" style={{ backgroundColor: home.primaryColor || "#000000" }} />
                      </div>
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
          {weekGames.length === 0 && !isSimulating && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center p-20 text-center bg-amber-50/30 border border-dashed border-amber-200 rounded-[3rem]"
            >
              <Wrench className="w-12 h-12 text-amber-300 mb-4" />
              <h3 className="text-xl font-black text-amber-900 uppercase italic tracking-tighter">Wait, everyone is on a bye?</h3>
              <p className="text-amber-700/60 max-w-sm mx-auto text-sm mt-2 mb-8">It looks like the league schedule for Week {currentWeek} is missing or empty. Let&apos;s fix that.</p>
              <Button 
                onClick={handleFixSchedule}
                className="h-14 px-10 rounded-2xl bg-amber-500 text-white font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-amber-500/20"
              >
                 Repair League Schedule
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bye Weeks Section */}
      {teamsOnBye.length > 0 && (
        <div className="pt-8 border-t border-stone-100">
          <div className="flex items-center gap-4 mb-8 px-4">
             <div className="h-px flex-1 bg-stone-100" />
             <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-stone-300 whitespace-nowrap">Bye Week Protocols</h4>
             <div className="h-px flex-1 bg-stone-100" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6">
              {teamsOnBye.map(team => (
                 <div key={team.id} className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-[1.5rem] bg-stone-50 border border-stone-100 flex items-center justify-center overflow-hidden grayscale opacity-40">
                      <div className="relative w-[60px] h-[60px]">
                        <Image src={team.logoUrl || "/placeholder.png"} fill alt={team.name} className="object-contain" sizes="60px" />
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-tighter w-full text-center italic" title={team.name}>{team.name}</span>
                  </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
