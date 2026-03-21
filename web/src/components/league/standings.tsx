"use client";

import React, { useMemo } from 'react';
import { Info, BarChart3 } from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { calculateStandings } from '@/lib/league/utils';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function Standings() {
  const { teams, games } = useLeague();
  const standings = useMemo(() => calculateStandings(teams, games), [teams, games]);

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="rounded-[2rem] border border-stone-100 shadow-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-stone-50/50 p-6">
          <div>
            <CardTitle className="text-xl font-black text-stone-900 uppercase tracking-widest leading-none mb-1">
              League Standings
            </CardTitle>
            <CardDescription className="text-stone-500 text-[10px] font-medium uppercase tracking-wider">
              Real-time performance metrics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-stone-400">
            <Info className="w-4 h-4" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Sorted by Win %</span>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-50 hover:bg-transparent">
                <TableHead className="w-16 px-6 text-[10px] font-black uppercase tracking-widest text-stone-400">Rank</TableHead>
                <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest text-stone-400">Team</TableHead>
                <TableHead className="text-center px-6 text-[10px] font-black uppercase tracking-widest text-stone-400">W-L-T</TableHead>
                <TableHead className="text-center px-6 text-[10px] font-black uppercase tracking-widest text-stone-400">Win %</TableHead>
                <TableHead className="text-center px-6 text-[10px] font-black uppercase tracking-widest text-stone-400">Streak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((s, idx) => {
                const team = teams.find(t => t.id === s.teamId)!;
                if (!team) return null;
                return (
                  <TableRow key={s.teamId} className="hover:bg-stone-50/50 transition-colors border-stone-50">
                    <TableCell className="px-6 py-4">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black",
                        idx === 0 ? "bg-yellow-100 text-yellow-700 shadow-sm border border-yellow-200" : 
                        idx === 1 ? "bg-stone-100 text-stone-600" :
                        idx === 2 ? "bg-orange-100 text-orange-700" : "text-stone-400"
                      )}>
                        {idx + 1}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 font-black">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-sm overflow-hidden"
                          style={{ backgroundColor: team.primaryColor, borderColor: team.secondaryColor }}
                        >
                          {team.logoUrl ? (
                            <img src={team.logoUrl} className="w-full h-full object-cover" />
                          ) : (
                            React.createElement(STUFFY_ICONS[team.icon as keyof typeof STUFFY_ICONS], { className: "w-5 h-5 text-white" })
                          )}
                        </div>
                        <span className="text-stone-900">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 text-center font-black text-stone-700">{s.wins}-{s.losses}-{s.ties}</TableCell>
                    <TableCell className="px-6 text-center font-mono text-stone-500 font-bold">{(s.winPercentage * 100).toFixed(1)}%</TableCell>
                    <TableCell className="px-6 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-sm",
                        s.streak.startsWith('W') ? "bg-emerald-100 text-emerald-700" : 
                        s.streak.startsWith('T') ? "bg-stone-100 text-stone-600" : "bg-rose-100 text-rose-700"
                      )}>
                        {s.streak}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
