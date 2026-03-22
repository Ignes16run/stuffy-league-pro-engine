// Last Updated: 2026-03-22T10:15:00Z
"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Trophy, Search, 
  Star, Shield, Zap, Target,
  Camera, Save, Award, UserCog
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, CardContent, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Player, Team, PlayerStats } from '@/lib/league/types';
import { uploadFile } from '@/lib/supabase-client';
import { calculatePlayerRankings } from '@/lib/league/utils';

export default function RosterView() {
  const { teams, players, updatePlayer } = useLeague();
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | "all">("all");

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = selectedTeam === "all" || p.teamId === selectedTeam;
      return matchesSearch && matchesTeam;
    }).sort((a, b) => b.rating - a.rating);
  }, [players, search, selectedTeam]);

  // Dynamic QB Rankings
  const qbStats = useMemo(() => {
    const qbs = players.filter(p => p.position === 'QB');
    return {
      yards: calculatePlayerRankings(qbs, 'passingYards'),
      tds: calculatePlayerRankings(qbs, 'passingTds'),
      pct: calculatePlayerRankings(qbs, 'completionPct'),
      ints: calculatePlayerRankings(qbs, 'interceptionsThrown', 'low')
    };
  }, [players]);

  const leaderboards = useMemo(() => {
    const getTop = (key: keyof PlayerStats) => 
      [...players].sort((a, b) => ((b.stats[key] || 0) as number) - ((a.stats[key] || 0) as number)).slice(0, 5);

    return {
      touchdowns: getTop('touchdowns'),
      yards: getTop('yards'),
      tackles: getTop('tackles'),
      interceptions: getTop('interceptions'),
      points: getTop('points'),
      sacks: getTop('sacks')
    };
  }, [players]);

  const getTeam = (teamId: string) => teams.find(t => t.id === teamId)!;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            League Roster
            <Badge className="bg-stone-100 text-stone-600 border-none px-3 font-bold">{players.length}</Badge>
          </h2>
          <p className="text-stone-500 font-medium italic mt-1">Managing {players.length} stuffy athletes across {teams.length} teams</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              placeholder="Search players..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-12 rounded-2xl border-none bg-stone-100/50 text-sm font-bold focus:ring-2 ring-stone-900/5 outline-none transition-all"
            />
          </div>
          <select 
            className="h-12 px-4 rounded-2xl border-none bg-stone-100/50 text-sm font-bold text-stone-600 outline-none focus:ring-2 ring-stone-900/5 transition-all cursor-pointer"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            <option value="all">All Teams</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-stone-100/50 p-1.5 rounded-2xl h-auto gap-1">
          <TabsTrigger value="all" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            <Users className="w-3.5 h-3.5 mr-2" />
            Personnel
          </TabsTrigger>
          <TabsTrigger value="leaders" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            <Trophy className="w-3.5 h-3.5 mr-2" />
            Stat Leaders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredPlayers.map(player => {
                const team = getTeam(player.teamId);
                if (!team) return null;
                return (
                  <PlayerCard 
                    key={player.id} 
                    player={player} 
                    team={team}
                    rankings={player.position === 'QB' ? {
                      passingYards: qbStats.yards[player.id],
                      passingTds: qbStats.tds[player.id],
                      completionPct: qbStats.pct[player.id],
                      interceptionsThrown: qbStats.ints[player.id]
                    } : undefined}
                    onUpdate={(updates) => updatePlayer(player.id, updates)}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="leaders" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <LeaderboardCard title="Touchdown Leaders" players={leaderboards.touchdowns} teams={teams} statKey="touchdowns" />
            <LeaderboardCard title="Yards Leaderboard" players={leaderboards.yards} teams={teams} statKey="yards" />
            <LeaderboardCard title="Scoring Leaders" players={leaderboards.points} teams={teams} statKey="points" />
            <LeaderboardCard title="Defensive Tackles" players={leaderboards.tackles} teams={teams} statKey="tackles" />
            <LeaderboardCard title="Sack Masters" players={leaderboards.sacks} teams={teams} statKey="sacks" />
            <LeaderboardCard title="Interceptions" players={leaderboards.interceptions} teams={teams} statKey="interceptions" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlayerCard({ player, team, rankings, onUpdate }: { 
  player: Player, 
  team: Team, 
  rankings?: Record<string, number>,
  onUpdate: (updates: Partial<Player>) => void 
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 group relative overflow-hidden hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg border-2 overflow-hidden"
              style={{ backgroundColor: team.primaryColor, borderColor: team.secondaryColor }}
            >
              {player.profilePicture ? (
                <img src={player.profilePicture} alt={player.name} className="w-full h-full object-cover" />
              ) : (
                <Users className="w-8 h-8 opacity-40" />
              )}
            </div>
            <Badge className="absolute -bottom-2 -right-2 h-7 min-w-[28px] rounded-lg bg-stone-900 border-2 border-white px-1.5 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black">{player.rating}</span>
            </Badge>
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-stone-200">
                {player.position}
              </Badge>
              <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">{team.name}</span>
            </div>
            <h3 className="text-xl font-black text-stone-900 leading-tight">{player.name}</h3>
            <p className="text-[10px] text-stone-400 font-medium italic">{player.archetype}</p>
          </div>
        </div>

        <PlayerEditModal 
          player={player} 
          team={team} 
          onUpdate={onUpdate}
          trigger={
            <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-stone-50 text-stone-400 hover:bg-stone-900 hover:text-white">
              <UserCog className="w-5 h-5" />
            </Button>
          }
        />
      </div>

      {/* Primary Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        {player.abilities.map((ability, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{ability.name}</span>
              <span className="text-[10px] font-black text-stone-900">{ability.value}</span>
            </div>
            <div className="h-1.5 w-full bg-stone-100/50 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${ability.value}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full" 
                style={{ backgroundColor: team.primaryColor }} 
              />
            </div>
          </div>
        ))}
      </div>

      {/* Season Stats Summary */}
      <div className="mt-8 pt-6 border-t border-stone-100 grid grid-cols-4 gap-2">
      {player.position === 'QB' ? (
        <>
          <StatBox label="P-Yds" value={player.stats.passingYards || 0} rank={rankings?.passingYards} />
          <StatBox label="P-TD" value={player.stats.passingTds || 0} rank={rankings?.passingTds} />
          <StatBox label="CMP%" value={player.stats.completionPct || 0} suffix="%" rank={rankings?.completionPct} />
          <StatBox label="INT" value={player.stats.interceptionsThrown || 0} rank={rankings?.interceptionsThrown} />
        </>
      ) : ['RB', 'WR', 'TE'].includes(player.position) ? (
        <>
          <StatBox label="TDs" value={player.stats.touchdowns || 0} />
          <StatBox label="Yds" value={player.stats.yards || 0} />
          <StatBox label="Pts" value={player.stats.points || 0} />
          <StatBox label="GP" value={player.stats.gamesPlayed || 0} />
        </>
      ) : (
        <>
          <StatBox label="Tkl" value={player.stats.tackles || 0} />
          <StatBox label="Int" value={player.stats.interceptions || 0} />
          <StatBox label="Sks" value={player.stats.sacks || 0} />
          <StatBox label="GP" value={player.stats.gamesPlayed || 0} />
        </>
      )}
      </div>
    </motion.div>
  );
}

function StatBox({ label, value, rank, suffix = "" }: { label: string, value: number, rank?: number, suffix?: string }) {
  return (
    <div className="text-center group/stat relative px-2 py-3 rounded-2xl hover:bg-stone-50 transition-colors">
      <p className="text-[8px] font-black text-stone-400 uppercase mb-1 tracking-wider">{label}</p>
      <p className="text-sm font-black text-stone-900 leading-none">
        {value}{suffix}
      </p>
      {rank && (
        <div className="absolute -top-1 -right-1">
          <Badge className={`h-4 min-w-[16px] px-1 text-[8px] border-none font-bold ${rank <= 3 ? 'bg-amber-400' : 'bg-stone-200 text-stone-600'}`}>
             #{rank}
          </Badge>
        </div>
      )}
    </div>
  );
}

function PlayerEditModal({ player, team, trigger, onUpdate }: { 
  player: Player, 
  team: Team, 
  trigger: React.ReactNode,
  onUpdate: (updates: Partial<Player>) => void 
}) {
  const { user } = useLeague();
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: player.name,
    rating: player.rating,
    profilePicture: player.profilePicture || "",
    abilities: [...player.abilities]
  });

  const handleAbilityChange = (idx: number, val: string) => {
    const newVal = Math.min(99, Math.max(0, parseInt(val) || 0));
    const nextAbilities = [...editData.abilities];
    nextAbilities[idx] = { ...nextAbilities[idx], value: newVal };
    setEditData({ ...editData, abilities: nextAbilities });
  };

  const handleSave = () => {
    onUpdate({
      ...editData,
      rating: Math.round(editData.abilities.reduce((acc, a) => acc + a.value, 0) / editData.abilities.length)
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-xl rounded-[2.5rem] border-none p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 bg-stone-900 text-white">
          <div className="flex items-center gap-6">
            <div 
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl border-4 overflow-hidden relative group"
              style={{ backgroundColor: team.primaryColor, borderColor: team.secondaryColor }}
            >
              {editData.profilePicture ? (
                <img src={editData.profilePicture} alt={editData.name} className="w-full h-full object-cover" />
              ) : (
                <Users className="w-10 h-10 opacity-40" />
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="w-6 h-6" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && user) {
                      const url = await uploadFile(file, user.id, 'players');
                      if (url) setEditData({ ...editData, profilePicture: url });
                    }
                  }}
                />
              </label>
            </div>
            <div>
              <DialogTitle className="text-3xl font-black tracking-tight">{player.name}</DialogTitle>
              <DialogDescription className="text-stone-400 font-medium flex items-center gap-2 mt-1">
                <Badge className="bg-white/10 text-white border-none px-2 py-0 h-5 text-[10px] font-black">{player.position}</Badge>
                {team.name} • {player.archetype}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 bg-white">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Full Name</label>
              <Input 
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="h-12 rounded-2xl bg-stone-50 border-none font-bold focus:ring-2 ring-stone-900/5 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Profile Photo URL</label>
              <Input 
                value={editData.profilePicture}
                onChange={(e) => setEditData({ ...editData, profilePicture: e.target.value })}
                className="h-12 rounded-2xl bg-stone-50 border-none font-bold focus:ring-2 ring-stone-900/5 transition-all"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="flex items-center gap-2 text-[10px] font-black text-stone-900 uppercase tracking-widest">
              <Award className="w-4 h-4" />
              Main Attributes
            </h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {editData.abilities.map((ability, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-stone-600">{ability.name}</span>
                    <input 
                      type="number"
                      value={ability.value}
                      onChange={(e) => handleAbilityChange(idx, e.target.value)}
                      className="w-10 text-sm font-black text-stone-900 text-right bg-transparent border-b border-stone-200 focus:border-stone-900 outline-none transition-colors"
                    />
                  </div>
                  <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                    <motion.div 
                      layout
                      className="h-full rounded-full" 
                      style={{ width: `${ability.value}%`, backgroundColor: team.primaryColor }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 pt-0 bg-white">
          <Button 
            className="w-full h-14 rounded-2xl bg-stone-900 text-white hover:bg-stone-800 font-black text-sm uppercase tracking-widest shadow-xl shadow-stone-900/20"
            onClick={handleSave}
          >
            <Save className="w-4 h-4 mr-2" />
            Update Athlete Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaderboardCard({ title, players, teams, statKey }: { 
  title: string, 
  players: Player[], 
  teams: Team[], 
  statKey: keyof PlayerStats 
}) {
  return (
    <Card className="rounded-[2.5rem] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden group">
      <CardHeader className="bg-stone-50/50 pb-6 pt-8 px-8 border-b border-stone-100/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100 group-hover:scale-110 transition-transform">
            {statKey === 'touchdowns' ? <Target className="w-6 h-6 text-emerald-500" /> :
             statKey === 'yards' ? <Zap className="w-6 h-6 text-amber-500" /> :
             statKey === 'tackles' ? <Shield className="w-6 h-6 text-blue-500" /> :
             statKey === 'sacks' ? <Zap className="w-6 h-6 text-orange-500" /> :
             statKey === 'points' ? <Trophy className="w-6 h-6 text-indigo-500" /> :
             <Star className="w-6 h-6 text-purple-500" />}
          </div>
          <CardTitle className="text-2xl font-black text-stone-900 tracking-tight">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-stone-50">
          {players.map((player, idx) => {
            const team = teams.find(t => t.id === player.teamId);
            if (!team) return null;
            return (
              <div key={player.id} className="px-8 py-5 flex items-center justify-between hover:bg-stone-50/50 transition-colors group/item">
                <div className="flex items-center gap-5">
                  <span className="text-2xl font-black text-stone-200 group-hover/item:text-stone-300 transition-colors w-10">#{idx + 1}</span>
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[10px] font-black border-2 shadow-sm shrink-0"
                    style={{ backgroundColor: team.primaryColor, borderColor: team.secondaryColor }}
                  >
                    {player.position}
                  </div>
                  <div>
                    <p className="font-black text-stone-900 text-base">{player.name}</p>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.15em]">{team.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-stone-900 leading-none">
                    {(player.stats[statKey] as number) || 0}
                  </p>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1 opacity-60">{statKey}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
