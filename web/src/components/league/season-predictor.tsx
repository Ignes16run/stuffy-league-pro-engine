"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  PlayCircle,
  Settings,
  FastForward,
  Monitor,
  Users
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

// Last Updated: 2026-03-26T15:32:10-04:00

export default function SeasonPredictor() {
  const {
    teams, games, simulateSeason, simulateGames, handlePick,
    isSimulating, numWeeks, setNumWeeks, history,
    setActiveBroadcastGameId
  } = useLeague();
  const [activeWeek, setActiveWeek] = useState(1);

  const maxWeek = useMemo(() => Math.max(1, ...games.map(g => g.week)), [games]);
  const weekGames = useMemo(() => games.filter(g => g.week === activeWeek), [games, activeWeek]);

  const allWeekGamesFinished = useMemo(() => weekGames.every(g => g.winnerId || g.isTie), [weekGames]);
  const allSeasonGamesFinished = useMemo(() => games.every(g => g.winnerId || g.isTie), [games]);

  const currentStandings = useMemo(() => calculateStandings(teams, games), [teams, games]);
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
            variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-stone-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all font-black"
            onClick={() => setActiveWeek(w => Math.max(1, w - 1))}
            disabled={activeWeek === 1 || isSimulating}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="text-center min-w-[120px]">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em] mb-1">Week</p>
            <h2 className="text-3xl font-black text-stone-900 leading-none italic tracking-tighter">{activeWeek}</h2>
          </div>
          <Button
            variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-stone-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all font-black"
            onClick={() => setActiveWeek(w => Math.min(maxWeek, w + 1))}
            disabled={activeWeek === maxWeek || isSimulating}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger render={
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-stone-200 hover:border-stone-400 transition-all font-black" disabled={isSimulating}>
                <Settings className="w-5 h-5 text-stone-400" />
              </Button>
            } />
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
              </div>
            </DialogContent>
          </Dialog>

          <div className="h-10 w-px bg-stone-100 mx-2 hidden md:block" />
          <Button
            onClick={() => simulateGames(activeWeek)}
            disabled={isSimulating || allWeekGamesFinished}
            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-stone-900 text-white shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:scale-105 transition-all"
          >
            <PlayCircle className="w-4 h-4 mr-2.5 text-emerald-400" />
            Simulate Week
          </Button>

          <Button
            onClick={simulateSeason}
            disabled={isSimulating || allSeasonGamesFinished}
            variant="outline"
            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-stone-200 text-stone-600 hover:bg-stone-50 transition-all"
          >
            <FastForward className="w-4 h-4 mr-2.5 text-amber-500" />
            Finish Season
          </Button>
        </div>
      </div>

      {/* Matchups Grid */}
      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {weekGames.map((game) => {
            const home = teams.find(t => t.id === game.homeTeamId);
            const away = teams.find(t => t.id === game.awayTeamId);
            const isCompleted = !!(game.winnerId || game.isTie);
            const storylines = generateGameStorylines(game, teams, currentStandings, history);

            if (!home || !away) return null;

            return (
              <motion.div
                layout
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-4xl mx-auto w-full group"
              >
                <Card className={cn(
                  "border border-stone-100 bg-white/80 backdrop-blur-md overflow-hidden transition-all hover:shadow-xl hover:border-emerald-500/20 rounded-4xl p-6 pr-8",
                   isCompleted && "bg-stone-50/40"
                )}>
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Away Team */}
                    <button 
                      onClick={() => !isSimulating && handlePick(game.id, away.id)}
                      className={cn(
                        "flex items-center gap-5 flex-1 p-3 rounded-2xl transition-all text-left",
                        game.winnerId === away.id ? "bg-rose-500/5 ring-1 ring-rose-500/20 shadow-sm" : "hover:bg-stone-50"
                      )}
                    >
                      <div className="relative group/logo shrink-0">
                        <div 
                          className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-sm relative z-10 bg-white overflow-hidden"
                          style={{ borderColor: (away.primaryColor || "#000000") + '20' }}
                        >
                          <div className="relative w-12 h-12">
                            <Image src={away.logoUrl || "/placeholder.png"} fill className="object-contain group-hover/logo:scale-110 transition-transform" alt={away.name} sizes="48px" />
                          </div>
                        </div>
                        <div className="absolute inset-0 blur-xl opacity-10 rounded-full" style={{ backgroundColor: away.primaryColor || "#000000" }} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest leading-none mb-1.5">VISITOR</span>
                        <span 
                          className="text-lg font-black text-stone-900 uppercase tracking-tighter italic leading-[0.9] whitespace-normal text-wrap-balance min-w-0"
                          title={away.name}
                        >
                          {away.name}
                        </span>
                        <span className="text-[10px] text-stone-400 font-bold tabular-nums mt-1">{teamRecords[away.id]}</span>
                      </div>
                      {isCompleted && (
                        <span className={cn(
                          "text-3xl font-black tabular-nums tracking-tighter ml-auto italic",
                          game.winnerId === away.id ? "text-rose-500" : "text-stone-300"
                        )}>
                          {game.awayScore}
                        </span>
                      )}
                    </button>

                    {/* Minimal Center Component */}
                    <div className="flex flex-col items-center justify-center min-w-[110px] relative">
                      <div className="absolute inset-x-0 top-1/2 h-px bg-stone-100 -z-10 w-32 -mx-10" />
                      <div className="flex flex-col items-center gap-3 bg-white px-5 py-2.5 rounded-3xl border border-stone-100 shadow-sm relative z-10">
                        {!isCompleted ? (
                          <>
                            <span className="text-[9px] font-black text-stone-500 uppercase tracking-[0.4em]">VS</span>
                            <div className="flex gap-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setActiveBroadcastGameId(game.id); }}
                                  className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-100 shadow-sm"
                                  title="Broadcast Mode"
                                >
                                  <Monitor className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handlePick(game.id, 'tie'); }}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
                                    game.isTie ? "bg-amber-500 border-amber-500 text-white" : "bg-stone-50 border-stone-100 text-stone-400 hover:text-stone-900 font-bold"
                                  )}
                                >
                                  TIE
                                </button>
                            </div>
                          </>
                        ) : (
                          <div className={cn(
                            "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em]",
                            game.isTie ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                          )}>
                            {game.isTie ? 'Final / Tie' : 'Final'}
                          </div>
                        )}
                      </div>
                      
                      {storylines.length > 0 && (
                          <div className="absolute -bottom-10 flex items-center gap-1.5 whitespace-nowrap bg-amber-500/5 border border-amber-500/10 px-3 py-1 rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">{storylines[0].label}</span>
                          </div>
                      )}
                    </div>

                    {/* Home Team */}
                    <button 
                      onClick={() => !isSimulating && handlePick(game.id, home.id)}
                      className={cn(
                        "flex items-center gap-5 flex-1 p-3 rounded-2xl transition-all text-right justify-end",
                        game.winnerId === home.id ? "bg-cyan-500/5 ring-1 ring-cyan-500/20 shadow-sm" : "hover:bg-stone-50"
                      )}
                    >
                      {isCompleted && (
                        <span className={cn(
                          "text-3xl font-black tabular-nums tracking-tighter mr-auto italic",
                          game.winnerId === home.id ? "text-cyan-500" : "text-stone-300"
                        )}>
                          {game.homeScore}
                        </span>
                      )}
                      <div className="flex flex-col min-w-0 items-end">
                        <span className="text-[9px] font-black text-stone-300 uppercase tracking-widest leading-none mb-1.5">HOME</span>
                        <span 
                          className="text-lg font-black text-stone-900 uppercase tracking-tighter italic leading-[0.9] whitespace-normal text-wrap-balance min-w-0"
                          title={home.name}
                        >
                          {home.name}
                        </span>
                        <span className="text-[10px] text-stone-400 font-bold tabular-nums mt-1">{teamRecords[home.id]}</span>
                      </div>
                      <div className="relative group/logo shrink-0">
                        <div 
                          className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-sm relative z-10 bg-white overflow-hidden"
                          style={{ borderColor: (home.primaryColor || "#000000") + '20' }}
                        >
                          <div className="relative w-12 h-12">
                            <Image src={home.logoUrl || "/placeholder.png"} fill className="object-contain group-hover/logo:scale-110 transition-transform" alt={home.name} sizes="48px" />
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
                    <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center overflow-hidden grayscale opacity-40">
                      <div className="relative w-10 h-10">
                        <Image src={team.logoUrl || "/placeholder.png"} fill alt={team.name} className="object-contain" sizes="40px" />
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
