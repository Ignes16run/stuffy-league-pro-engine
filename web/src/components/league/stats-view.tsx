"use client";
import React, { useMemo, useState } from 'react';
import { useLeague } from '@/context/league-context';
import { calculatePlayerRankings } from '@/lib/league/utils';
import { PlayerStats, AwardType } from '@/lib/league/types';
import { Trophy, Target, BarChart3, Users, PlayCircle, Shield, Award } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Standings from './standings';

export default function StatsView() {
  const { players, teams, games } = useLeague();
  const [statMode, setStatMode] = useState<'season' | 'career'>('season');

  const leaderboards = useMemo(() => {
    const getTop = (key: keyof PlayerStats, positions: string[], reverse = false) => {
      const pool = players.filter(p => positions.includes(p.position)).map(p => ({
          ...p,
          displayStats: statMode === 'career' ? (p.careerStats || p.stats) : p.stats
      }));
      return [...pool].sort((a, b) => {
        const valA = (a.displayStats[key] as number) || 0;
        const valB = (b.displayStats[key] as number) || 0;
        return reverse ? valA - valB : valB - valA;
      }).slice(0, 5);
    };

    return {
      passingYards: getTop('passingYards', ['QB']),
      passingTds: getTop('passingTds', ['QB']),
      rushingYards: getTop('rushingYards', ['RB']),
      rushingTds: getTop('rushingTds', ['RB']),
      receivingYards: getTop('receivingYards', ['WR', 'TE']),
      receivingTds: getTop('receivingTds', ['WR', 'TE']),
      tackles: getTop('tackles', ['DL', 'LB', 'EDGE', 'CB', 'S']),
      sacks: getTop('sacks', ['DL', 'LB', 'EDGE']),
      interceptions: getTop('interceptions', ['CB', 'S', 'LB']),
      points: getTop('points', ['K']), // Special Teams!
      fgMade: getTop('fgMade' as any, ['K']),
    };
  }, [players, statMode]);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <div className="flex justify-between items-center bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-100">
        <div>
          <h2 className="text-3xl font-black text-stone-900 uppercase tracking-widest leading-none mb-1">League Statistics</h2>
          <p className="text-stone-500 font-medium italic">Performance metrics and global leaderboards.</p>
        </div>
        <div className="flex bg-stone-100 p-1 rounded-2xl shadow-inner gap-0.5">
           <button 
             onClick={() => setStatMode('season')}
             className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all", statMode === 'season' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400")}
           >Season</button>
           <button 
             onClick={() => setStatMode('career')}
             className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all", statMode === 'career' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400")}
           >Career</button>
        </div>
      </div>

      <Tabs defaultValue="standings" className="mt-8 space-y-6">
        <TabsList className="bg-stone-100/50 p-1.5 rounded-2xl h-auto gap-1">
          <TabsTrigger value="standings" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            <BarChart3 className="w-3.5 h-3.5 mr-2" />
            Standings
          </TabsTrigger>
          <TabsTrigger value="offensive" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            <PlayCircle className="w-3.5 h-3.5 mr-2" />
            Offensive Leaders
          </TabsTrigger>
          <TabsTrigger value="defensive" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            <Shield className="w-3.5 h-3.5 mr-2" />
            Defensive Leaders
          </TabsTrigger>
          <TabsTrigger value="st" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            <Award className="w-3.5 h-3.5 mr-2" />
            Special Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="mt-0 focus-visible:outline-none">
          <Standings />
        </TabsContent>
        
        <TabsContent value="offensive" className="mt-0 focus-visible:outline-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatLeaderCard title="Passing Yards" players={leaderboards.passingYards} statKey="passingYards" statMode={statMode} />
          <StatLeaderCard title="Passing TDs" players={leaderboards.passingTds} statKey="passingTds" statMode={statMode} />
          <StatLeaderCard title="Rushing Yards" players={leaderboards.rushingYards} statKey="rushingYards" statMode={statMode} />
          <StatLeaderCard title="Rushing TDs" players={leaderboards.rushingTds} statKey="rushingTds" statMode={statMode} />
          <StatLeaderCard title="Receiving Yards" players={leaderboards.receivingYards} statKey="receivingYards" statMode={statMode} />
          <StatLeaderCard title="Receiving TDs" players={leaderboards.receivingTds} statKey="receivingTds" statMode={statMode} />
        </TabsContent>

        <TabsContent value="defensive" className="mt-0 focus-visible:outline-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatLeaderCard title="Tackles" players={leaderboards.tackles} statKey="tackles" statMode={statMode} />
          <StatLeaderCard title="Sacks" players={leaderboards.sacks} statKey="sacks" statMode={statMode} />
          <StatLeaderCard title="Interceptions" players={leaderboards.interceptions} statKey="interceptions" statMode={statMode} />
        </TabsContent>

        <TabsContent value="st" className="mt-0 focus-visible:outline-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatLeaderCard title="Total Points" players={leaderboards.points} statKey="points" statMode={statMode} />
          <StatLeaderCard title="Field Goals Made" players={leaderboards.fgMade} statKey="fgMade" statMode={statMode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatLeaderCard({ title, players, statKey, statMode }: { 
  title: string, 
  players: any[], 
  statKey: string,
  statMode: string 
}) {
  const { teams } = useLeague();
  return (
    <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
      <CardHeader className="bg-stone-50/50 pb-6 pt-8 px-8 border-b border-stone-100/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100">
             <Target className="w-6 h-6 text-emerald-500" />
          </div>
          <CardTitle className="text-xl font-black text-stone-900 tracking-tight uppercase leading-none">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-stone-50">
          {players.map((player, idx) => {
            const team = teams.find(t => t.id === player.teamId);
            if (!team) return null;
            const stats = statMode === 'career' ? (player.careerStats || player.stats) : player.stats;
            return (
              <div key={player.id} className="px-8 py-5 flex items-center justify-between hover:bg-stone-50/50 transition-colors">
                <div className="flex items-center gap-5">
                  <span className="text-2xl font-black text-stone-200 w-8">#{idx + 1}</span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[9px] font-black border-2" style={{ backgroundColor: team.primaryColor, borderColor: team.secondaryColor }}>
                    {player.position}
                  </div>
                  <div>
                    <p className="font-black text-stone-900 text-sm leading-none mb-1">{player.name}</p>
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{team.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-stone-900 leading-none">{(stats[statKey] as number) || 0}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
