// Last Updated: 2026-03-23T03:30:00-04:00

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Users, Filter, SlidersHorizontal, Edit2, Shield, Zap, Award, Star
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_ICONS } from '@/lib/league/constants';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Player, Team } from '@/lib/league/types';
import { POSITION_RATINGS, calculateOVR } from '@/lib/league/ratings';

export default function RosterView() {
  const { teams, players, updatePlayer, bulkUpdatePlayers } = useLeague();
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = teamFilter === 'all' || p.teamId === teamFilter;
      return matchesSearch && matchesTeam;
    }).sort((a, b) => b.rating - a.rating);
  }, [players, search, teamFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">
      {/* Premium Search & Filter Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-stone-100 shadow-2xl shadow-stone-200/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                  <Users className="w-6 h-6 text-white" />
               </div>
               <div>
                  <h2 className="text-4xl font-black text-stone-900 uppercase tracking-tight leading-none">Personnel</h2>
                  <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Global Athlete Database</p>
               </div>
            </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <div className="relative group flex-1 min-w-[300px]">
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-emerald-500 transition-colors" />
             <Input 
                placeholder="Search athlete dossier..." 
                className="pl-14 h-16 rounded-2xl border-stone-100 bg-white/60 focus-visible:ring-emerald-500 transition-all font-bold text-stone-600 placeholder:text-stone-300 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-64 h-16 rounded-2xl border-stone-100 bg-white/60 font-black text-[10px] uppercase tracking-widest text-stone-500 focus:ring-emerald-500 shadow-sm">
               <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-emerald-500" />
                  <SelectValue placeholder="Filter Franchises" />
               </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-stone-100 shadow-2xl">
              <SelectItem value="all" className="font-black text-[10px] uppercase tracking-widest py-3">All Franchises</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id} className="font-black text-[10px] uppercase tracking-widest py-3">{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {teamFilter !== 'all' && (
            <BulkRatingEditor 
              teamId={teamFilter} 
              onApply={(updated) => bulkUpdatePlayers(updated.map(p => ({ id: p.id, updates: p })))} 
            />
          )}
        </div>
      </div>

      {/* Athlete Grid */}
      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
      >
        <AnimatePresence mode="popLayout">
          {filteredPlayers.map((player, idx) => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              team={teams.find(t => t.id === player.teamId)}
              index={idx}
              onEdit={() => setEditingPlayer(player)}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {editingPlayer && (
        <PlayerEditDialog 
          player={editingPlayer} 
          team={teams.find(t => t.id === editingPlayer.teamId)}
          onClose={() => setEditingPlayer(null)}
          onSave={(updated) => {
            updatePlayer(editingPlayer.id, updated);
            setEditingPlayer(null);
          }}
        />
      )}
    </div>
  );
}

function PlayerCard({ player, team, index, onEdit }: { player: Player, team: Team | undefined, index: number, onEdit: () => void }) {
  const TeamIcon = team ? (STUFFY_ICONS[team.icon as keyof typeof STUFFY_ICONS] || STUFFY_ICONS.TeddyBear) : STUFFY_ICONS.TeddyBear;
  const rating = player.rating;
  
  const getRatingColor = (v: number) => {
    if (v >= 90) return 'text-amber-500';
    if (v >= 80) return 'text-emerald-500';
    if (v >= 70) return 'text-stone-600';
    return 'text-stone-400';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.02, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -12, scale: 1.02 }}
      className="group relative"
      onClick={onEdit}
    >
      <Card 
        className="relative h-[420px] rounded-[3rem] border border-white/40 overflow-hidden bg-white/40 backdrop-blur-3xl shadow-2xl transition-all cursor-pointer ring-1 ring-stone-900/5 hover:ring-emerald-500/30"
        style={{ 
          boxShadow: team ? `0 30px 60px -20px ${team.primaryColor}25` : '0 20px 40px -15px rgba(0,0,0,0.05)'
        }}
      >
        {/* Background Visual Elements */}
        {team && (
           <div 
            className="absolute -bottom-12 -right-12 w-48 h-48 blur-[60px] opacity-[0.15] pointer-events-none transition-all duration-700 group-hover:opacity-40 group-hover:scale-125" 
            style={{ backgroundColor: team.primaryColor }} 
           />
        )}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/40 blur-[80px] -mr-20 -mt-20 pointer-events-none" />

        {/* Header: Identity & Rating */}
        <div className="p-8 pb-4 relative z-10 flex items-start justify-between">
            <div className="space-y-1">
               <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-stone-900 text-white border-0 text-[8px] font-black uppercase h-5 px-2 tracking-tighter">
                     {player.position}
                  </Badge>
                  {rating >= 90 && (
                    <div className="text-amber-500">
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                  )}
               </div>
               <h3 className="text-2xl font-black text-stone-900 leading-[1.1] group-hover:text-emerald-600 transition-colors uppercase tracking-tight break-words">
                  {player.name}
               </h3>
            </div>
            <div className={cn("text-5xl font-black tracking-tighter italic leading-none drop-shadow-sm", getRatingColor(rating))}>
               {rating}
            </div>
        </div>

        {/* Team Banner */}
        <div className="px-8 py-3 relative z-10">
           <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center border-2 border-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform duration-500"
                style={{ backgroundColor: team?.primaryColor || '#cbd5e1', borderColor: team?.secondaryColor || '#fff' }}
              >
                {player.profilePicture ? (
                  <img src={player.profilePicture} className="w-full h-full object-cover rounded-xl" alt={player.name} />
                ) : (
                  <TeamIcon className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex flex-col">
                 <span className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em]">{team?.name || 'Free Agent'}</span>
                 <span className="text-[8px] font-bold text-stone-300 uppercase tracking-widest">{player.archetype}</span>
              </div>
           </div>
        </div>

        {/* Ability Metrics */}
        <div className="p-8 pt-4 space-y-6 relative z-10">
           <div className="space-y-4">
              {player.abilities.slice(0, 3).map((ability, i) => (
                <div key={i} className="space-y-2">
                   <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.15em]">{ability.name}</span>
                      <span className="text-[10px] font-bold text-stone-700">{ability.value}</span>
                   </div>
                   <div className="h-2 bg-stone-100/50 rounded-full overflow-hidden border border-white/20">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${ability.value}%` }}
                        transition={{ duration: 1, delay: 0.2 + (i * 0.1) }}
                        className="h-full rounded-full shadow-inner shadow-black/5"
                        style={{ backgroundColor: team?.primaryColor || '#10b981' }}
                      />
                   </div>
                </div>
              ))}
           </div>
           
           <div className="pt-6 flex items-center justify-between border-t border-stone-100/50">
              <div className="flex items-center gap-2">
                 <div className="w-5 h-5 bg-stone-50 rounded-lg flex items-center justify-center">
                    <Shield className="w-3 h-3 text-stone-300" />
                 </div>
                 <span className="text-[10px] font-black text-stone-900 italic tracking-tighter">
                   #{player.jerseyNumber || (index + 10)}
                 </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-400 transition-all duration-500">
                 <Edit2 className="w-3 h-3 text-stone-400 group-hover:text-white transition-colors" />
              </div>
           </div>
        </div>
      </Card>
    </motion.div>
  );
}

function BulkRatingEditor({ teamId, onApply }: { teamId: string, onApply: (players: Player[]) => void }) {
  const { teams, players } = useLeague();
  const [isOpen, setIsOpen] = useState(false);
  const [targetPosition, setTargetPosition] = useState<string>("ALL");
  const [adjustment, setAdjustment] = useState<number>(0);
  const [categoryIndex, setCategoryIndex] = useState<number>(0);

  const team = teams.find(t => t.id === teamId)!;
  const teamPlayers = players.filter(p => p.teamId === teamId);
  const filteredPlayers = targetPosition === "ALL" 
    ? teamPlayers 
    : teamPlayers.filter(p => p.position === targetPosition);

  const positions = ["ALL", ...Array.from(new Set(teamPlayers.map(p => p.position)))];

  const handleApply = () => {
    const updated = filteredPlayers.map(p => {
       const nextAbilities = [...p.abilities];
       if (nextAbilities.length <= categoryIndex) return p;
       const nextAbility = { ...nextAbilities[categoryIndex] };
       nextAbility.value = Math.max(0, Math.min(99, nextAbility.value + adjustment));
       nextAbilities[categoryIndex] = nextAbility;
       return { ...p, abilities: nextAbilities, rating: calculateOVR(nextAbilities) };
    });
    onApply(updated);
    setIsOpen(false);
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="h-16 px-8 rounded-2xl border-stone-100 bg-white/60 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all font-black text-[10px] uppercase tracking-widest gap-3 shadow-sm group"
      >
        <SlidersHorizontal className="w-4 h-4 text-stone-300 group-hover:text-emerald-500" />
        Scouting Lab
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="rounded-[3rem] border-0 bg-white/95 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden sm:max-w-[500px]">
          <div className="h-32 bg-stone-900 p-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[60px] -mr-16 -mt-16" />
             <div className="relative z-10">
                <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight leading-none">Scouting Lab</DialogTitle>
                <p className="text-stone-400 font-bold uppercase text-[9px] tracking-[0.3em] mt-3">Advanced Franchise Calibration</p>
             </div>
          </div>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Target Group</Label>
                <Select value={targetPosition} onValueChange={setTargetPosition}>
                  <SelectTrigger className="h-14 rounded-2xl bg-stone-50 border-stone-100 font-bold text-stone-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-stone-100">
                    {positions.map(pos => <SelectItem key={pos} value={pos} className="font-bold">{pos === "ALL" ? "All Personnel" : `${pos} Core`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Attribute Focus</Label>
                <Select value={categoryIndex.toString()} onValueChange={(v) => setCategoryIndex(parseInt(v))}>
                  <SelectTrigger className="h-14 rounded-2xl bg-stone-50 border-stone-100 font-bold text-stone-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-stone-100">
                    <SelectItem value="0" className="font-bold">Primary Slot</SelectItem>
                    <SelectItem value="1" className="font-bold">Secondary Slot</SelectItem>
                    <SelectItem value="2" className="font-bold">Tertiary Slot</SelectItem>
                    <SelectItem value="3" className="font-bold">Auxiliary Slot</SelectItem>
                    <SelectItem value="4" className="font-bold">Support Slot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end mb-2">
                 <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Intensity Offset</Label>
                 <span className={cn("text-2xl font-black italic tracking-tighter", adjustment >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {adjustment > 0 ? `+${adjustment}` : adjustment}
                 </span>
              </div>
              <Input 
                type="range" min="-15" max="15" step="1" 
                value={adjustment} 
                onChange={(e) => setAdjustment(parseInt(e.target.value))}
                className="h-2 bg-stone-100 rounded-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100 space-y-4">
               <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Projection Summary</h4>
               </div>
               <p className="text-xs font-bold text-emerald-700 leading-relaxed italic">
                 Applying this philosophy will impact <span className="underline">{filteredPlayers.length}</span> athletes in the <span className="underline">{targetPosition}</span> cohort for the <span className="underline">{team.name}</span>.
               </p>
            </div>
          </div>
          <DialogFooter className="p-10 pt-0">
            <Button onClick={handleApply} className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/30 transition-all active:scale-[0.98]">
              Confirm Strategic Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlayerEditDialog({ player, team, onClose, onSave }: { player: Player, team: Team | undefined, onClose: () => void, onSave: (updated: Partial<Player>) => void }) {
  const [formData, setFormData] = useState({ ...player });
  const categories = POSITION_RATINGS[player.position] || [];

  const handleAbilityChange = (idx: number, val: string) => {
    const newVal = Math.min(99, Math.max(0, parseInt(val) || 0));
    const nextAbilities = [...formData.abilities];
    
    // Ensure we have enough ability slots
    while (nextAbilities.length < 5) {
      const cat = categories[nextAbilities.length];
      nextAbilities.push({ name: cat?.name || 'Rating', value: 60, description: cat?.description || '' });
    }
    
    nextAbilities[idx] = { ...nextAbilities[idx], value: newVal };
    const ovr = calculateOVR(nextAbilities);
    setFormData({ ...formData, abilities: nextAbilities, rating: ovr });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="rounded-[3rem] bg-white border-0 shadow-2xl p-0 overflow-hidden sm:max-w-[550px]">
        <div className="h-40 bg-stone-900 p-10 relative overflow-hidden">
           <div 
             className="absolute top-0 right-0 w-48 h-48 blur-[80px] opacity-20 pointer-events-none" 
             style={{ backgroundColor: team?.primaryColor || '#10b981' }} 
           />
           <div className="flex items-center gap-6 relative z-10">
              <div 
                className="w-20 h-20 rounded-[2rem] flex items-center justify-center border-4 border-white shadow-2xl"
                style={{ backgroundColor: team?.primaryColor }}
              >
                 <Trophy className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-1">
                 <DialogTitle className="text-3xl font-black text-white uppercase tracking-tight">{player.name}</DialogTitle>
                 <DialogDescription className="text-stone-400 font-black uppercase text-[9px] tracking-[0.3em]">Athlete ID Dossier</DialogDescription>
              </div>
           </div>
        </div>

        <div className="p-10 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Formal Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="h-14 rounded-2xl bg-stone-50 border-stone-100 font-bold" 
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Proficiency Rating (OVR)</Label>
              <div className="h-14 flex items-center justify-center rounded-2xl bg-stone-50 border border-stone-100 text-2xl font-black italic tracking-tighter text-emerald-500 shadow-inner">
                {formData.rating}
              </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-stone-300" />
                <h4 className="text-[10px] font-black text-stone-900 uppercase tracking-widest">Skill Calibration</h4>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
               {formData.abilities.slice(0, 5).map((ability, idx) => (
                 <div key={idx} className="space-y-3">
                   <div className="flex justify-between items-end">
                     <div className="flex flex-col">
                       <span className="text-[10px] font-black text-stone-800 uppercase tracking-tight">{ability.name}</span>
                       <span className="text-[8px] text-stone-400 font-bold uppercase tracking-tighter">{categories[idx]?.name || 'Specialty'}</span>
                     </div>
                     <input 
                       type="number"
                       value={ability.value}
                       onChange={(e) => handleAbilityChange(idx, e.target.value)}
                       className="w-12 text-lg font-black text-emerald-500 text-right bg-transparent border-b-2 border-stone-100 focus:border-emerald-500 outline-none transition-all"
                     />
                   </div>
                   <div className="h-2 w-full bg-stone-50 rounded-full overflow-hidden shadow-inner">
                     <motion.div 
                       layout
                       className="h-full rounded-full shadow-lg" 
                       style={{ width: `${ability.value}%`, backgroundColor: team?.primaryColor || '#10b981' }} 
                     />
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        <DialogFooter className="p-10 pt-0 bg-white shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)]">
          <div className="flex gap-4 w-full">
            <Button variant="ghost" onClick={onClose} className="flex-1 h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest text-stone-400 hover:bg-stone-50 transition-all">Cancel</Button>
            <Button 
                onClick={() => onSave(formData)} 
                className="flex-[2] h-16 rounded-2xl bg-stone-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-2xl shadow-stone-900/40 transition-all active:scale-[0.98]"
            >
              Update Dossier
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
