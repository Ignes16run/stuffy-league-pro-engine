"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, History, Award, Star, TrendingUp, Users
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function LeagueHistory() {
  const { history, teams } = useLeague();

  if (history.length === 0) {
    return (
      <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-stone-200">
        <History className="w-16 h-16 text-stone-200 mx-auto mb-6" />
        <h3 className="text-2xl font-black text-stone-800 mb-2">History in the Making</h3>
        <p className="text-stone-500 max-w-xs mx-auto">The chronicles of the Stuffy League begin after your first complete season.</p>
      </div>
    );
  }

  // Top performers summaries
  const sortedByWins = [...teams].sort((a, b) => (b.allTimeWins || 0) - (a.allTimeWins || 0)).slice(0, 3);
  const sortedByChampionships = [...teams].sort((a, b) => (b.championships || 0) - (a.championships || 0)).slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      {/* Career Leaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <LeaderCard title="All-Time Wins" teams={sortedByWins} icon={Award} statKey="allTimeWins" color="#3b82f6" />
        <LeaderCard title="Championships" teams={sortedByChampionships} icon={Trophy} statKey="championships" color="#eab308" />
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3 px-4">
          <History className="w-5 h-5 text-stone-400" />
          <h3 className="text-xl font-black text-stone-900 uppercase tracking-widest leading-none">Season Archive</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((entry, idx) => (
             <SeasonEntry key={idx} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LeaderCard({ title, teams, icon: Icon, statKey, color }: { title: string, teams: any[], icon: any, statKey: string, color: string }) {
  return (
    <Card className="rounded-[2rem] border border-stone-100 shadow-xl overflow-hidden min-h-[420px]">
       <CardHeader className="bg-stone-50/30 border-b border-stone-100 p-8">
          <div className="w-12 h-12 rounded-[1.25rem] bg-white shadow-sm flex items-center justify-center border border-stone-100 mb-4">
             <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <CardTitle className="text-2xl font-black text-stone-900 uppercase tracking-widest">{title}</CardTitle>
          <CardDescription className="text-stone-400 text-xs font-bold uppercase tracking-widest">Global Career Stats</CardDescription>
       </CardHeader>
       <CardContent className="p-0">
          <div className="divide-y divide-stone-50">
             {teams.map((team, idx) => (
               <div key={team.id} className="p-6 flex items-center justify-between group hover:bg-stone-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                     <span className="text-xs font-black text-stone-300 w-4">{idx + 1}</span>
                       <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center border-2 shadow-sm text-white"
                          style={{ backgroundColor: team.primaryColor, borderColor: team.secondaryColor }}
                        >
                           {team.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-cover" /> : React.createElement(STUFFY_ICONS[team.icon as keyof typeof STUFFY_ICONS], { className: "w-6 h-6" })}
                        </div>
                      <div className="text-left">
                         <h4 className="font-black text-stone-900 text-sm leading-tight truncate uppercase tracking-tighter">{team.name}</h4>
                         <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Current Class</p>
                      </div>
                  </div>
                  <div className="text-2xl font-black text-stone-900 pr-2">
                     {team[statKey] || 0}
                  </div>
               </div>
             ))}
          </div>
       </CardContent>
    </Card>
  );
}

function SeasonEntry({ entry }: { entry: any }) {
  const { teams } = useLeague();
  const champion = teams.find(t => t.id === entry.championId);
  const IconComp = champion ? STUFFY_ICONS[champion.icon as keyof typeof STUFFY_ICONS] : null;

  return (
    <Card className="rounded-[2rem] border border-stone-100 p-8 space-y-6 hover:shadow-xl hover:-translate-y-1 transition-all">
       <div className="flex items-center justify-between">
          <div className="text-left">
             <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">Established</p>
             <h4 className="text-2xl font-black text-stone-900 leading-none">{entry.year}</h4>
          </div>
          <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center">
             <Trophy className="w-6 h-6 text-yellow-500" />
          </div>
       </div>

       <div className="space-y-4">
          <div className="flex items-center gap-4 bg-stone-50 rounded-2xl p-4 border border-stone-100">
             <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-sm text-white"
                style={{ backgroundColor: champion?.primaryColor || '#e5e7eb', borderColor: champion?.secondaryColor || '#d1d5db' }}
              >
                 {champion?.logoUrl ? <img src={champion.logoUrl} className="w-full h-full object-cover" /> : (IconComp && <IconComp className="w-6 h-6" />)}
              </div>
              <div className="min-w-0">
                 <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest leading-none mb-1">Champion</p>
                 <h5 className="font-black text-stone-900 text-sm leading-tight truncate uppercase tracking-tighter">{champion?.name || 'Retired Program'}</h5>
              </div>
          </div>
       </div>

       <div className="pt-4 border-t border-stone-50">
          <div className="flex items-center justify-between text-[10px] font-black text-stone-400 uppercase tracking-widest">
             <span>Top Performance</span>
             <TrendingUp className="w-3 h-3 text-stone-300" />
          </div>
          <p className="text-stone-700 font-bold text-sm mt-1">Standings Archived</p>
       </div>
    </Card>
  );
}
