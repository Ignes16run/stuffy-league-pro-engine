"use client";

import React from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { 
  Sword, Shield, Star, Users, Plus
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_RENDER_MAP } from '@/lib/league/assetMap';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StuffyIcon, Team } from '@/lib/league/types';

export default function TrainingCamp() {
  const { teams, upgradeStat } = useLeague();

  if (teams.length === 0) {
    return (
      <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-stone-200">
        <Users className="w-16 h-16 text-stone-200 mx-auto mb-6" />
        <h3 className="text-2xl font-black text-stone-800 mb-2">Nobody at Camp</h3>
        <p className="text-stone-500 max-w-xs mx-auto">Go to Team Setup to build your roster first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <Card className="rounded-[2.5rem] border border-stone-100 shadow-xl overflow-hidden p-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <CardTitle className="text-2xl font-black text-stone-900 uppercase tracking-widest leading-none mb-1">
              The Training Camp
            </CardTitle>
            <CardDescription className="text-stone-500 text-sm">
              Use Stuffy Points earned from games to upgrade your team.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 border border-indigo-100 px-6 py-4 rounded-2xl flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-500 fill-indigo-500" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5 leading-none">Cost</p>
                <h4 className="text-lg font-black text-indigo-900 leading-none">50 SP <span className="text-[10px] font-medium text-indigo-500">/ stat</span></h4>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
        {teams.map(team => (
          <TeamCampCard key={team.id} team={team} onUpgrade={upgradeStat} />
        ))}
      </div>
    </div>
  );
}

function TeamCampCard({ team, onUpgrade }: { team: Team, onUpgrade: (teamId: string, statId: string) => Promise<void> }) {
  const points = team.stuffyPoints || 0;
  const renderUrl = STUFFY_RENDER_MAP[team.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;

  return (
    <Card className="rounded-4xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all group bg-white/60 backdrop-blur-sm">
       <div className="bg-stone-50/50 p-8 border-b border-stone-100 flex items-center gap-6">
          <div 
            className="w-20 h-20 rounded-3xl flex items-center justify-center border-2 border-white shadow-xl relative overflow-hidden group-hover:scale-105 transition-transform duration-500"
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
           <div className="flex-1 min-w-0">
             <h4 className="font-black text-stone-900 text-xl leading-tight truncate uppercase tracking-tighter mb-1">{team.name}</h4>
             <div className="flex items-center gap-2">
                <div className="bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1.5 border border-indigo-100/50">
                  <Star className="w-3 h-3 text-indigo-500 fill-indigo-500" />
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{points} SP</span>
                </div>
             </div>
          </div>
       </div>
       
       <CardContent className="p-8 space-y-10">
          {[
            { id: 'offenseRating', label: 'Offense', icon: Sword, color: '#f43f5e' },
            { id: 'defenseRating', label: 'Defense', icon: Shield, color: '#3b82f6' },
            { id: 'specialTeamsRating', label: 'Special Teams', icon: Star, color: '#10b981' }
          ].map(stat => {
            const val = (team[stat.id as keyof Team] as number) || 75;
            const canAfford = points >= 50 && val < 99;
            return (
              <div key={stat.id} className="space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:bg-white transition-colors">
                          <stat.icon className="w-4 h-4 text-stone-300" />
                       </div>
                       <span className="text-[10px] font-black uppercase text-stone-400 tracking-[0.2em]">{stat.label}</span>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-black text-stone-900 leading-none">{val}</span>
                      <span className="text-[10px] font-bold text-stone-300 uppercase pb-0.5">/ 99</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: `${(val/99)*100}%` }} className="h-full rounded-full" style={{ backgroundColor: stat.color }} />
                    </div>
                    <Button 
                      variant="outline" size="sm" className="h-10 px-4 rounded-xl border-stone-100 bg-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-sm active:scale-95 transition-all"
                      disabled={!canAfford}
                      onClick={() => onUpgrade(team.id, stat.id)}
                    >
                       <Plus className={cn("w-3.5 h-3.5", canAfford ? "text-indigo-500" : "text-stone-200")} />
                       Train
                    </Button>
                 </div>
              </div>
            )
          })}
       </CardContent>
    </Card>
  );
}
