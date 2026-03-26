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
    <div className="max-w-6xl mx-auto">
      <div className="bg-white/60 backdrop-blur-2xl rounded-3xl border border-stone-100 shadow-sm overflow-hidden relative group transition-all duration-700">
        <CardHeader className="flex flex-row items-center justify-between bg-stone-50/50 p-5 border-b border-stone-100">
          <div>
            <CardTitle className="text-xl font-black text-stone-900 uppercase tracking-tighter leading-none mb-1 italic">
              League Standings
            </CardTitle>
            <CardDescription className="text-stone-400 text-[10px] font-black uppercase tracking-widest mt-2">
              Championship Pursuit Node
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-stone-300">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white border border-stone-100 px-3 py-1 rounded-lg shadow-sm">Sorted by Win %</span>
            <Info className="w-5 h-5" />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="space-y-8 p-6">
            {Object.entries(groupedStandings).map(([confName, divisions]) => (
              <div key={confName} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-black text-stone-900 tracking-tighter uppercase italic">{confName}</h3>
                  <div className="h-0.5 flex-1 bg-stone-100 rounded-full" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(divisions).map(([divName, divTeams]) => (
                    <div key={divName} className="bg-stone-50/10 rounded-2xl border border-stone-100 p-2">
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
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
                              className="bg-white rounded-xl p-3 flex items-center justify-between border border-stone-50 shadow-sm transition-all hover:border-emerald-500/30 hover:shadow-md active:scale-[0.995]"
                            >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 text-[10px] font-black text-stone-300">#{idx + 1}</div>
                                  <div 
                                    className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-stone-100 shadow-md relative overflow-hidden bg-white shrink-0"
                                    style={{ borderColor: !team.logoUrl ? team.primaryColor : 'white' }}
                                  >
                                    {team.logoUrl ? (
                                      <div className="relative w-full h-full">
                                        <Image src={team.logoUrl} fill className="object-cover scale-105" alt={team.id} sizes="80px" />
                                      </div>
                                    ) : (
                                      <div className="relative w-[110%] h-[110%] translate-y-1">
                                          <Image src={renderUrl} fill className="object-contain drop-shadow-2xl scale-110" alt={team.name} sizes="88px" />
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-black text-stone-900 text-xs uppercase tracking-tighter italic">{team.name}</span>
                                </div>
                              
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <div className="text-xs font-black text-stone-900 tabular-nums">{s.wins}-{s.losses}-{s.ties}</div>
                                    <div className="text-[10px] font-black text-stone-400 tabular-nums">{(s.winPct * 100).toFixed(0)}% PCT</div>
                                  </div>
                                  <span className={cn(
                                    "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest min-w-[32px] text-center",
                                    s.streak.startsWith('W') ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : 
                                    s.streak.startsWith('T') ? "bg-stone-200 text-stone-600" : "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
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
