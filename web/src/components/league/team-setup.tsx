// Last Updated: 2026-03-22T20:30:00-04:00

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Upload, Trash2, RefreshCw, Settings, Sliders, LayoutGrid
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { useAuth } from '@/context/auth-context';
import { Team, StuffyIcon } from '@/lib/league/types';
import { ICON_OPTIONS, DEFAULT_COLORS } from '@/lib/league/constants';
import { STUFFY_RENDER_MAP } from '@/lib/league/assetMap';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { uploadFile } from '@/lib/supabase-client';

export default function TeamSetup() {
  const { teams, addTeam, updateTeam, deleteTeam, addDefaultTeams } = useLeague();
  const { user } = useAuth();
  
  const [newTeam, setNewTeam] = useState<Partial<Team>>({
    name: '',
    icon: 'TeddyBear',
    primaryColor: DEFAULT_COLORS[0],
    secondaryColor: DEFAULT_COLORS[1],
    offenseRating: 75,
    defenseRating: 75,
    specialTeamsRating: 75,
  });

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [isBulkStatsOpen, setIsBulkStatsOpen] = useState(false);
  const [isBulkNamesOpen, setIsBulkNamesOpen] = useState(false);
  const [bulkNamesText, setBulkNamesText] = useState('');


  const handleAddOrUpdate = () => {
    if (!newTeam.name) return;
    
    if (editingTeamId) {
      updateTeam(editingTeamId, {
        name: newTeam.name!,
        icon: newTeam.icon as StuffyIcon,
        primaryColor: newTeam.primaryColor,
        secondaryColor: newTeam.secondaryColor,
        logoUrl: newTeam.logoUrl,
        offenseRating: newTeam.offenseRating || 75,
        defenseRating: newTeam.defenseRating || 75,
        specialTeamsRating: newTeam.specialTeamsRating || 75,
      });
      setEditingTeamId(null);
    } else {
      const team: Omit<Team, 'id'> = {
        name: newTeam.name!,
        icon: newTeam.icon as StuffyIcon,
        primaryColor: newTeam.primaryColor!,
        secondaryColor: newTeam.secondaryColor!,
        logoUrl: newTeam.logoUrl,
        offenseRating: newTeam.offenseRating || 75,
        defenseRating: newTeam.defenseRating || 75,
        specialTeamsRating: newTeam.specialTeamsRating || 75,
        stuffyPoints: 0,
        allTimeWins: 0,
        championships: 0
      };
      addTeam(team);
    }
    
    setNewTeam({ 
      name: '', 
      icon: 'TeddyBear', 
      primaryColor: DEFAULT_COLORS[0], 
      secondaryColor: DEFAULT_COLORS[1], 
      offenseRating: 75,
      defenseRating: 75,
      specialTeamsRating: 75,
    });
  };

  const editTeam = (team: Team) => {
    setNewTeam({
      name: team.name,
      icon: team.icon,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      logoUrl: team.logoUrl,
      offenseRating: team.offenseRating,
      defenseRating: team.defenseRating,
      specialTeamsRating: team.specialTeamsRating,
    });
    setEditingTeamId(team.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBulkAdd = () => {
    const names = bulkNamesText.split('\n').filter(n => n.trim().length > 0);
    names.forEach(name => {
      addTeam({
        name: name.trim(),
        icon: ICON_OPTIONS[Math.floor(Math.random() * ICON_OPTIONS.length)] as StuffyIcon,
        primaryColor: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
        secondaryColor: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
        offenseRating: 75,
        defenseRating: 75,
        specialTeamsRating: 75,
        stuffyPoints: 0,
        allTimeWins: 0,
        championships: 0
      });
    });
    setBulkNamesText('');
    setIsBulkNamesOpen(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const url = await uploadFile(file, user.id, 'teams');
      if (url) {
        setNewTeam({ ...newTeam, logoUrl: url });
      }
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto relative">
      <AnimatePresence>
        {isBulkNamesOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-lg border border-stone-100"
            >
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter mb-2 italic">Bulk Recruit Node</h3>
              <p className="text-[10px] text-stone-400 mb-6 font-black uppercase tracking-widest">Auto-generate franchise entities</p>
              <textarea 
                value={bulkNamesText}
                onChange={(e) => setBulkNamesText(e.target.value)}
                placeholder="Maine State&#10;Mercadona College&#10;Velvet Grizzlies..."
                className="w-full h-48 rounded-2xl bg-stone-50 border-2 border-stone-100 p-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-stone-300"
              />
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setIsBulkNamesOpen(false)} className="flex-1 h-12 rounded-xl">Cancel</Button>
                <Button onClick={handleBulkAdd} className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px]">Deploy Roster</Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isBulkStatsOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-lg border border-stone-100 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 pb-2">
                <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter mb-2 italic">Power Balance Matrix</h3>
                <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">Real-time stat recalibration</p>
              </div>
              
              <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4">
                {teams.map(team => (
                  <div key={team.id} className="grid grid-cols-4 gap-4 items-center bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <span className="font-black text-stone-900 text-xs truncate">{team.name}</span>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-stone-400">OFF</p>
                      <input 
                        type="number" value={team.offenseRating} 
                        onChange={(e) => updateTeam(team.id, { offenseRating: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent font-bold text-stone-600 text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-stone-400">DEF</p>
                      <input 
                        type="number" value={team.defenseRating} 
                        onChange={(e) => updateTeam(team.id, { defenseRating: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent font-bold text-stone-600 text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black uppercase text-stone-400">SPC</p>
                      <input 
                        type="number" value={team.specialTeamsRating} 
                        onChange={(e) => updateTeam(team.id, { specialTeamsRating: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent font-bold text-stone-600 text-sm outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 pt-4">
                <Button onClick={() => setIsBulkStatsOpen(false)} className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px]">Save & Finalize</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Card className="rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-stone-50/50">
          <div>
            <CardTitle className="text-xl font-black text-stone-900 flex items-center gap-3 uppercase tracking-tighter italic leading-none">
              {editingTeamId ? <RefreshCw className="text-indigo-500 w-5 h-5" /> : <Plus className="text-emerald-500 w-5 h-5" />}
              {editingTeamId ? 'Update Roster' : 'Recruit Franchise'}
            </CardTitle>
            <CardDescription className="text-stone-400 mt-2 text-[10px] font-black uppercase tracking-widest">
              {editingTeamId ? 'Refine identity & visual assets' : 'Initialize global team parameters'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsBulkStatsOpen(true)}>
              <Sliders className="w-4 h-4 mr-2" /> Stats
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsBulkNamesOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Bulk
            </Button>
            {editingTeamId && (
              <Button variant="ghost" size="sm" onClick={() => { setEditingTeamId(null); setNewTeam({}); }}>
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-stone-400">Team Name</label>
                <Input
                  value={newTeam.name}
                  onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="e.g. The Velvet Grizzlies"
                  className="rounded-2xl h-14 bg-stone-50 text-lg font-bold"
                />
              </div>

              {/* Icon / Color Identity Pickers would go here... Simplified for porting logic first */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase text-stone-400">Select Icon</label>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-4">
                  {ICON_OPTIONS.map(icon => {
                    const renderUrl = STUFFY_RENDER_MAP[icon as StuffyIcon];
                    return (
                      <button
                        key={icon}
                        onClick={() => setNewTeam({ ...newTeam, icon })}
                        className={cn(
                          "relative aspect-square rounded-xl border transition-all p-2 overflow-hidden",
                          newTeam.icon === icon ? "border-emerald-500 bg-emerald-50/50 shadow-sm" : "border-stone-100 bg-stone-50/20 hover:border-stone-200"
                        )}
                      >
                        <div className="relative w-full h-full">
                           <Image src={renderUrl} fill className="object-contain" alt={icon} sizes="64px" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-stone-400">Primary Color</label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.slice(0, 16).map(color => (
                        <button 
                          key={color} 
                          className={cn("w-8 h-8 rounded-full border-2", newTeam.primaryColor === color ? "border-stone-900" : "border-white")}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTeam({...newTeam, primaryColor: color})}
                        />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-stone-400">Secondary Color</label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.slice(0, 16).map(color => (
                        <button 
                          key={color} 
                          className={cn("w-8 h-8 rounded-full border-2", newTeam.secondaryColor === color ? "border-stone-900" : "border-white")}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTeam({...newTeam, secondaryColor: color})}
                        />
                    ))}
                  </div>
                </div>
              </div>
            </div>

             {/* Live Broadcast Preview Card */}
             <div className="space-y-4 flex flex-col items-center">
                <label className="text-[10px] font-black uppercase text-stone-400 w-full tracking-widest">Live Broadcast Preview</label>

                {/* Broadcast Preview */}
                <motion.div
                  layout
                  className="w-full rounded-2xl overflow-hidden border border-stone-900 shadow-2xl bg-[#1e1f26] relative"
                >
                  {/* Ambient glow from primary color */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-500"
                    style={{ background: `radial-gradient(circle at center, ${newTeam.primaryColor || '#10b981'} 0%, transparent 70%)` }}
                  />

                  {/* Mini score header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 relative z-10">
                    <div className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30">Stuffy League Network</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Live</span>
                    </div>
                  </div>

                  {/* Mascot + team identity */}
                  <div className="flex flex-col items-center py-8 px-6 gap-4 relative z-10">
                    <motion.div
                      layout
                      key={newTeam.icon}
                      initial={{ scale: 0.8, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="w-28 h-28 rounded-full flex items-center justify-center border-2 shadow-xl relative overflow-hidden"
                      style={{
                        borderColor: newTeam.primaryColor || '#10b981',
                        boxShadow: `0 0 40px ${newTeam.primaryColor || '#10b981'}44`,
                        backgroundColor: `${newTeam.primaryColor || '#10b981'}22`,
                      }}
                    >
                      {newTeam.logoUrl ? (
                        <Image src={newTeam.logoUrl} fill className="object-cover scale-105" alt="preview" sizes="112px" />
                      ) : (
                        <div className="relative w-[90%] h-[90%] translate-y-2">
                          <Image
                            src={STUFFY_RENDER_MAP[newTeam.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear}
                            fill className="object-contain drop-shadow-2xl"
                            alt="mascot preview"
                            sizes="100px"
                          />
                        </div>
                      )}
                    </motion.div>

                    {/* Team name */}
                    <div className="text-center space-y-1">
                      <motion.h3
                        layout
                        className="text-sm font-black uppercase tracking-tight text-white leading-tight"
                        style={{ color: newTeam.primaryColor || '#10b981' }}
                      >
                        {newTeam.name || 'YOUR TEAM NAME'}
                      </motion.h3>
                      <div className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">
                        {newTeam.icon || 'TeddyBear'}
                      </div>
                    </div>

                    {/* Color swatches */}
                    <div className="flex gap-2">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white/20 shadow-lg"
                        style={{ backgroundColor: newTeam.primaryColor || '#10b981' }}
                        title="Primary"
                      />
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white/20 shadow-lg"
                        style={{ backgroundColor: newTeam.secondaryColor || '#6366f1' }}
                        title="Secondary"
                      />
                    </div>

                    {/* Mini stat bars */}
                    <div className="w-full space-y-2 mt-2">
                      {[
                        { label: 'OFF', val: newTeam.offenseRating || 75, color: '#f43f5e' },
                        { label: 'DEF', val: newTeam.defenseRating || 75, color: '#3b82f6' },
                        { label: 'SPC', val: newTeam.specialTeamsRating || 75, color: '#10b981' },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase text-white/30 w-6">{s.label}</span>
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              animate={{ width: `${(s.val / 99) * 100}%` }}
                              transition={{ duration: 0.4 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                          </div>
                          <span className="text-[8px] font-black text-white/30 w-5 text-right">{s.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom ticker */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-t border-white/5 relative z-10">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: newTeam.primaryColor || '#10b981' }} />
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 truncate">
                      {newTeam.name || 'Team'} is ready for the stadium
                    </span>
                  </div>
                </motion.div>

                {/* Logo upload */}
                <Button variant="outline" className="w-full relative overflow-hidden rounded-xl h-11 text-[10px] font-black uppercase tracking-widest border-stone-200/60 shadow-sm">
                  <span className="flex items-center gap-2"><Upload className="w-3.5 h-3.5" /> Upload Logo</span>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} accept="image/*" />
                </Button>
             </div>

          </div>

          <Button 
            className="w-full mt-10 h-16 rounded-3xl uppercase font-black tracking-[0.2em] shadow-lg text-white"
            onClick={handleAddOrUpdate}
            style={{ backgroundColor: editingTeamId ? '#6366f1' : '#10b981' }}
          >
            {editingTeamId ? 'Update Roster Entry' : 'Finalize Recruitment'}
          </Button>
        </CardContent>
      </Card>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
          {teams.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center border-4 border-dashed border-stone-100 rounded-[3rem] bg-stone-50/30">
               <LayoutGrid className="w-16 h-16 text-stone-200 mb-6" />
               <h3 className="text-xl font-black text-stone-400 uppercase tracking-widest mb-2">No Teams Detected</h3>
               <p className="text-stone-300 text-xs font-bold uppercase mb-8">Start by recruiting stuffies or load the league defaults</p>
               <Button 
                onClick={addDefaultTeams}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest px-8 h-14 rounded-2xl shadow-lg shadow-emerald-500/20"
               >
                 Initialize Default League
               </Button>
            </div>
          )}
          {teams.map(team => {
            const renderUrl = STUFFY_RENDER_MAP[team.icon as StuffyIcon] || STUFFY_RENDER_MAP.TeddyBear;
            return (
               <motion.div layout key={team.id} className="relative group">
                 <Card className="rounded-2xl overflow-hidden border border-stone-100/60 hover:shadow-xl hover:-translate-y-1 transition-all bg-white relative">
                    <div 
                     className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-[0.03] pointer-events-none" 
                     style={{ backgroundColor: team.primaryColor }} 
                    />
                    
                    <CardContent className="p-6 flex flex-col items-center gap-5 text-center relative z-10">
                        <div 
                          className="w-28 h-28 rounded-full flex items-center justify-center border-2 border-white shadow-md relative overflow-hidden bg-white shrink-0 transition-transform group-hover:scale-110"
                          style={{ borderColor: !team.logoUrl ? team.primaryColor : 'white' }}
                        >
                          {team.logoUrl ? (
                            <div className="relative w-full h-full">
                              <Image src={team.logoUrl} fill className="object-cover scale-105" alt={`${team.name} Logo`} sizes="112px" />
                            </div>
                         ) : (
                           <div className="relative w-[120%] h-[120%] translate-y-3">
                              <Image src={renderUrl} fill className="object-contain drop-shadow-2xl" alt={team.name} sizes="112px" />
                           </div>
                         )}
                       </div>
                       <div>
                         <h4 className="text-sm font-black text-stone-900 leading-none mb-2 uppercase tracking-tighter italic">{team.name}</h4>
                         <p className="text-[9px] text-stone-300 font-black uppercase tracking-[0.2em]">{team.icon}</p>
                       </div>
                       
                       <div className="flex gap-4 w-full pt-4 border-t border-stone-100">
                         <div className="flex-1">
                            <p className="text-[8px] font-black text-stone-300 uppercase mb-1">Offense</p>
                            <p className="text-sm font-black text-stone-900 italic tracking-tighter">{team.offenseRating}</p>
                         </div>
                         <div className="flex-1">
                            <p className="text-[8px] font-black text-stone-300 uppercase mb-1">Defense</p>
                            <p className="text-sm font-black text-stone-900 italic tracking-tighter">{team.defenseRating}</p>
                         </div>
                         <div className="flex-1">
                            <p className="text-[8px] font-black text-stone-300 uppercase mb-1">Spec</p>
                            <p className="text-sm font-black text-stone-900 italic tracking-tighter">{team.specialTeamsRating}</p>
                         </div>
                      </div>
                   </CardContent>
                </Card>
                <div className="absolute top-2 right-2 flex gap-1 group-hover:opacity-100 opacity-0 transition-opacity">
                   <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => editTeam(team)}><Settings className="w-4 h-4" /></Button>
                   <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => deleteTeam(team.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </motion.div>
            )
          })}
      </div>
    </div>
  );
}
