"use client";
// Last Updated: 2026-03-22T16:05:00Z

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Trophy, Search, 
  Target, Camera, Award, UserCog,
  AlertTriangle, Settings2
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
import { calculateOVR, POSITION_RATINGS } from '@/lib/league/ratings';
import { POSITION_GROUPS, POSITION_CONFIGS } from '@/lib/league/position-system';

export default function RosterView() {
  const { teams, players, updatePlayer, bulkUpdatePlayers } = useLeague();
  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | "all">("all");
  const [statMode, setStatMode] = useState<'season' | 'career'>('season');

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = selectedTeam === "all" || p.teamId === selectedTeam;
      return matchesSearch && matchesTeam;
    }).sort((a, b) => b.rating - a.rating);
  }, [players, search, selectedTeam]);

  const qbStats = useMemo(() => {
    const qbs = players.filter(p => p.position === 'QB').map(p => ({
        ...p,
        displayStats: statMode === 'career' ? (p.careerStats || p.stats) : p.stats
     }));
    return {
      yards: calculatePlayerRankings(qbs.map(q => ({ ...q, stats: q.displayStats })), 'passingYards'),
      tds: calculatePlayerRankings(qbs.map(q => ({ ...q, stats: q.displayStats })), 'passingTds'),
      pct: calculatePlayerRankings(qbs.map(q => ({ ...q, stats: q.displayStats })), 'completionPct'),
      ints: calculatePlayerRankings(qbs.map(q => ({ ...q, stats: q.displayStats })), 'interceptionsThrown', 'low')
    };
  }, [players, statMode]);

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
      receptions: getTop('receptions', ['WR', 'TE']),
      tackles: getTop('tackles', ['DL', 'LB', 'EDGE', 'CB', 'S']),
      tacklesForLoss: getTop('tacklesForLoss', ['DL', 'LB', 'EDGE']),
      sacks: getTop('sacks', ['DL', 'LB', 'EDGE']),
      interceptions: getTop('interceptions', ['CB', 'S', 'LB']),
      passDeflections: getTop('passDeflections', ['CB', 'S'])
    };
  }, [players, statMode]);

  const getTeam = (teamId: string) => teams.find(t => t.id === teamId)!;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black text-stone-900 tracking-tight flex items-center gap-3">
             Personnel
            <Badge className="bg-stone-100 text-stone-600 border-none px-3 font-bold">{players.length}</Badge>
          </h2>
          <p className="text-stone-500 font-medium italic mt-1">Managing {players.length} stuffy athletes across {teams.length} teams</p>
        </div>
        
        <div className="flex items-center flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              placeholder="Filter names..." 
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

          {selectedTeam !== 'all' && (
            <BulkRatingEditor 
              teamId={selectedTeam} 
              onApply={(updatedPlayers) => {
                bulkUpdatePlayers(updatedPlayers.map(p => ({ id: p.id, updates: p })));
              }} 
            />
          )}

          <div className="flex bg-stone-100 p-1 rounded-[1.25rem] shadow-inner gap-0.5 ml-auto">
             <button 
               onClick={() => setStatMode('season')}
               className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all", statMode === 'season' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400")}
             >Season</button>
             <button 
               onClick={() => setStatMode('career')}
               className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all", statMode === 'career' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400")}
             >Career</button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-stone-100/50 p-1.5 rounded-2xl h-auto gap-1">
          <TabsTrigger value="all" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
            <Users className="w-3.5 h-3.5 mr-2" />
            Roster
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
                    statMode={statMode}
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

        <TabsContent value="leaders" className="mt-0 space-y-12 pb-12">
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-stone-900 border-b border-stone-200 pb-2">Offensive Leaders ({statMode})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <LeaderboardCard title="Passing Yards" players={leaderboards.passingYards} teams={teams} statKey="passingYards" statMode={statMode} />
              <LeaderboardCard title="Passing TDs" players={leaderboards.passingTds} teams={teams} statKey="passingTds" statMode={statMode} />
              <LeaderboardCard title="Rushing Yards" players={leaderboards.rushingYards} teams={teams} statKey="rushingYards" statMode={statMode} />
              <LeaderboardCard title="Rushing TDs" players={leaderboards.rushingTds} teams={teams} statKey="rushingTds" statMode={statMode} />
              <LeaderboardCard title="Receiving Yards" players={leaderboards.receivingYards} teams={teams} statKey="receivingYards" statMode={statMode} />
              <LeaderboardCard title="Receptions" players={leaderboards.receptions} teams={teams} statKey="receptions" statMode={statMode} />
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-black text-stone-900 border-b border-stone-200 pb-2">Defensive Leaders ({statMode})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <LeaderboardCard title="Total Tackles" players={leaderboards.tackles} teams={teams} statKey="tackles" statMode={statMode} />
              <LeaderboardCard title="Tackles for Loss" players={leaderboards.tacklesForLoss} teams={teams} statKey="tacklesForLoss" statMode={statMode} />
              <LeaderboardCard title="Sacks" players={leaderboards.sacks} teams={teams} statKey="sacks" statMode={statMode} />
              <LeaderboardCard title="Interceptions" players={leaderboards.interceptions} teams={teams} statKey="interceptions" statMode={statMode} />
              <LeaderboardCard title="Pass Deflections" players={leaderboards.passDeflections} teams={teams} statKey="passDeflections" statMode={statMode} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlayerCard({ player, team, rankings, statMode, onUpdate }: { 
  player: Player, 
  team: Team, 
  rankings?: Record<string, number>,
  statMode: 'season' | 'career',
  onUpdate: (updates: Partial<Player>) => void 
}) {
  const displayStats = statMode === 'career' ? (player.careerStats || player.stats) : player.stats;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-stone-100 group relative overflow-hidden hover:shadow-md transition-all duration-300"
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
            <h3 className="text-xl font-black text-stone-900 leading-tight">
              {player.jerseyNumber && <span className="text-stone-300 mr-1.5 font-bold">#{player.jerseyNumber}</span>}
              {player.name}
            </h3>
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

      <div className="mt-8 grid grid-cols-2 gap-4">
        {player.abilities.slice(0, 5).map((ability, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest truncate max-w-[80%]">{ability.name}</span>
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

      <div className="mt-8 pt-6 border-t border-stone-100 grid grid-cols-4 gap-2">
      {player.position === 'QB' ? (
        <>
          <StatBox label="P-Yds" value={displayStats.passingYards || 0} rank={rankings?.passingYards} />
          <StatBox label="P-TD" value={displayStats.passingTds || 0} rank={rankings?.passingTds} />
          <StatBox label="CMP%" value={displayStats.completionPct || 0} suffix="%" rank={rankings?.completionPct} />
          <StatBox label="GP" value={displayStats.gamesPlayed || 0} />
        </>
      ) : ['RB', 'WR', 'TE'].includes(player.position) ? (
        <>
          <StatBox label="Rec-Y" value={displayStats.receivingYards || 0} />
          <StatBox label="Rush-Y" value={displayStats.rushingYards || 0} />
          <StatBox label="TDs" value={(displayStats.receivingTds || 0) + (displayStats.rushingTds || 0)} />
          <StatBox label="GP" value={displayStats.gamesPlayed || 0} />
        </>
      ) : player.position === 'K' ? (
        <>
          <StatBox label="Points" value={displayStats.points || 0} />
          <StatBox label="FG%" value={85} suffix="%" /> {/* Placeholder for logic later */}
          <StatBox label="Long" value={52} />
          <StatBox label="GP" value={displayStats.gamesPlayed || 0} />
        </>
      ) : player.position === 'OL' ? (
        <>
          <StatBox label="Rating" value={player.rating} />
          <StatBox label="P-Blk" value={player.abilities[0]?.value || 0} />
          <StatBox label="R-Blk" value={player.abilities[1]?.value || 0} />
          <StatBox label="GP" value={displayStats.gamesPlayed || 0} />
        </>
      ) : (
        <>
          <StatBox label="Tkl" value={displayStats.tackles || 0} />
          <StatBox label="Sks" value={displayStats.sacks || 0} />
          <StatBox label="Int" value={displayStats.interceptions || 0} />
          <StatBox label="GP" value={displayStats.gamesPlayed || 0} />
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
          <Badge className={`h-4 min-w-[16px] px-1 text-[8px] border-none font-bold ${rank <= 3 ? 'bg-amber-400 text-white' : 'bg-stone-200 text-stone-600'}`}>
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
  trigger: React.ReactElement,
  onUpdate: (updates: Partial<Player>) => void 
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: player.name,
    rating: player.rating,
    jerseyNumber: player.jerseyNumber || "",
    profilePicture: player.profilePicture || "",
    abilities: [...player.abilities]
  });

  const ratingCategories = POSITION_RATINGS[player.position] || [];

  const handleAbilityChange = (idx: number, val: string) => {
    const newVal = Math.min(99, Math.max(0, parseInt(val) || 0));
    const nextAbilities = [...editData.abilities];
    
    // Safety check for category count
    if (nextAbilities.length < 5) {
      for (let i = nextAbilities.length; i < 5; i++) {
        const cat = ratingCategories[i];
        nextAbilities.push({ name: cat?.name || 'Rating', value: 60, description: cat?.description || '' });
      }
    }
    
    nextAbilities[idx] = { ...nextAbilities[idx], value: newVal };
    const ovr = calculateOVR(nextAbilities);
    setEditData({ ...editData, abilities: nextAbilities, rating: ovr });
  };

  const handleSave = () => {
    onUpdate({
      ...editData,
      rating: calculateOVR(editData.abilities)
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
          <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-stone-900 uppercase tracking-widest">
                <Award className="w-4 h-4" />
                Player Attributes
              </h4>
              <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-lg h-8 px-4">
                OVR: {editData.rating}
              </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {editData.abilities.slice(0, 5).map((ability, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-stone-600">{ability.name}</span>
                    <span className="text-[8px] text-stone-400 font-medium">{ratingCategories[idx]?.description}</span>
                  </div>
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

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-stone-50">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Full Name</label>
                <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="h-12 rounded-2xl bg-stone-50 border-none font-bold" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Jersey #</label>
                <Input value={editData.jerseyNumber} onChange={(e) => setEditData({ ...editData, jerseyNumber: e.target.value.slice(0,2) })} className="h-12 rounded-2xl bg-stone-50 border-none font-bold text-center" />
             </div>
          </div>
        </div>

        <DialogFooter className="p-8 pt-0 bg-white">
          <Button 
            className="w-full h-14 rounded-2xl bg-stone-900 text-white hover:bg-stone-800 font-black text-sm uppercase tracking-widest shadow-xl shadow-stone-900/20"
            onClick={handleSave}
          >
            Update Athlete Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkRatingEditor({ teamId, onApply }: { teamId: string, onApply: (players: Player[]) => void }) {
  const { teams, players } = useLeague();
  const [open, setOpen] = useState(false);
  const [targetPosition, setTargetPosition] = useState<string>("ALL");
  const [adjustment, setAdjustment] = useState<number>(0);
  const [categoryIndex, setCategoryIndex] = useState<number>(0);

  const team = teams.find(t => t.id === teamId)!;
  const teamPlayers = players.filter(p => p.teamId === teamId);
  const filteredPlayers = targetPosition === "ALL" 
    ? teamPlayers 
    : teamPlayers.filter(p => p.position === targetPosition);

  const previewPlayers = useMemo(() => {
    return filteredPlayers.map(p => {
      const nextAbilities = [...p.abilities];
      if (nextAbilities.length <= categoryIndex) return p;
      
      const nextAbility = { ...nextAbilities[categoryIndex] };
      nextAbility.value = Math.max(0, Math.min(99, nextAbility.value + adjustment));
      nextAbilities[categoryIndex] = nextAbility;
      
      return {
        ...p,
        abilities: nextAbilities,
        rating: calculateOVR(nextAbilities)
      };
    });
  }, [filteredPlayers, categoryIndex, adjustment]);

  const positions = ["ALL", ...Array.from(new Set(teamPlayers.map(p => p.position)))];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="h-12 px-6 rounded-2xl border-none bg-stone-100/50 text-stone-600 font-black text-[10px] uppercase tracking-widest gap-2">
          <Settings2 className="w-4 h-4" />
          Bulk
        </Button>
      } />
      <DialogContent className="max-w-2xl rounded-[3rem] p-0 border-none shadow-2xl overflow-hidden">
        <div className="bg-emerald-600 p-8 text-white">
          <DialogTitle className="text-2xl font-black">Bulk Adjuster: {team.name}</DialogTitle>
          <DialogDescription className="text-emerald-100">Apply relative changes to multiple athletes at once.</DialogDescription>
        </div>

        <div className="p-8 space-y-8 bg-white max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Position Group</label>
              <select value={targetPosition} onChange={(e) => setTargetPosition(e.target.value)} className="w-full h-12 rounded-2xl bg-stone-50 border-none px-4 font-bold outline-none">
                {positions.map(pos => <option key={pos} value={pos}>{pos === "ALL" ? "All Players" : `${pos}s`}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Attribute Slot</label>
              <select value={categoryIndex} onChange={(e) => setCategoryIndex(parseInt(e.target.value))} className="w-full h-12 rounded-2xl bg-stone-50 border-none px-4 font-bold outline-none">
                <option value={0}>Slot 1 (Prime)</option>
                <option value={1}>Slot 2</option>
                <option value={2}>Slot 3</option>
                <option value={3}>Slot 4</option>
                <option value={4}>Slot 5 (Base)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Adjustment ({adjustment > 0 ? '+' : ''}{adjustment})</label>
             <input type="range" min="-20" max="20" value={adjustment} onChange={(e) => setAdjustment(parseInt(e.target.value))} className="w-full h-2 bg-stone-100 rounded-full accent-emerald-500" />
          </div>

          <div className="space-y-3">
             <h4 className="text-[10px] font-black text-stone-900 uppercase tracking-widest flex items-center gap-2">
               <AlertTriangle className="w-4 h-4 text-amber-500" /> Preview Changes
             </h4>
             <div className="border border-stone-100 rounded-2xl p-4 bg-stone-50/50 space-y-2">
                {previewPlayers.slice(0, 4).map(p => {
                  const original = teamPlayers.find(op => op.id === p.id)!;
                  return (
                    <div key={p.id} className="flex justify-between text-xs font-bold">
                      <span className="text-stone-500">{p.name} ({p.position})</span>
                      <span className="text-stone-900">{original.rating} → {p.rating}</span>
                    </div>
                  );
                })}
                <p className="text-[10px] text-stone-300 italic text-center pt-1">Targeting {previewPlayers.length} athletes</p>
             </div>
          </div>
        </div>

        <DialogFooter className="p-8 pt-0">
           <Button className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-black uppercase text-xs" onClick={() => { onApply(previewPlayers); setOpen(false); }}>
              Apply Adjustments
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaderboardCard({ title, players, teams, statKey, statMode }: { 
  title: string, 
  players: Player[], 
  teams: Team[], 
  statKey: keyof PlayerStats,
  statMode: 'season' | 'career'
}) {
  return (
    <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
      <CardHeader className="bg-stone-50/50 pb-6 pt-8 px-8 border-b border-stone-100/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100">
             <Target className="w-6 h-6 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl font-black text-stone-900 tracking-tight">{title}</CardTitle>
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
                  <span className="text-2xl font-black text-stone-200 w-10">#{idx + 1}</span>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[10px] font-black border-2" style={{ backgroundColor: team.primaryColor, borderColor: team.secondaryColor }}>
                    {player.position}
                  </div>
                  <div>
                    <p className="font-black text-stone-900 text-base">{player.name}</p>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{team.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-stone-900 leading-none">{(stats[statKey] as number) || 0}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
