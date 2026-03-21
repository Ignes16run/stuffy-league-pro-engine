// Last Updated: 2026-03-21T14:52:00-04:00
"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Trophy, Edit3, Search, ChevronDown, 
  ArrowUpRight, Star, Shield, Zap, Target,
  Camera, Save, X
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player, Team, PlayerStats } from '@/lib/league/types';
import { uploadFile } from '@/lib/supabase-client';

export default function RosterView() {
  const { teams, players, setPlayers, updatePlayer } = useLeague();
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | "all">("all");
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = selectedTeam === "all" || p.teamId === selectedTeam;
      return matchesSearch && matchesTeam;
    }).sort((a, b) => b.rating - a.rating);
  }, [players, search, selectedTeam]);

  const leaderboards = useMemo(() => {
    const getTop = (key: keyof PlayerStats) => 
      [...players].sort((a, b) => ((b.stats[key] || 0) as number) - ((a.stats[key] || 0) as number)).slice(0, 5);

    return {
      touchdowns: getTop('touchdowns'),
      yards: getTop('yards'),
      tackles: getTop('tackles'),
      interceptions: getTop('interceptions')
    };
  }, [players]);

  const getTeam = (teamId: string) => teams.find(t => t.id === teamId)!;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">League Roster</h2>
          <p className="text-stone-500 font-medium italic">Managing {players.length} stuffy athletes across {teams.length} teams</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input 
              placeholder="Search players..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-stone-100 bg-white"
            />
          </div>
          <select 
            className="h-10 px-4 rounded-xl border-stone-100 bg-white text-sm font-bold text-stone-600 outline-none focus:ring-2 ring-stone-900/5 transition-all"
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
        <TabsList className="bg-white/50 p-1.5 rounded-2xl border border-stone-100 h-auto gap-1">
          <TabsTrigger value="all" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest">
            <Users className="w-3.5 h-3.5 mr-2" />
            Personnel
          </TabsTrigger>
          <TabsTrigger value="leaders" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest">
            <Trophy className="w-3.5 h-3.5 mr-2" />
            Stat Leaders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredPlayers.map(player => (
                <PlayerCard 
                  key={player.id} 
                  player={player} 
                  team={getTeam(player.teamId)}
                  isEditing={editingPlayerId === player.id}
                  onEdit={() => setEditingPlayerId(player.id)}
                  onCancel={() => setEditingPlayerId(null)}
                  onUpdate={(updates) => {
                    updatePlayer(player.id, updates);
                    setEditingPlayerId(null);
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="leaders" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LeaderboardCard title="Touchdown Leaders" players={leaderboards.touchdowns} teams={teams} statKey="touchdowns" />
            <LeaderboardCard title="Yards Leaderboard" players={leaderboards.yards} teams={teams} statKey="yards" />
            <LeaderboardCard title="Defensive Tackles" players={leaderboards.tackles} teams={teams} statKey="tackles" />
            <LeaderboardCard title="Interceptions" players={leaderboards.interceptions} teams={teams} statKey="interceptions" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlayerCard({ player, team, isEditing, onEdit, onCancel, onUpdate }: { 
  player: Player, 
  team: Team, 
  isEditing: boolean, 
  onEdit: () => void, 
  onCancel: () => void, 
  onUpdate: (updates: Partial<Player>) => void 
}) {
  const { user } = useLeague();
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-100 group relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg border-2"
              style={{ backgroundColor: team.primaryColor, borderColor: team.secondaryColor }}
            >
              {isEditing ? (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              ) : null}
              {player.profilePicture ? (
                <img src={player.profilePicture} alt={player.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Users className="w-8 h-8 opacity-40" />
              )}
            </div>
            {isEditing ? (
              <Input 
                value={editData.rating}
                type="number"
                onChange={(e) => setEditData({ ...editData, rating: parseInt(e.target.value) || 0 })}
                className="absolute -bottom-2 -right-2 h-7 w-12 rounded-lg bg-stone-900 border-2 border-white px-1 text-[10px] font-black text-white text-center"
              />
            ) : (
              <Badge className="absolute -bottom-2 -right-2 h-7 min-w-[28px] rounded-lg bg-stone-900 border-2 border-white px-1.5 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-black">{player.rating}</span>
              </Badge>
            )}
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-stone-200">
                {player.position}
              </Badge>
              <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">{team.name}</span>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Input 
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="h-8 font-black text-lg p-1 rounded-lg border-stone-200"
                  placeholder="Player Name"
                />
                <div className="flex gap-2">
                  <Input 
                    value={editData.profilePicture}
                    onChange={(e) => setEditData({ ...editData, profilePicture: e.target.value })}
                    className="h-6 text-[10px] p-1 rounded-lg border-stone-100 flex-1"
                    placeholder="Profile Image URL"
                  />
                  <label className="cursor-pointer h-6 px-2 bg-stone-100 rounded-lg flex items-center justify-center hover:bg-stone-200 transition-colors">
                    <Camera className="w-3 h-3 text-stone-500" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && user) {
                          const url = await uploadFile(file, user.id, 'players');
                          if (url) {
                            setEditData({ ...editData, profilePicture: url });
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <h3 className="text-lg font-black text-stone-900 leading-tight">{player.name}</h3>
            )}
            {!isEditing && <p className="text-[10px] text-stone-400 font-medium italic">{player.archetype}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isEditing ? (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" onClick={() => onUpdate(editData)}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onClick={onCancel}>
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-stone-50 text-stone-400 hover:bg-stone-100" onClick={onEdit}>
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-stone-50 grid grid-cols-2 gap-4">
        {(isEditing ? editData.abilities : player.abilities).map((ability: any, idx: number) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">{ability.name}</span>
              {isEditing ? (
                <input 
                  type="number"
                  value={ability.value}
                  onChange={(e) => handleAbilityChange(idx, e.target.value)}
                  className="w-8 text-[10px] font-black text-stone-900 text-right bg-transparent outline-none"
                />
              ) : (
                <span className="text-[10px] font-black text-stone-900">{ability.value}</span>
              )}
            </div>
            <div className="h-1.5 w-full bg-stone-50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-stone-900 transition-all duration-1000" 
                style={{ width: `${ability.value}%`, backgroundColor: team.primaryColor }} 
              />
            </div>
          </div>
        ))}
      </div>

      {!isEditing && (
        <div className="mt-6 p-4 rounded-2xl bg-stone-50/50 border border-stone-50 flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-[8px] font-black text-stone-400 uppercase mb-1">TDs</p>
            <p className="text-sm font-black text-stone-900">{player.stats.touchdowns}</p>
          </div>
          <div className="w-px h-6 bg-stone-100" />
          <div className="text-center flex-1">
            <p className="text-[8px] font-black text-stone-400 uppercase mb-1">Yds</p>
            <p className="text-sm font-black text-stone-900">{player.stats.yards}</p>
          </div>
          <div className="w-px h-6 bg-stone-100" />
          <div className="text-center flex-1">
            <p className="text-[8px] font-black text-stone-400 uppercase mb-1">Tkl</p>
            <p className="text-sm font-black text-stone-900">{player.stats.tackles}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function LeaderboardCard({ title, players, teams, statKey }: { 
  title: string, 
  players: Player[], 
  teams: Team[], 
  statKey: keyof PlayerStats 
}) {
  return (
    <Card className="rounded-[2.5rem] border-stone-100 shadow-sm overflow-hidden">
      <CardHeader className="bg-stone-50/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-stone-100">
            {statKey === 'touchdowns' ? <Target className="w-5 h-5 text-emerald-500" /> :
             statKey === 'yards' ? <Zap className="w-5 h-5 text-amber-500" /> :
             statKey === 'tackles' ? <Shield className="w-5 h-5 text-blue-500" /> :
             <Star className="w-5 h-5 text-purple-500" />}
          </div>
          <CardTitle className="text-xl font-black text-stone-900">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-stone-50">
          {players.map((player: any, idx: number) => {
            const team = teams.find((t: any) => t.id === player.teamId)!;
            return (
              <div key={player.id} className="p-4 flex items-center justify-between hover:bg-stone-50/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-stone-200 group-hover:text-stone-300 transition-colors w-6">#{idx + 1}</span>
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs border-2 shadow-sm"
                    style={{ backgroundColor: team.primaryColor, borderColor: team.secondaryColor }}
                  >
                    {player.position}
                  </div>
                  <div>
                    <p className="font-black text-stone-900 text-sm">{player.name}</p>
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{team.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-stone-900">{player.stats[statKey]}</p>
                  <p className="text-[8px] font-black text-stone-400 uppercase">{statKey}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
