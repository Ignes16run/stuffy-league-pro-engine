"use client";
// Last Updated: 2026-03-23T10:00:00-04:00

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, Settings2, Users, CheckCircle2, Play, LayoutGrid, AlertCircle
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { useTournament } from '@/context/tournament-context';
import { Button } from '@/components/ui/button';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { cn } from '@/lib/utils';

export default function TournamentSetup() {
  const { teams: leagueTeams } = useLeague();
  const { initTournament } = useTournament();
  
  const [bracketSize, setBracketSize] = useState(8);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const handleToggleTeam = (id: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(id) 
        ? prev.filter(tid => tid !== id) 
        : (prev.length < bracketSize ? [...prev, id] : prev)
    );
  };

  const handleAutoFill = () => {
    const sorted = [...leagueTeams].sort((a, b) => ((b.overallRating || 0) - (a.overallRating || 0)));
    setSelectedTeamIds(sorted.slice(0, bracketSize).map(t => t.id));
  };

  const isValid = selectedTeamIds.length === bracketSize;

  const handleStart = () => {
    if (!isValid) return;
    const teams = selectedTeamIds.map(id => leagueTeams.find(t => t.id === id)!);
    initTournament(teams, bracketSize);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500 shadow-2xl shadow-amber-500/30">
          <Trophy className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-5xl font-black text-stone-900 uppercase tracking-tight">Tournament Setup</h1>
        <p className="text-stone-400 font-bold uppercase tracking-[0.4em] text-[10px]">Create your championship bracket</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1: Size */}
        <div className="bg-stone-50 rounded-[2.5rem] p-10 border border-stone-200/50 space-y-8">
          <div className="space-y-2">
            <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
              <LayoutGrid className="w-5 h-5 text-amber-500" />
              1. Bracket Size
            </h3>
            <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest pl-8">Select number of teams</p>
          </div>

          <div className="space-y-4">
            {[8, 16, 32].map(size => (
              <button
                key={size}
                onClick={() => {
                  setBracketSize(size);
                  setSelectedTeamIds([]);
                }}
                className={cn(
                  "w-full p-6 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group",
                  bracketSize === size 
                    ? "bg-stone-900 border-stone-900 text-white shadow-xl scale-[1.02]" 
                    : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
                )}
              >
                <div className="flex flex-col items-start">
                   <span className="text-3xl font-black">{size}</span>
                   <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Teams</span>
                </div>
                {bracketSize === size && <CheckCircle2 className="w-6 h-6 text-amber-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Teams */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-stone-100 shadow-2xl shadow-stone-200/20 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
                <Users className="w-5 h-5 text-amber-500" />
                2. Select Teams
              </h3>
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest pl-8">
                {selectedTeamIds.length} of {bracketSize} selected
              </p>
            </div>

            <Button 
              variant="outline" 
              onClick={handleAutoFill}
              className="rounded-xl border-stone-100 text-[10px] font-black uppercase tracking-widest px-6 h-12"
            >
              Auto-Fill Top Rated
            </Button>
          </div>

          {leagueTeams.length === 0 ? (
             <div className="p-12 text-center bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200 space-y-4">
                <AlertCircle className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">No league teams found. Initialize some teams first.</p>
             </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {leagueTeams.map(team => {
                const isSelected = selectedTeamIds.includes(team.id);
                const TeamIcon = STUFFY_ICONS[team.icon as keyof typeof STUFFY_ICONS] || STUFFY_ICONS.TeddyBear;
                
                return (
                  <button
                    key={team.id}
                    onClick={() => handleToggleTeam(team.id)}
                    className={cn(
                      "p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3 group ",
                      isSelected 
                        ? "bg-white border-stone-900 shadow-lg scale-[1.05]" 
                        : "bg-white border-stone-100 hover:border-stone-200"
                    )}
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-all duration-500 group-hover:rotate-6"
                      style={{ 
                        backgroundColor: team.primaryColor, 
                        borderColor: team.secondaryColor,
                      }}
                    >
                      {team.logoUrl ? (
                        <img src={team.logoUrl} className="w-full h-full object-cover rounded-lg" alt={team.name} />
                      ) : (
                        <TeamIcon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tight text-center leading-tight",
                      isSelected ? "text-stone-900" : "text-stone-400"
                    )}>
                      {team.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-8 border-t border-stone-100">
             <Button 
               disabled={!isValid}
               onClick={handleStart}
               className={cn(
                 "w-full h-20 rounded-3xl text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all duration-500",
                 isValid ? "bg-amber-500 shadow-2xl shadow-amber-500/40 hover:bg-amber-600 active:scale-95" : "bg-stone-100 text-stone-300 cursor-not-allowed"
               )}
             >
               {isValid ? (
                  <span className="flex items-center gap-3">
                    Start Tournament <Play className="w-4 h-4 fill-current" />
                  </span>
               ) : (
                 `Select ${bracketSize - selectedTeamIds.length} more teams`
               )}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
