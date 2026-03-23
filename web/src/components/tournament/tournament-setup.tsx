"use client";
import React, { useState } from 'react';
import { 
  Trophy, Users, LayoutGrid, AlertCircle, ShieldCheck, Shuffle
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { useTournament } from '@/context/tournament-context';
import { Button } from '@/components/ui/button';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { cn } from '@/lib/utils';

export default function TournamentSetup() {
  const { teams: leagueTeams } = useLeague();
  const { initTournament } = useTournament();
  
  const [bracketSize, setBracketSize] = useState(32);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [useSeeding, setUseSeeding] = useState(true);

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
    let teams = selectedTeamIds.map(id => leagueTeams.find(t => t.id === id)!);
    
    if (useSeeding) {
       // Sort by rating for seeded advancement
       teams = teams.sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
    } else {
       // Shuffle
       teams = teams.sort(() => Math.random() - 0.5);
    }
    
    initTournament(teams, bracketSize, useSeeding);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500 shadow-2xl shadow-amber-500/30">
          <Trophy className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-5xl font-black text-stone-900 uppercase tracking-tight">Tournament Setup</h1>
        <p className="text-stone-400 font-bold uppercase tracking-[0.4em] text-[10px]">4 Regions • Final Four • National Championship</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1: Config */}
        <div className="bg-stone-50 rounded-[2.5rem] p-8 border border-stone-200/50 space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
                <LayoutGrid className="w-5 h-5 text-amber-500" />
                1. Structure
              </h3>
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest pl-8">Size & Seeding</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[16, 32].map(size => (
                <button
                  key={size}
                  onClick={() => {
                    setBracketSize(size);
                    setSelectedTeamIds([]);
                  }}
                  className={cn(
                    "p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1 group",
                    bracketSize === size 
                      ? "bg-stone-900 border-stone-900 text-white shadow-xl" 
                      : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
                  )}
                >
                   <span className="text-2xl font-black">{size}</span>
                   <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Teams</span>
                </button>
              ))}
            </div>

            <div className="p-1 bg-stone-100 rounded-2xi flex gap-1">
               <button 
                onClick={() => setUseSeeding(true)}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                  useSeeding ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
                )}
               >
                 <ShieldCheck className="w-4 h-4" /> Seeded
               </button>
               <button 
                onClick={() => setUseSeeding(false)}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                  !useSeeding ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
                )}
               >
                 <Shuffle className="w-4 h-4" /> Random
               </button>
            </div>
          </div>
        </div>

        {/* Step 2: Teams */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-stone-100 shadow-2xl shadow-stone-200/20 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
                <Users className="w-5 h-5 text-amber-500" />
                2. Select Roster
              </h3>
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest pl-8">
                {selectedTeamIds.length} of {bracketSize} slots filled
              </p>
            </div>

            <Button 
              variant="outline" 
              onClick={handleAutoFill}
              className="rounded-xl border-stone-100 text-[10px] font-black uppercase tracking-widest px-6 h-12"
            >
              Fill with Best Teams
            </Button>
          </div>

          {leagueTeams.length === 0 ? (
             <div className="p-12 text-center bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
                <AlertCircle className="w-10 h-10 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Initialize teams in League mode first.</p>
             </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
              {leagueTeams.map(team => {
                const isSelected = selectedTeamIds.includes(team.id);
                const TeamIcon = STUFFY_ICONS[team.icon as keyof typeof STUFFY_ICONS] || STUFFY_ICONS.TeddyBear;
                
                return (
                  <button
                    key={team.id}
                    onClick={() => handleToggleTeam(team.id)}
                    className={cn(
                      "p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3",
                      isSelected 
                        ? "bg-white border-stone-900 shadow-lg scale-[1.03]" 
                        : "bg-white border-stone-100 hover:border-stone-200"
                    )}
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm"
                      style={{ 
                        backgroundColor: team.primaryColor, 
                        borderColor: team.secondaryColor,
                      }}
                    >
                      <TeamIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-tight text-center truncate w-full",
                      isSelected ? "text-stone-900" : "text-stone-400"
                    )}>
                      {team.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-6 border-t border-stone-100">
             <Button 
               disabled={!isValid}
               onClick={handleStart}
               className={cn(
                 "w-full h-16 rounded-3xl text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all",
                 isValid ? "bg-amber-500 shadow-xl shadow-amber-500/30 hover:bg-amber-600" : "bg-stone-50 text-stone-300"
               )}
             >
               {isValid ? "Create Bracket" : `Select ${bracketSize - selectedTeamIds.length} more`}
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
