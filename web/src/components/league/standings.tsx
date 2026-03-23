// Last Updated: 2026-03-23T03:26:00-04:00

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Info } from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_RENDER_MAP } from '@/lib/league/assetMap';
import { calculateGroupedStandings } from '@/lib/league/structureEngine';
import { cn } from '@/lib/utils';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StuffyIcon } from '@/lib/league/types';

export default function Standings() {
  const { teams, games } = useLeague();
  const groupedStandings = useMemo(() => calculateGroupedStandings(teams, games), [teams, games]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/40 backdrop-blur-3xl rounded-4xl border border-stone-100 shadow-2xl shadow-stone-200/20 overflow-hidden relative group transition-all duration-700">
        <CardHeader className="flex flex-row items-center justify-between bg-stone-50/50 p-6 border-b border-stone-100">
          <div>
            <CardTitle className="text-xl font-black text-stone-900 uppercase tracking-widest leading-none mb-1">
              League Standings
            </CardTitle>
            <CardDescription className="text-stone-500 text-[10px] font-medium uppercase tracking-wider">
              Real-time performance metrics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-stone-400">
            <span className="text-[9px] font-bold uppercase tracking-widest bg-stone-100 px-2 py-1 rounded-md">Sorted by Win %</span>
            <Info className="w-4 h-4" />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="space-y-8 p-6">
            {Object.entries(groupedStandings).map(([confName, divisions]) => (
              <div key={confName} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-black text-stone-900 tracking-tighter uppercase">{confName}</h3>
                  <div className="h-1 flex-1 bg-stone-100 rounded-full" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {Object.entries(divisions).map(([divName, divTeams]) => (
                    <div key={divName} className="bg-stone-50/30 rounded-3xl border border-stone-100/50 p-4">
                      <h4 className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {divName}
                      </h4>
                      
                      <div className="space-y-2">
                        {divTeams.map((s, idx) => {
                          const team = teams.find(t => t.id === s.teamId);
                          if (!team) return null;
                          const renderUrl = STUFFY_RENDER_MAP[team.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
                          
                          return (
                            <div 
                              key={s.teamId}
                              className="bg-white rounded-2xl p-4 flex items-center justify-between border border-stone-100 shadow-sm shadow-stone-200/50 group hover:border-emerald-200 transition-all active:scale-[0.99]"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-8 text-[11px] font-black text-stone-300">#{idx + 1}</div>
                                <div 
                                  className="w-10 h-10 rounded-xl flex items-center justify-center border-2 border-white shadow-lg relative overflow-hidden group-hover:scale-110 transition-transform duration-500"
                                  style={{ backgroundColor: team.primaryColor }}
                                >
                                  {team.logoUrl ? (
                                    <Image src={team.logoUrl} fill className="object-cover" alt={team.name} />
                                  ) : (
                                    <div className="relative w-[130%] h-[130%] translate-y-2">
                                       <Image src={renderUrl} fill className="object-contain drop-shadow-lg" alt={team.name} />
                                    </div>
                                  )}
                                </div>
                                <span className="font-black text-stone-900 text-sm tracking-tight">{team.name}</span>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-[10px] font-black text-stone-900">{s.wins}-{s.losses}-{s.ties}</div>
                                  <div className="text-[8px] font-bold text-stone-400">{(s.winPct * 100).toFixed(0)}%</div>
                                </div>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                                  s.streak.startsWith('W') ? "bg-emerald-500/10 text-emerald-600" : 
                                  s.streak.startsWith('T') ? "bg-stone-200 text-stone-600" : "bg-rose-500/10 text-rose-600"
                                )}>
                                  {s.streak}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </div>
  );
}
