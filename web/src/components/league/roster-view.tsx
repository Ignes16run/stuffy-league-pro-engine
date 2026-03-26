// Last Updated: 2026-03-23T03:30:00-04:00

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, SlidersHorizontal, Edit2, Shield, Star, Trophy, Target
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { STUFFY_RENDER_MAP, PLAYER_SPECIFIC_RENDERS } from '@/lib/league/assetMap';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-stone-50/50 p-6 rounded-2xl border border-stone-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[120px] -mr-40 -mt-40 pointer-events-none" />
        
        <div className="flex flex-wrap items-center gap-4 relative z-10 w-full">
          <div className="relative group flex-1 min-w-[300px]">
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-emerald-500 transition-colors" />
             <Input 
                placeholder="Search database..." 
                className="pl-14 h-14 rounded-xl border-stone-100 bg-white/60 focus-visible:ring-emerald-500 transition-all font-bold text-stone-600 placeholder:text-stone-300 shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
             />
          </div>
          <Select value={teamFilter} onValueChange={(val) => setTeamFilter(val || 'all')}>
            <SelectTrigger className="w-64 h-14 rounded-xl border-stone-100 bg-white/60 font-black text-[10px] uppercase tracking-widest text-stone-500 focus:ring-emerald-500 shadow-sm">
               <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-emerald-500" />
                  <SelectValue placeholder="Filter Results" />
               </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-stone-100 shadow-lg">
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
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const baseRenderUrl = team ? STUFFY_RENDER_MAP[team.icon] : STUFFY_RENDER_MAP.TeddyBear;
  
  const getRenderUrl = () => {
    if (player.profilePicture) return player.profilePicture;
    let hash = 0;
    for (let i = 0; i < player.id.length; i++) hash = player.id.charCodeAt(i) + ((hash << 5) - hash);
    // 25% chance of having a specific profile picture for variety if available
    if ((Math.abs(hash) % 100) < 25 && PLAYER_SPECIFIC_RENDERS?.length > 0) {
       return PLAYER_SPECIFIC_RENDERS[Math.abs(hash) % PLAYER_SPECIFIC_RENDERS.length];
    }
    return baseRenderUrl;
  };
  const renderUrl = getRenderUrl();

  const rating = player.rating;

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width - 0.5;
    const y = (e.clientY - box.top) / box.height - 0.5;
    setRotate({ x: y * -15, y: x * 15 });
  };

  const onMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };
  
  const getRatingColor = (v: number) => {
    if (v >= 90) return 'text-amber-500';
    if (v >= 80) return 'text-emerald-500';
    if (v >= 70) return 'text-stone-800';
    return 'text-stone-400';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        rotateX: rotate.x,
        rotateY: rotate.y
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ 
        layout: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
        rotateX: { type: 'spring', stiffness: 300, damping: 20 },
        rotateY: { type: 'spring', stiffness: 300, damping: 20 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }}
      className="group relative perspective-1000"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onEdit}
    >
      <Card 
        className={cn(
          "relative h-[560px] rounded-[2.5rem] border-0 overflow-hidden bg-white hover:shadow-xl transition-all duration-700 cursor-pointer group/card",
          rating >= 90 ? "ring-2 ring-amber-400/20" : ""
        )}
        style={{ 
          boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)'
        }}
      >
        {/* Modern Sports Card Layout */}
        <div className="absolute inset-0 flex flex-col p-6">
          {/* Top Section: Team & Pos */}
          <div className="flex justify-between items-start z-10">
             <div className="space-y-1">
                <span className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em] block mb-1">Franchise</span>
                <p className="text-[12px] font-black text-stone-800 uppercase tracking-tighter italic truncate max-w-[130px]">
                   {team?.name || 'Unassigned'}
                </p>
             </div>
             <div className="text-right">
                <div className="bg-stone-900 text-white rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest inline-block mb-1">
                   {player.position}
                </div>
                <div className="flex gap-0.5 justify-end">
                   {[1,2,3].map(i => <Star key={i} className={cn("w-2 h-2", i <= (rating/20) ? "text-amber-400 fill-current" : "text-stone-200")} />)}
                </div>
             </div>
          </div>

          {/* Middle Section: Circular Stuffy Render */}
          <div className="flex-1 flex items-center justify-center relative my-2">
             {/* OVR Rating Backdrop */}
             <div className={cn(
               "absolute text-[9rem] font-black italic tracking-tighter leading-none opacity-[0.02] select-none",
               getRatingColor(rating)
             )}>
                {rating}
             </div>

             <div className="relative w-52 h-52 group-hover/card:scale-105 transition-transform duration-700">
                {/* Main Circular Mask */}
                <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg z-10 bg-stone-50">
                   <Image 
                     src={renderUrl} 
                     fill 
                     className="object-cover scale-150 translate-y-2" 
                     alt={player.name}
                     sizes="208px"
                   />
                </div>

                {/* Rating Badge Overlay */}
                <div className={cn(
                  "absolute -top-1 -right-1 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg z-20 border-2 border-white -rotate-12",
                  getRatingColor(rating).replace('text-', 'bg-')
                )}>
                   <span className="text-xl font-black text-white italic tracking-tighter leading-none">{rating}</span>
                </div>
             </div>
          </div>

          {/* Bottom Section: Name & Stats */}
          <div className="z-10 space-y-4">
             <div className="text-center group-hover/card:translate-y-[-2px] transition-transform duration-500">
                <h3 className="text-3xl font-black text-stone-900 leading-tight uppercase tracking-tighter italic truncate">
                   {player.name}
                </h3>
             </div>

             <div className="grid grid-cols-3 gap-2 py-3 px-2 bg-stone-50/50 backdrop-blur-md rounded-2xl border border-stone-100 shadow-sm">
                {player.abilities.slice(0, 3).map((ability, i) => (
                   <div key={i} className="flex flex-col items-center">
                      <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-0.5">{ability.name.slice(0, 3)}</span>
                      <span className="text-sm font-black text-stone-800 tabular-nums">{ability.value}</span>
                   </div>
                ))}
             </div>

             <div className="flex items-center justify-between px-1 pt-1">
                <div className="flex items-center gap-2">
                   <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200">
                      <Shield className="w-3 h-3 text-stone-400" />
                   </div>
                   <span className="text-[10px] font-black text-stone-400 italic">#{player.jerseyNumber || (index + 10)}</span>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[8px] font-black text-stone-300 uppercase tracking-widest opacity-0 group-hover/card:opacity-100 transition-opacity">Record</span>
                   <div className="w-9 h-9 rounded-full bg-stone-900 flex items-center justify-center shadow-lg hover:bg-emerald-500 transition-all duration-300">
                      <Edit2 className="w-3.5 h-3.5 text-white" />
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Gloss/Reflect Effect */}
        <div className="absolute inset-0 z-50 pointer-events-none bg-linear-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-700" />
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
        className="h-14 px-8 rounded-xl border-stone-100 bg-white/60 text-stone-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all font-black text-[10px] uppercase tracking-widest gap-3 shadow-sm group"
      >
        <SlidersHorizontal className="w-4 h-4 text-stone-300 group-hover:text-emerald-500" />
        Scouting Lab
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="rounded-4xl border-0 bg-white shadow-3xl p-0 overflow-hidden sm:max-w-[500px]">
          <div className="h-32 bg-stone-50 p-8 relative overflow-hidden border-b border-stone-100">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] -mr-16 -mt-16" />
             <div className="relative z-10">
                <DialogTitle className="text-2xl font-black text-stone-900 uppercase tracking-tighter leading-none italic">Scouting Lab</DialogTitle>
                <p className="text-emerald-600/60 font-black uppercase text-[9px] tracking-[0.4em] mt-3">Advanced Franchise Calibration</p>
             </div>
          </div>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Target Group</Label>
                <Select value={targetPosition} onValueChange={(val) => setTargetPosition(val || 'ALL')}>
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
                <Select value={categoryIndex.toString()} onValueChange={(v) => setCategoryIndex(parseInt(v || '0'))}>
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
      <DialogContent className="rounded-4xl bg-white border-0 shadow-3xl p-0 overflow-hidden sm:max-w-[550px]">
        <div className="h-40 bg-stone-50 p-10 relative overflow-hidden border-b border-stone-100">
           <div 
             className="absolute top-0 right-0 w-48 h-48 blur-[80px] opacity-10 pointer-events-none" 
             style={{ backgroundColor: team?.primaryColor || '#10b981' }} 
           />
           <div className="flex items-center gap-6 relative z-10">
              <div 
                className="w-20 h-20 rounded-3xl flex items-center justify-center border-4 border-white shadow-2xl bg-white"
                style={{ backgroundColor: team?.logoUrl ? 'white' : team?.primaryColor }}
              >
                 {team?.logoUrl ? (
                   <div className="relative w-full h-full p-4">
                     <Image src={team.logoUrl} fill className="object-contain" alt={team.name} sizes="80px" />
                   </div>
                 ) : (
                    <Trophy className="w-8 h-8 text-stone-400" />
                 )}
              </div>
              <div className="space-y-1">
                 <DialogTitle className="text-3xl font-black text-stone-900 uppercase tracking-tight leading-none">{player.name}</DialogTitle>
                 <DialogDescription className="text-emerald-600 font-black uppercase text-[9px] tracking-[0.3em]">Athlete ID Dossier</DialogDescription>
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
