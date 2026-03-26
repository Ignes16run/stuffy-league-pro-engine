"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Users, 
  Settings,
  FastForward
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_RENDER_MAP } from '@/lib/league/assetMap';
import { calculateStandings } from '@/lib/league/utils';
import { generateGameStorylines } from '@/lib/league/storylineEngine';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StuffyIcon } from '@/lib/league/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SeasonPredictor() {
  const { teams, games, simulateSeason, simulateGames, handlePick, isSimulating, numWeeks, setNumWeeks, history } = useLeague();
  const [activeWeek, setActiveWeek] = useState(1);

  const maxWeek = useMemo(() => Math.max(...games.map(g => g.week), 0), [games]);
  const weekGames = useMemo(() => games.filter(g => g.week === activeWeek), [games, activeWeek]);

  const allWeekGamesFinished = useMemo(() => weekGames.every(g => g.winnerId || g.isTie), [weekGames]);
  const allSeasonGamesFinished = useMemo(() => games.every(g => g.winnerId || g.isTie), [games]);

  const teamsOnBye = useMemo(() => {
    const teamsInGames = new Set(weekGames.flatMap(g => [g.homeTeamId, g.awayTeamId]));
    return teams.filter(t => !teamsInGames.has(t.id));
  }, [teams, weekGames]);

  // Live standings for our predictor view
  const currentStandings = useMemo(() => {
    return calculateStandings(teams, games);
  }, [teams, games]);

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
        <p className="text-stone-500 max-w-xs mx-auto">Head over to Team Setup to recruit your first stuffy competitors.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-stone-100">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" size="icon" className="h-10 w-10 rounded-xl"
            onClick={() => setActiveWeek(w => Math.max(1, w - 1))}
            disabled={activeWeek === 1 || isSimulating}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center min-w-[100px]">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-0.5">Week</p>
            <h2 className="text-2xl font-black text-stone-900 leading-none">{activeWeek}</h2>
          </div>
          <Button 
            variant="outline" size="icon" className="h-10 w-10 rounded-xl"
            onClick={() => setActiveWeek(w => Math.min(maxWeek, w + 1))}
            disabled={activeWeek === maxWeek || isSimulating}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger render={
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" disabled={isSimulating}>
                <Settings className="w-5 h-5 text-stone-400" />
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-8">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-stone-900">League Settings</DialogTitle>
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

          <div className="flex items-center gap-2 bg-stone-100/30 p-1 rounded-xl border border-stone-100/50">
            <Button
              onClick={() => simulateGames(activeWeek)}
              disabled={isSimulating || allWeekGamesFinished}
              className="h-10 px-4 rounded-lg font-black uppercase tracking-widest text-[9px] bg-stone-900 text-white shadow-lg shadow-black/10 hover:bg-black transition-all"
            >
              <Play className="w-3 h-3 mr-2" />
              Sim Week {activeWeek}
            </Button>

            <Button
              onClick={simulateSeason}
              disabled={isSimulating || allSeasonGamesFinished}
              variant="outline"
              className="h-10 px-4 rounded-lg font-black uppercase tracking-widest text-[9px] border-stone-200 text-stone-600 hover:bg-stone-50 transition-all"
            >
              <FastForward className="w-3 h-3 mr-2 text-emerald-500" />
              Sim Season
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {weekGames.map(game => {
            const home = teams.find(t => t.id === game.homeTeamId);
            const away = teams.find(t => t.id === game.awayTeamId);
            
            if (!home || !away) return null;
            
            const homeStanding = currentStandings.findIndex(s => s.teamId === home.id) + 1;
            const awayStanding = currentStandings.findIndex(s => s.teamId === away.id) + 1;
            
            const homeRender = STUFFY_RENDER_MAP[home.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
            const awayRender = STUFFY_RENDER_MAP[away.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;

            const storylines = generateGameStorylines(game, teams, currentStandings, history);

            return (
              <motion.div 
                layout
                key={game.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-3 shadow-sm border border-stone-100 flex flex-col gap-3 relative overflow-hidden transition-all hover:shadow-md hover:border-stone-200"
              >
                {/* Storyline Badges */}
                {storylines.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-1">
                    {storylines.map((s, i) => (
                      <span 
                        key={`${game.id}-${i}`}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2",
                          s.color
                        )}
                      >
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        {s.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <button 
                    onClick={() => handlePick(game.id, away.id)}
                    className={cn(
                      "flex-1 flex items-center justify-between gap-3 p-3 rounded-xl transition-all border-2",
                      game.winnerId === away.id ? "border-emerald-500 bg-emerald-50/20 shadow-inner" : "border-transparent bg-stone-50/40 hover:bg-stone-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-stone-100 shadow-md relative overflow-hidden bg-white shrink-0"
                        style={{ borderColor: !away.logoUrl ? away.primaryColor : 'white' }}
                      >
                        {away.logoUrl ? (
                          <div className="relative w-full h-full">
                            <Image src={away.logoUrl} fill className="object-cover scale-105" alt={away.id} sizes="112px" />
                          </div>
                        ) : (
                          <div className="relative w-[130%] h-[130%] translate-y-3">
                             <Image src={awayRender} fill className="object-contain drop-shadow-2xl" alt={away.name} sizes="144px" />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1.5 font-sans">Away</p>
                        <span className="font-black text-stone-900 text-lg leading-none block uppercase tracking-tighter italic">
                          {awayStanding <= 8 && <span className="text-stone-300 mr-1.5 not-italic text-[12px]">#{awayStanding}</span>}
                          {away.name}
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="text-[10px] text-stone-400 font-bold tabular-nums uppercase tracking-wider">{teamRecords[away.id]}</span>
                           <div className="w-1 h-1 bg-stone-200 rounded-full" />
                           <span className="text-[10px] text-stone-300 font-bold uppercase tracking-wider">Seed {awayStanding}</span>
                        </div>
                      </div>
                    </div>
                    {game.awayScore !== undefined && (
                      <span className="text-3xl font-black text-stone-900 tabular-nums italic">{game.awayScore}</span>
                    )}
                  </button>

                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => !isSimulating && handlePick(game.id, 'tie')}
                      className={cn(
                        "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ring-offset-2 active:ring-2 active:ring-emerald-500",
                        game.isTie ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30" : "bg-stone-100/50 text-stone-400 border-stone-200 hover:bg-stone-100 hover:text-stone-600"
                      )}
                    >
                      Tie
                    </button>
                    <div className="text-[10px] font-black text-stone-300 italic tracking-widest">VS</div>
                  </div>

                  <button 
                    onClick={() => handlePick(game.id, home.id)}
                    className={cn(
                      "flex-1 flex items-center justify-between gap-3 p-3 rounded-xl transition-all border-2",
                      game.winnerId === home.id ? "border-emerald-500 bg-emerald-50/20 shadow-inner" : "border-transparent bg-stone-50/40 hover:bg-stone-50"
                    )}
                  >
                    {game.homeScore !== undefined && (
                      <span className="text-5xl font-black text-stone-900 tabular-nums italic tracking-tighter">{game.homeScore}</span>
                    )}
                    <div className="flex items-center gap-4 text-right ml-auto">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-stone-200 uppercase tracking-widest mb-1 font-sans">Home</p>
                        <span className="font-black text-stone-900 text-xl leading-none block text-right uppercase tracking-tighter italic">
                          {homeStanding <= 8 && <span className="text-stone-300 mr-1.5 not-italic text-[12px]">#{homeStanding}</span>}
                          {home.name}
                        </span>
                        <div className="flex items-center justify-end gap-2 mt-1.5">
                           <span className="text-[10px] text-stone-300 font-bold uppercase tracking-wider">Seed {homeStanding}</span>
                           <div className="w-1 h-1 bg-stone-200 rounded-full" />
                           <span className="text-[10px] text-stone-400 font-bold tabular-nums uppercase tracking-widest">{teamRecords[home.id]}</span>
                        </div>
                      </div>
                      <div 
                        className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-stone-100 shadow-md relative overflow-hidden bg-white shrink-0"
                        style={{ borderColor: !home.logoUrl ? home.primaryColor : 'white' }}
                      >
                        {home.logoUrl ? (
                          <div className="relative w-full h-full">
                            <Image src={home.logoUrl} fill className="object-cover scale-105" alt={home.id} sizes="112px" />
                          </div>
                        ) : (
                          <div className="relative w-[130%] h-[130%] translate-y-3">
                             <Image src={homeRender} fill className="object-contain drop-shadow-2xl" alt={home.name} sizes="144px" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {teamsOnBye.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
            <div className="flex items-center gap-4 mb-6 px-4">
               <div className="h-px flex-1 bg-stone-100" />
               <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-300 whitespace-nowrap">Bye Weeks</h4>
               <div className="h-px flex-1 bg-stone-100" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {teamsOnBye.map(team => {
                  const renderUrl = STUFFY_RENDER_MAP[team.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
                  return (
                     <div key={team.id} className="bg-white rounded-xl p-2 border border-stone-100 flex items-center gap-3 group hover:shadow-lg transition-all duration-500">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-stone-100 shadow-md relative overflow-hidden group-hover:scale-110 transition-transform bg-white shrink-0" style={{ borderColor: team.logoUrl ? 'white' : team.primaryColor }}>
                          {team.logoUrl ? (
                            <div className="relative w-full h-full">
                              <Image src={team.logoUrl} fill className="object-cover scale-105" alt={team.id} sizes="80px" />
                            </div>
                         ) : (
                           <div className="relative w-[130%] h-[130%] translate-y-2">
                              <Image src={renderUrl} fill className="object-contain drop-shadow-md" alt={team.name} sizes="104px" />
                           </div>
                         )}
                       </div>
                      <div className="min-w-0">
                         <span className="font-black text-stone-900 text-xs leading-tight block truncate uppercase tracking-tighter italic">{team.name}</span>
                         <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest mt-0.5">Resting</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
