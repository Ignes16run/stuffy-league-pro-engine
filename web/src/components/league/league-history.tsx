"use client";
// Last Updated: 2026-03-22T21:50:00-04:00

import React, { useMemo } from 'react';
import Image from 'next/image';
import { 
  Trophy, History, Award, Star, Target, Zap, Shield, Medal, LucideIcon
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_RENDER_MAP } from '@/lib/league/assetMap';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Player, Team, PlayerStats, SeasonHistory, PlayerAward, StuffyIcon } from '@/lib/league/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export default function LeagueHistory() {
  const { history, teams, players } = useLeague();

  // Career Summaries (Players)
  const playerLeaders = useMemo(() => {
    const getTopPlayers = (key: keyof PlayerStats) => {
      return [...players]
        .map(p => ({ ...p, careerRecord: (p.careerStats?.[key] as number) || (p.stats[key] as number) || 0 }))
        .sort((a, b) => b.careerRecord - a.careerRecord)
        .filter(p => p.careerRecord > 0)
        .slice(0, 3);
    };

    const getTopAwardWinners = () => {
       return [...players]
         .map(p => ({ ...p, careerRecord: (p.awards?.length || 0) }))
         .sort((a, b) => b.careerRecord - a.careerRecord)
         .filter(p => p.careerRecord > 0)
         .slice(0, 5);
    };

    return {
      passingYards: getTopPlayers('passingYards'),
      passingTds: getTopPlayers('passingTds'),
      rushingYards: getTopPlayers('rushingYards'),
      rushingTds: getTopPlayers('rushingTds'),
      receivingYards: getTopPlayers('receivingYards'),
      receivingTds: getTopPlayers('receivingTds'),
      tackles: getTopPlayers('tackles'),
      sacks: getTopPlayers('sacks'),
      interceptions: getTopPlayers('interceptions'),
      awards: getTopAwardWinners()
    };
  }, [players]);

  if (history.length === 0) {
    return (
      <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-stone-200">
        <History className="w-16 h-16 text-stone-200 mx-auto mb-6" />
        <h3 className="text-2xl font-black text-stone-800 mb-2">History in the Making</h3>
        <p className="text-stone-500 max-w-xs mx-auto">The chronicles of the Stuffy League begin after your first complete season.</p>
      </div>
    );
  }

  // Career Summaries (Teams)
  const sortedByWins = [...teams].sort((a, b) => (b.allTimeWins || 0) - (a.allTimeWins || 0)).slice(0, 3);
  const sortedByChampionships = [...teams].sort((a, b) => (b.championships || 0) - (a.championships || 0)).slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      <Tabs defaultValue="overview" className="space-y-12">
        <TabsList className="bg-stone-100 p-1 rounded-2xl">
           <TabsTrigger value="overview" className="rounded-xl px-8 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white">Record Book</TabsTrigger>
           <TabsTrigger value="players" className="rounded-xl px-8 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white">Hall of Fame</TabsTrigger>
           <TabsTrigger value="awards" className="rounded-xl px-8 py-2 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white">Award Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-12">
          {/* Career Team Leaders */}
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
        </TabsContent>

        <TabsContent value="players" className="mt-0 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <PlayerHallOfFameCard title="Passing Yards" players={playerLeaders.passingYards} icon={Target} color="#3b82f6" />
                <PlayerHallOfFameCard title="Passing TDs" players={playerLeaders.passingTds} icon={Star} color="#f59e0b" />
                <PlayerHallOfFameCard title="Rushing Yards" players={playerLeaders.rushingYards} icon={Zap} color="#10b981" />
                <PlayerHallOfFameCard title="Receiving Yards" players={playerLeaders.receivingYards} icon={Target} color="#8b5cf6" />
             </div>
             <div className="space-y-8">
                <PlayerHallOfFameCard title="Decorated Legends" players={playerLeaders.awards} icon={Medal} color="#f97316" customLabel="Awards Won" />
                <PlayerHallOfFameCard title="Sacks" players={playerLeaders.sacks} icon={Zap} color="#ef4444" />
                <PlayerHallOfFameCard title="Interceptions" players={playerLeaders.interceptions} icon={Shield} color="#6366f1" />
             </div>
          </div>
        </TabsContent>

        <TabsContent value="awards" className="mt-0">
            <div className="space-y-12">
               {history.map((entry) => {
                  const yearAwards: { player: Player, award: PlayerAward }[] = [];
                  players.forEach(p => {
                     p.awards?.filter(a => a.year === entry.year).forEach(a => {
                        yearAwards.push({ player: p, award: a });
                     });
                  });
 
                  if (yearAwards.length === 0) return null;
 
                  return (
                    <div key={entry.year} className="space-y-6">
                       <div className="flex items-center gap-4 px-4">
                          <div className="h-0.5 flex-1 bg-stone-100" />
                          <span className="font-black text-stone-900 text-lg uppercase tracking-tight italic">Season {entry.year} Honors</span>
                          <div className="h-0.5 flex-1 bg-stone-100" />
                       </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                         {yearAwards.map(({ player, award }, idx) => (
                           <Card key={idx} className="rounded-3xl border-stone-100 shadow-lg overflow-hidden border-2 bg-white">
                              <div className="p-5">
                                 <div className="flex items-center justify-between mb-4">
                                    <Badge className="bg-amber-400 text-white border-none py-1 px-3 text-[9px] font-black uppercase tracking-widest">{award.awardType}</Badge>
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                 </div>
                                  <div className="flex items-center gap-3 mb-4">
                                     <div className="w-10 h-10 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                                        {player.profilePicture ? (
                                           <Image src={player.profilePicture} fill className="object-cover" alt={player.name} />
                                        ) : (
                                           <span className="text-sm">🧸</span>
                                        )}
                                     </div>
                                     <div className="min-w-0">
                                        <p className="font-black text-stone-900 text-xs truncate leading-none mb-1 uppercase tracking-tighter">{player.name}</p>
                                        <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">{player.position}</p>
                                     </div>
                                  </div>
                                 {player.profile && (
                                   <div className="p-3 bg-stone-50 rounded-xl text-[11px] leading-relaxed text-stone-600 font-medium italic border border-stone-100">
                                      &quot;{player.profile}&quot;
                                   </div>
                                 )}
                              </div>
                           </Card>
                         ))}
                      </div>
                   </div>
                 );
              })}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderCard({ title, teams, icon: Icon, statKey, color }: { title: string, teams: Team[], icon: LucideIcon, statKey: keyof Team, color: string }) {
  return (
    <Card className="rounded-[4xl] border border-stone-100 shadow-xl overflow-hidden min-h-[420px] bg-white group">
       <CardHeader className="bg-stone-50/30 border-b border-stone-100 p-8">
          <div className="w-12 h-12 rounded-[1.25rem] bg-white shadow-sm flex items-center justify-center border border-stone-100 mb-4 group-hover:scale-110 transition-transform">
             <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <CardTitle className="text-2xl font-black text-stone-900 uppercase tracking-widest">{title}</CardTitle>
          <CardDescription className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Global Career Records</CardDescription>
       </CardHeader>
       <CardContent className="p-0">
          <div className="divide-y divide-stone-50">
             {teams.map((team, idx) => {
               const renderUrl = STUFFY_RENDER_MAP[team.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
               return (
                 <div key={team.id} className="p-6 flex items-center justify-between group/row hover:bg-stone-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                       <span className="text-sm font-black text-stone-300 w-4">{idx + 1}</span>
                       <div 
                          className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-white shadow-lg relative overflow-hidden group-hover/row:scale-110 transition-transform duration-500"
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
                        <div className="text-left">
                           <h4 className="font-black text-stone-900 text-sm leading-tight uppercase tracking-tighter mb-0.5">{team.name}</h4>
                           <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest bg-stone-100/50 px-2 py-0.5 rounded-full inline-block">Permanent Program</p>
                        </div>
                    </div>
                    <div className="text-3xl font-black text-stone-900 pr-2 tabular-nums italic">
                       {team[statKey] as number || 0}
                    </div>
                 </div>
               );
             })}
          </div>
       </CardContent>
    </Card>
  );
}

function PlayerHallOfFameCard({ title, players, icon: Icon, color, customLabel }: { title: string, players: (Player & { careerRecord: number })[], icon: LucideIcon, color: string, customLabel?: string }) {
  const { teams } = useLeague();
  return (
    <Card className="rounded-[4xl] border border-stone-100 shadow-lg overflow-hidden h-full bg-white group">
       <CardHeader className="bg-stone-50/30 border-b border-stone-100 p-8 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black text-stone-900 uppercase tracking-tighter leading-tight">{title}</CardTitle>
            <CardDescription className="text-[9px] font-black uppercase text-stone-400 tracking-widest">Lifetime Hall of Fame Records</CardDescription>
          </div>
          <div className="w-12 h-12 rounded-[1.25rem] bg-stone-50 shadow-sm flex items-center justify-center border border-stone-100 group-hover:rotate-12 transition-transform">
             <Icon className="w-6 h-6" style={{ color }} />
          </div>
       </CardHeader>
       <CardContent className="p-0">
          <div className="divide-y divide-stone-50">
             {players.map((player, idx) => {
               const team = teams.find(t => t.id === player.teamId);
               const renderUrl = team ? STUFFY_RENDER_MAP[team.icon as StuffyIcon] : STUFFY_RENDER_MAP.TeddyBear;
               return (
                 <div key={player.id} className="p-6 flex items-center justify-between group/row transition-colors hover:bg-stone-50/50">
                    <div className="flex items-center gap-5">
                       <span className="text-xs font-black text-stone-200 w-4">#{idx + 1}</span>
                       <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-white shadow-xl relative overflow-hidden group-hover/row:scale-110 transition-transform duration-500"
                          style={{ backgroundColor: team?.primaryColor || '#000' }}
                        >
                           {player.profilePicture ? (
                             <Image src={player.profilePicture} fill className="object-cover" alt={player.name} />
                           ) : (
                             <div className="relative w-[130%] h-[130%] translate-y-2">
                               <Image src={renderUrl} fill className="object-contain drop-shadow-md" alt={player.name} />
                             </div>
                           )}
                        </div>
                        <div className="text-left">
                           <h4 className="font-black text-stone-900 text-sm leading-tight uppercase mb-1 tracking-tighter">{player.name}</h4>
                           <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-black uppercase bg-stone-900 text-white px-1.5 py-0.5 rounded-sm">POS: {player.position}</span>
                              <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">{team?.name || 'Retired'}</span>
                           </div>
                        </div>
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-black text-stone-900 leading-none italic">{player.careerRecord}</p>
                       <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mt-1">{customLabel || 'Total'}</p>
                    </div>
                 </div>
               );
             })}
          </div>
       </CardContent>
    </Card>
  );
}

function SeasonEntry({ entry }: { entry: SeasonHistory }) {
  const { teams } = useLeague();
  const champion = teams.find(t => t.id === entry.championId);
  const renderUrl = champion ? STUFFY_RENDER_MAP[champion.icon as StuffyIcon] : STUFFY_RENDER_MAP.TeddyBear;

  return (
    <Card className="rounded-[4xl] border border-stone-100 p-8 space-y-6 hover:shadow-2xl hover:-translate-y-2 transition-all group bg-white">
       <div className="flex items-center justify-between">
          <div className="text-left">
             <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em] leading-none mb-2">Established</p>
             <h4 className="text-3xl font-black text-stone-900 leading-none tracking-tighter">{entry.year}</h4>
          </div>
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 group-hover:rotate-12 transition-transform">
             <Trophy className="w-8 h-8 text-amber-500" />
          </div>
       </div>

       <div className="space-y-4">
          <div className="flex items-center gap-5 bg-stone-50 rounded-3xl p-5 border border-stone-100 group-hover:bg-white transition-colors duration-500">
             <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-white shadow-xl relative overflow-hidden group-hover:scale-110 transition-transform duration-500"
                style={{ backgroundColor: champion?.primaryColor || '#e5e7eb' }}
              >
                 {champion?.logoUrl ? (
                   <Image src={champion.logoUrl} fill className="object-cover" alt={champion.name} />
                 ) : (
                   <div className="relative w-[130%] h-[130%] translate-y-2">
                     <Image src={renderUrl} fill className="object-contain drop-shadow-lg" alt={champion?.name || 'Retired'} />
                   </div>
                 )}
              </div>
              <div className="min-w-0">
                 <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.3em] leading-none mb-2">Champion</p>
                 <h5 className="font-black text-stone-900 text-base leading-tight truncate uppercase tracking-tighter">{champion?.name || 'Retired Program'}</h5>
              </div>
          </div>
       </div>

       <div className="pt-6 border-t border-stone-50 flex items-center justify-between">
          <div className="text-[9px] font-black text-stone-300 uppercase tracking-widest">
             Performance Archive
          </div>
          <Badge variant="outline" className="text-[8px] border-emerald-100 text-emerald-600 font-black uppercase px-2">Verified</Badge>
       </div>
    </Card>
  );
}
