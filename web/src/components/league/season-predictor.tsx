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
  Settings 
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
  const { teams, games, simulateSeason, handlePick, isSimulating, numWeeks, setNumWeeks, history } = useLeague();
  const [activeWeek, setActiveWeek] = useState(1);

  const maxWeek = useMemo(() => Math.max(...games.map(g => g.week), 0), [games]);
  const weekGames = useMemo(() => games.filter(g => g.week === activeWeek), [games, activeWeek]);

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
      <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-stone-200">
        <Users className="w-16 h-16 text-stone-200 mx-auto mb-6" />
        <h3 className="text-2xl font-black text-stone-800 mb-2">The League is Empty</h3>
        <p className="text-stone-500 max-w-xs mx-auto">Head over to Team Setup to recruit your first stuffy competitors.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[2rem] shadow-lg shadow-stone-200/40 border border-stone-100">
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

          <Button
            onClick={simulateSeason}
            disabled={isSimulating || games.every(g => g.winnerId || g.isTie)}
            className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-stone-900 text-white"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin mr-2" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-2" />
                Simulate Season
              </>
            )}
          </Button>
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-stone-200/40 border border-stone-100 flex flex-col gap-5 relative overflow-hidden group"
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
                      "flex-1 flex items-center justify-between gap-5 p-5 rounded-[2rem] transition-all border-2 group/btn",
                      game.winnerId === away.id ? "border-emerald-500 bg-emerald-50/50" : "border-transparent bg-stone-50/50 hover:bg-stone-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-black/10 border-2 border-white relative overflow-hidden group-hover/btn:scale-110 transition-transform duration-500"
                        style={{ backgroundColor: away.primaryColor }}
                      >
                        {away.logoUrl ? (
                          <Image src={away.logoUrl} fill className="object-cover" alt={away.name} />
                        ) : (
                          <div className="relative w-[130%] h-[130%] translate-y-2">
                             <Image src={awayRender} fill className="object-contain drop-shadow-lg" alt={away.name} />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mb-1">Away</p>
                        <span className="font-black text-stone-900 text-sm leading-tight block uppercase tracking-tighter">
                          {awayStanding <= 8 && <span className="text-stone-300 mr-2 font-bold text-[10px]">#{awayStanding}</span>}
                          {away.name}
                        </span>
                        <span className="text-[10px] text-stone-400 font-bold tabular-nums">{teamRecords[away.id]}</span>
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
                      "flex-1 flex items-center justify-between gap-5 p-5 rounded-[2rem] transition-all border-2 group/btn",
                      game.winnerId === home.id ? "border-emerald-500 bg-emerald-50/50" : "border-transparent bg-stone-50/50 hover:bg-stone-50"
                    )}
                  >
                    {game.homeScore !== undefined && (
                      <span className="text-3xl font-black text-stone-900 tabular-nums italic">{game.homeScore}</span>
                    )}
                    <div className="flex items-center gap-4 text-right">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mb-1">Home</p>
                        <span className="font-black text-stone-900 text-sm leading-tight block text-right uppercase tracking-tighter">
                          {homeStanding <= 8 && <span className="text-stone-300 mr-2 font-bold text-[10px]">#{homeStanding}</span>}
                          {home.name}
                        </span>
                        <span className="text-[10px] text-stone-400 font-bold tabular-nums">{teamRecords[home.id]}</span>
                      </div>
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-black/10 border-2 border-white relative overflow-hidden group-hover/btn:scale-110 transition-transform duration-500"
                        style={{ backgroundColor: home.primaryColor }}
                      >
                        {home.logoUrl ? (
                          <Image src={home.logoUrl} fill className="object-cover" alt={home.name} />
                        ) : (
                          <div className="relative w-[130%] h-[130%] translate-y-2">
                             <Image src={homeRender} fill className="object-contain drop-shadow-lg" alt={home.name} />
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
                   <div key={team.id} className="bg-white/50 backdrop-blur-sm rounded-[1.5rem] p-4 border border-stone-100 flex items-center gap-4 group hover:bg-white hover:shadow-xl transition-all duration-500">
                     <div className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-white shadow-lg relative overflow-hidden group-hover:scale-110 transition-transform" style={{ backgroundColor: team.primaryColor }}>
                        <div className="relative w-[130%] h-[130%] translate-y-2">
                           <Image src={renderUrl} fill className="object-contain drop-shadow-md" alt={team.name} />
                        </div>
                     </div>
                     <div className="min-w-0">
                        <span className="font-black text-stone-900 text-xs leading-tight block truncate uppercase tracking-tighter">{team.name}</span>
                        <p className="text-[8px] font-black text-stone-300 uppercase tracking-widest mt-0.5">Resting</p>
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
