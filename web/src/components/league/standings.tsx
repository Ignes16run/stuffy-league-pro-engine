// Last Updated: 2026-03-23T03:26:00-04:00

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { calculateStandings } from '@/lib/league/utils';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function Standings() {
  const { teams, games } = useLeague();
  const standings = useMemo(() => calculateStandings(teams, games), [teams, games]);

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
                const team = teams.find(t => t.id === s.teamId);
                if (!team) return null;
                const TeamIcon = STUFFY_ICONS[team.icon as keyof typeof STUFFY_ICONS] || STUFFY_ICONS.TeddyBear;
                return (
                  <motion.tr
                    key={s.teamId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-stone-50/50 transition-colors border-b border-stone-50 group cursor-default"
                  >
                    <TableCell className="px-6 py-4">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-transform group-hover:scale-110",
                        idx === 0 ? "bg-yellow-400 text-white shadow-lg shadow-yellow-400/20" : 
                        idx === 1 ? "bg-stone-200 text-stone-600 shadow-md shadow-stone-200/20" :
                        idx === 2 ? "bg-orange-300 text-white shadow-md shadow-orange-300/20" : "text-stone-400 bg-stone-50"
                      )}>
                        {idx + 1}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 font-black">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-sm overflow-hidden transition-transform group-hover:scale-105"
                          style={{ backgroundColor: team.primaryColor, borderColor: team.secondaryColor }}
                        >
                          {team.logoUrl ? (
                            <img src={team.logoUrl} className="w-full h-full object-cover" alt={team.name} />
                          ) : (
                            <TeamIcon className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <span className="text-stone-900 group-hover:text-emerald-600 transition-colors">{team.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 text-center font-black text-stone-700">{s.wins}-{s.losses}-{s.ties}</TableCell>
                    <TableCell className="px-6 text-center font-mono text-stone-500 font-bold">{(s.winPercentage * 100).toFixed(1)}%</TableCell>
                    <TableCell className="px-6 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-sm inline-block transition-transform group-hover:scale-110",
                        s.streak.startsWith('W') ? "bg-emerald-500 text-white shadow-emerald-500/20" : 
                        s.streak.startsWith('T') ? "bg-stone-400 text-white shadow-stone-400/20" : "bg-rose-500 text-white shadow-rose-500/20"
                      )}>
                        {s.streak}
                      </span>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </div>
    </div>
  );
}
