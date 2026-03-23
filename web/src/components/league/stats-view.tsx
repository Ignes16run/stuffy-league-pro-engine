"use client";
// Last Updated: 2026-03-23T04:00:00-04:00
import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { useLeague } from '@/context/league-context';
import { Player, PlayerStats, PlayerPosition, StuffyIcon } from '@/lib/league/types';
import { Target, Search, Users, Filter, X } from 'lucide-react';
import { STUFFY_RENDER_MAP } from '@/lib/league/assetMap';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import Standings from './standings';
import AwardsSelection from './awards-selection';

export default function StatsView() {
  const { players, teams, isAwardsPhase } = useLeague();
  const [statMode, setStatMode] = useState<'season' | 'career'>('season');
  const [activeTab, setActiveTab] = useState('offensive');
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');

  // Reactively reset position filter when tab changes if it doesn't belong
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPositionFilter('all');
  };

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeam = teamFilter === 'all' || p.teamId === teamFilter;
      const matchesPosition = positionFilter === 'all' || p.position === positionFilter;
      return matchesSearch && matchesTeam && matchesPosition;
    });
  }, [players, searchQuery, teamFilter, positionFilter]);

  const leaderboards = useMemo(() => {
    const getTop = (key: keyof PlayerStats, positions: string[], reverse = false) => {
      const pool = filteredPlayers
        .filter(p => positions.includes(p.position))
        .map(p => ({
            ...p,
            displayStats: statMode === 'career' ? (p.careerStats || p.stats) : p.stats
        }));
        
      return [...pool].sort((a, b) => {
        const valA = (a.displayStats[key] as number) || 0;
        const valB = (b.displayStats[key] as number) || 0;
        return reverse ? valA - valB : valB - valA;
      }).slice(0, 10);
    };

    return {
      passingYards: getTop('passingYards', ['QB']),
      passingTds: getTop('passingTds', ['QB']),
      rushingYards: getTop('rushingYards', ['RB']),
      rushingTds: getTop('rushingTds', ['RB']),
      receivingYards: getTop('receivingYards', ['WR', 'TE']),
      receivingTds: getTop('receivingTds', ['WR', 'TE']),
      tackles: getTop('tackles', ['DL', 'LB', 'EDGE', 'CB', 'S']),
      tacklesForLoss: getTop('tacklesForLoss', ['DL', 'LB', 'EDGE']),
      sacks: getTop('sacks', ['DL', 'LB', 'EDGE']),
      pressures: getTop('pressures', ['DL', 'LB', 'EDGE']),
      interceptions: getTop('interceptions', ['CB', 'S', 'LB']),
      passDeflections: getTop('passDeflections', ['CB', 'S']),
      points: getTop('points', ['K']),
      fgMade: getTop('fgMade' as keyof PlayerStats, ['K']),
      xpMade: getTop('xpMade' as keyof PlayerStats, ['K']),
    };
  }, [filteredPlayers, statMode]);

  const resetFilters = () => {
    setSearchQuery('');
    setTeamFilter('all');
    setPositionFilter('all');
  };

  const positionsByCategory: Record<string, PlayerPosition[]> = {
    offensive: ['QB', 'RB', 'WR', 'TE', 'OL'],
    defensive: ['DL', 'EDGE', 'LB', 'CB', 'S'],
    st: ['K', 'P'],
    'team-stats': ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'EDGE', 'LB', 'CB', 'S', 'K', 'P']
  };

  const currentAvailablePositions = positionsByCategory[activeTab] || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header & Main Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white rounded-3xl p-6 shadow-sm border border-stone-100 gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tighter leading-none mb-1">League Statistics</h2>
          <p className="text-xs text-stone-500 font-medium italic">Performance metrics and global leaderboards.</p>
        </div>
        <div className="flex bg-stone-100 p-1 rounded-xl shadow-inner gap-0.5 self-end">
           <button 
             onClick={() => setStatMode('season')}
             className={cn("px-5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", statMode === 'season' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400")}
           >Season</button>
           <button 
             onClick={() => setStatMode('career')}
             className={cn("px-5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all", statMode === 'career' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400")}
           >Career</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-stone-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input 
            placeholder="Search players..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 border-stone-100 rounded-xl"
          />
        </div>
        
        <div className="w-56">
          <Select value={teamFilter} onValueChange={(val) => setTeamFilter(val || 'all')}>
            <SelectTrigger className="h-10 border-stone-100 rounded-xl bg-stone-50/50">
              <Users className="w-4 h-4 text-stone-400 mr-2" />
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentAvailablePositions.length > 0 && (
          <div className="w-48">
            <Select value={positionFilter} onValueChange={(val) => setPositionFilter(val || 'all')}>
              <SelectTrigger className="h-10 border-stone-100 rounded-xl bg-stone-50/50">
                <Filter className="w-4 h-4 text-stone-400 mr-2" />
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {currentAvailablePositions.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {(searchQuery || teamFilter !== 'all' || positionFilter !== 'all') && (
          <button 
            onClick={resetFilters}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4 space-y-6">
        <TabsList className="bg-stone-100/50 p-1 rounded-xl h-auto gap-0.5 overflow-x-auto max-w-full no-scrollbar">
          <TabsTrigger value="standings" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            Standings
          </TabsTrigger>
          <TabsTrigger value="offensive" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            Offense
          </TabsTrigger>
          <TabsTrigger value="defensive" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            Defense
          </TabsTrigger>
          <TabsTrigger value="st" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            Special Teams
          </TabsTrigger>
          <TabsTrigger value="team-stats" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all border-l border-stone-200/50 ml-1">
            Team Stats
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
          <StatLeaderCard title="Tackles for Loss" players={leaderboards.tacklesForLoss} statKey="tacklesForLoss" statMode={statMode} />
          <StatLeaderCard title="Sacks" players={leaderboards.sacks} statKey="sacks" statMode={statMode} />
          <StatLeaderCard title="Pressures" players={leaderboards.pressures} statKey="pressures" statMode={statMode} />
          <StatLeaderCard title="Interceptions" players={leaderboards.interceptions} statKey="interceptions" statMode={statMode} />
          <StatLeaderCard title="Pass Deflections" players={leaderboards.passDeflections} statKey="passDeflections" statMode={statMode} />
        </TabsContent>

        <TabsContent value="st" className="mt-0 focus-visible:outline-none grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatLeaderCard title="Total Points" players={leaderboards.points} statKey="points" statMode={statMode} />
          <StatLeaderCard title="Field Goals Made" players={leaderboards.fgMade} statKey="fgMade" statMode={statMode} />
          <StatLeaderCard title="Extra Points Made" players={leaderboards.xpMade} statKey="xpMade" statMode={statMode} />
        </TabsContent>

        <TabsContent value="team-stats" className="mt-0 focus-visible:outline-none">
          <TeamStatsView preselectedTeamId={teamFilter !== 'all' ? teamFilter : null} />
        </TabsContent>
      </Tabs>

      {/* Prestige Gala Reveal - Shows after season is archived */}
      {isAwardsPhase && (
        <div className="pt-20 border-t border-stone-100">
           <AwardsSelection />
        </div>
      )}
    </div>
  );
}

function TeamStatsView({ preselectedTeamId }: { preselectedTeamId: string | null }) {
  const { players, teams } = useLeague();
  const [internalTeamId, setInternalTeamId] = useState<string | null>(null);

  // Use preselected if available, otherwise internal
  const selectedTeamId = preselectedTeamId || internalTeamId;

  const teamPlayers = useMemo(() => {
    if (!selectedTeamId) return [];
    return players.filter(p => p.teamId === selectedTeamId);
  }, [players, selectedTeamId]);

  const groupedPlayers = useMemo(() => {
    const groups: Record<string, Player[]> = {};
    teamPlayers.forEach(p => {
      if (!groups[p.position]) groups[p.position] = [];
      groups[p.position].push(p);
    });
    return groups;
  }, [teamPlayers]);

  const sortedPositionOrder: PlayerPosition[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'EDGE', 'LB', 'CB', 'S', 'K', 'P'];

  if (!selectedTeamId) {
    return (
      <Card className="rounded-3xl border-dashed border-2 border-stone-200 bg-stone-50/30 flex flex-col items-center justify-center py-20">
        <Users className="w-12 h-12 text-stone-300 mb-4" />
        <h3 className="text-lg font-black text-stone-400 uppercase tracking-widest">Select a team to view roster stats</h3>
        <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-2xl px-8">
          {teams.map(team => (
            <button
              key={team.id}
              onClick={() => setInternalTeamId(team.id)}
              className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-[10px] font-black uppercase hover:shadow-md hover:border-emerald-500 transition-all"
            >
              {team.name}
            </button>
          ))}
        </div>
      </Card>
    );
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: selectedTeam?.primaryColor }}>
            {selectedTeam?.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">{selectedTeam?.name} Roster Stats</h3>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Individual Player Performance</p>
          </div>
        </div>
        <button onClick={() => setInternalTeamId(null)} className="text-[10px] font-black uppercase text-stone-400 hover:text-stone-900 flex items-center gap-1">
          <X className="w-3 h-3" /> Change Team
        </button>
      </div>

      <div className="space-y-8">
        {sortedPositionOrder.map(pos => {
          const playersInPos = groupedPlayers[pos];
          if (!playersInPos || playersInPos.length === 0) return null;

          return (
            <div key={pos} className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                <span className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center text-[10px] font-black">{pos}</span>
                <div className="h-px flex-1 bg-stone-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {playersInPos.sort((a,b) => b.rating - a.rating).map(player => (
                  <Card key={player.id} className="rounded-2xl border-stone-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-stone-900 text-sm leading-tight">{player.name}</p>
                          <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">OVR {player.rating}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-2 border-t border-stone-50">
                        {renderPositionalStats(player)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderPositionalStats(player: Player) {
  const s = player.stats;
  const items: { label: string, value: string | number | undefined }[] = [];

  if (player.position === 'QB') {
    items.push({ label: 'Pass Yds', value: s.passingYards });
    items.push({ label: 'Pass TD', value: s.passingTds });
  } else if (player.position === 'RB') {
    items.push({ label: 'Rush Yds', value: s.rushingYards });
    items.push({ label: 'Rush TD', value: s.rushingTds });
  } else if (player.position === 'WR' || player.position === 'TE') {
    items.push({ label: 'Rec Yds', value: s.receivingYards });
    items.push({ label: 'Rec TD', value: s.receivingTds });
  } else if (['DL', 'LB', 'EDGE', 'CB', 'S'].includes(player.position)) {
    items.push({ label: 'Tackles', value: s.tackles });
    items.push({ label: 'TFL', value: s.tacklesForLoss });
    items.push({ label: 'Sacks', value: s.sacks });
    items.push({ label: 'Pressures', value: s.pressures });
    items.push({ label: 'INT', value: s.interceptions });
  } else if (player.position === 'K') {
    items.push({ label: 'FG Made', value: s.fgMade });
    items.push({ label: 'XP Made', value: s.xpMade });
    items.push({ label: 'Points', value: s.points });
  } else {
    items.push({ label: 'Games', value: s.gamesPlayed });
  }

  return items.map(item => (
    <div key={item.label}>
      <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
      <p className="text-xs font-black text-stone-900 font-mono tracking-tighter leading-none">{item.value || 0}</p>
    </div>
  ));
}

function StatLeaderCard({ title, players, statKey, statMode }: { 
  title: string, 
  players: Player[], 
  statKey: keyof PlayerStats,
  statMode: 'season' | 'career' 
}) {
  const { teams } = useLeague();
  
  return (
    <Card className="rounded-[2rem] border border-stone-100 shadow-xl overflow-hidden bg-white group/card hover:border-emerald-200 transition-all duration-500">
      <CardHeader className="bg-stone-50/30 pb-4 pt-6 px-6 border-b border-stone-100/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl -mr-12 -mt-12" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white rounded-xl shadow-lg shadow-stone-200/50 border border-stone-100 flex items-center justify-center group-hover/card:scale-110 transition-transform">
             <Target className="w-5 h-5 text-emerald-500" />
          </div>
          <CardTitle className="text-sm font-black text-stone-900 tracking-[0.1em] uppercase leading-none">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-stone-50">
          {players.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em]">Awaiting Metrics</p>
            </div>
          ) : players.map((player, idx) => {
            const team = teams.find(t => t.id === player.teamId);
            if (!team) return null;
            const stats = statMode === 'career' ? (player.careerStats || player.stats) : player.stats;
            const renderUrl = STUFFY_RENDER_MAP[team.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
            
            return (
              <div key={player.id} className="px-6 py-4 flex items-center justify-between hover:bg-emerald-50/30 transition-all group overflow-hidden relative">
                <div className="flex items-center gap-4 overflow-hidden relative z-10">
                  <span className="text-2xl font-black text-stone-100 w-8 shrink-0 group-hover:text-emerald-500/20 transition-colors italic tracking-tighter">#{idx + 1}</span>
                  
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white border-2 border-white shadow-xl relative overflow-hidden group-hover:scale-110 transition-all duration-500 shrink-0" 
                    style={{ backgroundColor: team.primaryColor }}
                  >
                    {team.logoUrl ? (
                      <Image src={team.logoUrl} fill className="object-cover" alt={team.name} />
                    ) : (
                      <div className="relative w-[135%] h-[135%] translate-y-2">
                        <Image src={renderUrl} fill className="object-contain drop-shadow-lg" alt={player.name} />
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0 pr-2">
                    <p className="font-black text-stone-900 text-sm leading-none mb-1.5 truncate uppercase tracking-tighter italic">{player.name}</p>
                    <div className="flex items-center gap-2">
                       <span className="px-1.5 py-0.5 rounded-md bg-stone-900 text-white text-[8px] font-black uppercase leading-none">{player.position}</span>
                       <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest truncate">{team.name}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 relative z-10">
                  <p className="text-lg font-black text-stone-900 leading-none italic tracking-tighter tabular-nums group-hover:text-emerald-500 transition-colors">{(stats[statKey] as number) || 0}</p>
                </div>
                
                {idx === 0 && (
                   <div className="absolute right-0 top-0 h-full w-24 bg-linear-to-l from-emerald-500/5 to-transparent pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
