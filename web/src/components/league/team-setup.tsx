"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Upload, Trash2, RefreshCw, Settings, Sliders
} from 'lucide-react';
import { useLeague } from '@/context/league-context';
import { Team, StuffyIcon } from '@/lib/league/types';
import { STUFFY_ICONS, ICON_OPTIONS, DEFAULT_COLORS } from '@/lib/league/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { uploadFile } from '@/lib/supabase-client';

export default function TeamSetup() {
  const { teams, addTeam, updateTeam, removeTeam, user } = useLeague();
  
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

  const generateId = () => crypto.randomUUID();

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
      const team: Team = {
        id: generateId(),
        name: newTeam.name,
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
        id: generateId(),
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
              className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border border-stone-100"
            >
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-widest mb-2">Bulk Recruit</h3>
              <p className="text-sm text-stone-500 mb-6 font-medium">Enter one team name per line to auto-generate multiple franchises.</p>
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
              className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl border border-stone-100 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 pb-4">
                <h3 className="text-xl font-black text-stone-900 uppercase tracking-widest mb-2">Bulk Stat Modifier</h3>
                <p className="text-sm text-stone-500 font-medium">Fine-tune your entire league's power balance in real-time.</p>
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
      
      <Card className="rounded-4xl border border-stone-100 shadow-xl shadow-stone-200/50">
        <CardHeader className="flex flex-row items-center justify-between pb-8">
          <div>
            <CardTitle className="text-2xl font-black text-stone-900 flex items-center gap-3">
              {editingTeamId ? <RefreshCw className="text-indigo-500" /> : <Plus className="text-emerald-500" />}
              {editingTeamId ? 'Update Team Branding' : 'Recruit a New Team'}
            </CardTitle>
            <CardDescription className="text-stone-500 mt-1">
              {editingTeamId ? 'Refine your team\'s visual brand and name.' : 'Define your team\'s identity and visual brand.'}
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
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {ICON_OPTIONS.map(icon => {
                    const IconComp = STUFFY_ICONS[icon as keyof typeof STUFFY_ICONS];
                    return (
                      <button
                        key={icon}
                        onClick={() => setNewTeam({ ...newTeam, icon })}
                        className={cn(
                          "aspect-square rounded-xl border-2 flex items-center justify-center transition-all",
                          newTeam.icon === icon ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-stone-100 text-stone-300 hover:border-stone-200"
                        )}
                      >
                        <IconComp className="w-6 h-6" />
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

            <div className="space-y-6 flex flex-col items-center">
               <label className="text-xs font-black uppercase text-stone-400 w-full">Logo Preview</label>
               <div 
                 className="w-48 h-48 rounded-4xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center relative overflow-hidden bg-stone-50"
                 style={{ backgroundColor: newTeam.logoUrl ? 'white' : 'transparent' }}
               >
                 {newTeam.logoUrl ? (
                   <img src={newTeam.logoUrl} className="w-full h-full object-cover" alt="logo" />
                 ) : (
                   <div className="text-stone-300 text-center">
                     <Upload className="w-10 h-10 mx-auto mb-2 opacity-20" />
                     <p className="text-[10px] uppercase font-bold tracking-widest">No Logo</p>
                   </div>
                 )}
               </div>
               <Button variant="outline" className="w-full relative overflow-hidden">
                  <span className="flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Custom Logo</span>
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
          {teams.map(team => {
            const IconComp = STUFFY_ICONS[team.icon as keyof typeof STUFFY_ICONS];
            return (
              <motion.div layout key={team.id} className="relative group">
                <Card className="rounded-3xl overflow-hidden border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all">
                   <div className="h-1 w-full flex">
                      <div className="flex-1 h-full" style={{ backgroundColor: team.primaryColor }} />
                      <div className="flex-1 h-full" style={{ backgroundColor: team.secondaryColor }} />
                   </div>
                   <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
                      <div 
                        className="w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-stone-100 shadow-md overflow-hidden"
                        style={{ backgroundColor: team.primaryColor, color: 'white' }}
                      >
                        {team.logoUrl ? (
                          <img src={team.logoUrl} className="w-full h-full object-cover" />
                        ) : (
                          <IconComp className="w-10 h-10" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-stone-900 leading-none mb-1">{team.name}</h4>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{team.icon}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 w-full pt-4 border-t border-stone-100">
                         <div className="text-[9px] font-black text-stone-400">OFF <p className="text-stone-900">{team.offenseRating}</p></div>
                         <div className="text-[9px] font-black text-stone-400">DEF <p className="text-stone-900">{team.defenseRating}</p></div>
                         <div className="text-[9px] font-black text-stone-400">SPC <p className="text-stone-900">{team.specialTeamsRating}</p></div>
                      </div>
                   </CardContent>
                </Card>
                <div className="absolute top-2 right-2 flex gap-1 group-hover:opacity-100 opacity-0 transition-opacity">
                   <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => editTeam(team)}><Settings className="w-4 h-4" /></Button>
                   <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => removeTeam(team.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </motion.div>
            )
          })}
      </div>
    </div>
  );
}
