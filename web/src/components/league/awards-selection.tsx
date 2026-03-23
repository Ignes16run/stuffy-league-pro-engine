"use client";
// Last Updated: 2026-03-23T04:25:00-04:00

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Medal, Star, Target, Shield, Sparkles, Share2, Play, RotateCcw
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_RENDER_MAP } from '@/lib/league/assetMap';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AwardType, Player, Team, StuffyIcon } from '@/lib/league/types';

const AWARD_CONFIG = {
  MVP: { icon: Star, color: 'from-amber-400 to-orange-600', label: 'Most Valuable Stuffy', bg: 'bg-amber-500/10' },
  OPOY: { icon: Target, color: 'from-blue-400 to-indigo-600', label: 'Offensive Stuffy of the Year', bg: 'bg-blue-500/10' },
  DPOY: { icon: Shield, color: 'from-emerald-400 to-teal-600', label: 'Defensive Stuffy of the Year', bg: 'bg-emerald-500/10' },
  STPOY: { icon: Sparkles, color: 'from-purple-400 to-fuchsia-600', label: 'Special Teams Stuffy of the Year', bg: 'bg-purple-500/10' },
  CHAMPION: { icon: Trophy, color: 'from-rose-400 to-pink-600', label: 'League Champion', bg: 'bg-rose-500/10' }
};

export default function AwardsSelection() {
  const { calculateAwards, teams, players, finalizeSeason } = useLeague();
  const [awards, setAwards] = useState<Partial<Record<AwardType, { winner: Player; narrative: string }>>>({});
  const [revealingAwards, setRevealingAwards] = useState<AwardType[]>([]);
  const [isCeremonyActive, setIsCeremonyActive] = useState(false);

  const startCeremony = () => {
    const results = calculateAwards();
    setAwards(results);
    setIsCeremonyActive(true);
    setRevealingAwards([]);
    
    // Reveal awards one by one
    const types: AwardType[] = ['STPOY', 'DPOY', 'OPOY', 'MVP', 'CHAMPION'];
    types.forEach((type, idx) => {
      setTimeout(() => {
        setRevealingAwards(prev => [...prev, type]);
      }, idx * 1200);
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      {/* Ceremony Header */}
      {!isCeremonyActive ? (
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center space-y-8 py-20 bg-white/40 backdrop-blur-3xl rounded-[4rem] border border-stone-100 shadow-3xl shadow-stone-200/20 px-10 relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-amber-500/30 to-transparent" />
            <div className="w-24 h-24 bg-linear-to-br from-amber-400 to-amber-600 rounded-4xl flex items-center justify-center shadow-2xl shadow-amber-500/40 border-2 border-white/20 mb-4">
               <Trophy className="w-10 h-10 text-white animate-bounce" />
            </div>
            <div className="space-y-4 max-w-2xl">
               <h2 className="text-6xl font-black text-stone-900 uppercase tracking-tighter leading-none">The Prestige Gala</h2>
               <p className="text-stone-400 text-sm font-black uppercase tracking-[0.4em]">Stuffy League Pro Annual Awards Night</p>
            </div>
            <p className="text-stone-400 text-lg leading-relaxed max-w-xl font-medium">
               Celebrate the season&apos;s greatest achievements. Who will take home the gold and join the immortals of the Stuffy League?
            </p>
            <Button 
               onClick={startCeremony}
               className="h-20 px-16 rounded-3xl bg-black border-0 text-white font-black text-base uppercase tracking-[0.3em] shadow-3xl hover:bg-stone-800 transition-all active:scale-95 gap-4 group"
            >
               <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
               Commence Ceremony
            </Button>
        </motion.div>
      ) : (
        <div className="space-y-24">
            <div className="text-center space-y-4">
               <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black uppercase tracking-[0.3em]"
               >
                  <Sparkles className="w-3 h-3" />
                  Live Presentation
               </motion.div>
               <h3 className="text-4xl font-black text-stone-900 uppercase tracking-tighter">Award Recipients</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
               <AnimatePresence>
                  {(['STPOY', 'DPOY', 'OPOY', 'MVP', 'CHAMPION'] as AwardType[]).map((type) => (
                    revealingAwards.includes(type) && awards[type] && (
                        <AwardRevealCard 
                            key={type}
                            type={type} 
                            playerId={awards[type]!.winner.id} 
                            players={players} 
                            teams={teams}
                        />
                    )
                  ))}
               </AnimatePresence>
            </div>

            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 6.5 }}
               className="flex justify-center"
            >
               <Button 
                variant="outline"
                className="h-16 px-10 rounded-2xl border-stone-200 bg-white text-[11px] font-black uppercase tracking-widest gap-3 shadow-sm hover:bg-stone-50"
                onClick={() => setIsCeremonyActive(false)}
               >
                  <Share2 className="w-4 h-4" />
                  Close Ceremony Hall
               </Button>
            </motion.div>
            <div className="flex flex-col items-center gap-10 mt-20">
               {revealingAwards.includes('CHAMPION') && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 }}
                  >
                    <Button 
                      onClick={finalizeSeason}
                      className="h-20 px-20 rounded-[2.5rem] bg-emerald-600 text-white font-black text-lg uppercase tracking-[0.2em] shadow-3xl hover:bg-emerald-700 transition-all active:scale-95 gap-4"
                    >
                      <RotateCcw className="w-6 h-6" />
                      Start Next Season (2027)
                    </Button>
                    <p className="text-center text-stone-400 text-xs font-bold uppercase tracking-widest mt-6">
                       All stats will be archived to players&apos; career records
                    </p>
                  </motion.div>
               )}
            </div>
        </div>
      )}
    </div>
  );
}

function AwardRevealCard({ type, playerId, players, teams }: { type: AwardType, playerId: string, players: Player[], teams: Team[] }) {
  const config = AWARD_CONFIG[type];
  const Icon = config.icon;
  const isTeamAward = type === 'CHAMPION';
  const player = isTeamAward ? null : players.find(p => p.id === playerId);
  const team = isTeamAward ? teams.find(t => t.id === playerId) : teams.find(t => t.id === player?.teamId);
  const renderUrl = team ? STUFFY_RENDER_MAP[team.icon as StuffyIcon] : STUFFY_RENDER_MAP.TeddyBear;

  return (
    <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="relative group h-full"
    >
       {/* Spotlight Beam */}
       <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-40 h-[600px] bg-white/10 blur-[60px] pointer-events-none -z-10 animate-pulse" />
       
       <div className="relative h-full bg-white rounded-[3.5rem] border border-stone-100 shadow-2xl overflow-hidden group-hover:shadow-3xl transition-all duration-700">
          {/* Accent Header */}
          <div className={cn("h-48 w-full relative overflow-hidden flex items-center justify-center pt-8 bg-linear-to-br", config.color)}>
             <div className="absolute inset-0 bg-white/10 opacity-20" />
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 blur-3xl rounded-full" />
             
             {/* Character Background Glimpse */}
             <div className="absolute inset-0 flex items-center justify-center opacity-30 mix-blend-overlay scale-150 -translate-y-4">
                 <Image src={renderUrl} fill className="object-contain" alt="" />
             </div>

             <div className="relative z-10 p-6 bg-white/20 backdrop-blur-2xl rounded-4xl border border-white/30 shadow-2xl group-hover:scale-110 transition-transform duration-700">
                <Icon className="w-12 h-12 text-white" />
             </div>
          </div>

          <div className="p-10 space-y-8 flex flex-col items-center text-center">
             <div className="space-y-1">
                <span className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em]">{config.label}</span>
                <h4 className="text-2xl font-black text-stone-900 uppercase tracking-tighter leading-tight">
                    {isTeamAward ? (team?.name || 'Unknown Franchise') : (player?.name || 'Unknown Legend')}
                </h4>
             </div>

             <div className="flex items-center gap-4">
                {team && (
                    <div className="flex items-center gap-3 bg-stone-50 px-5 py-3 rounded-2xl border border-stone-100 shadow-sm group-hover:bg-white group-hover:scale-105 transition-all">
                       <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm ring-4 ring-white relative overflow-hidden"
                        style={{ backgroundColor: team.primaryColor }}
                       >
                          {team.logoUrl ? (
                              <Image src={team.logoUrl} fill className="object-cover" alt={team.id} />
                          ) : (
                              <div className="relative w-[130%] h-[130%] translate-y-2">
                                <Image src={renderUrl} fill className="object-contain drop-shadow-lg" alt={team.id} />
                              </div>
                          )}
                       </div>
                       <span className="text-[11px] font-black text-stone-600 uppercase tracking-widest leading-none">{team.name}</span>
                    </div>
                )}
                {player && (
                    <div className="bg-stone-900 text-white px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl ring-4 ring-white">
                       {player.position}
                    </div>
                )}
             </div>

             <div className="grid grid-cols-2 w-full gap-4 pt-4 border-t border-stone-100 mt-4">
                <div className="text-left">
                   <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest mb-1">Impact</p>
                   <p className="text-lg font-black text-stone-900 italic tracking-tighter">Elite</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest mb-1">Rating</p>
                   <p className="text-lg font-black text-emerald-500 italic tracking-tighter">{player?.rating || team?.offenseRating || '---'}</p>
                </div>
             </div>
          </div>

          <div className="absolute top-4 right-4 group-hover:opacity-100 opacity-0 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Medal className="w-5 h-5 text-white" />
            </div>
          </div>
       </div>
    </motion.div>
  );
}
