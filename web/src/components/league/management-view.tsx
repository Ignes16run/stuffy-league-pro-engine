import React from 'react';
import TeamSetup from './team-setup';
import RosterView from './roster-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Users } from 'lucide-react';
import { useLeague } from '@/context/league-context';

// Last Updated: 2026-03-26T15:27:45-04:00

export default function ManagementView() {
  const { teams, players } = useLeague();
  
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-sm border border-stone-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[120px] -mr-48 -mt-48 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <h2 className="text-5xl font-black text-stone-900 uppercase tracking-tighter leading-none italic">Management Hub</h2>
            <p className="text-emerald-500/60 font-black uppercase text-[10px] tracking-[0.4em]">Franchise Infrastructure & Personnel Protocols</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-stone-50 border border-stone-100 px-6 py-4 rounded-2xl flex flex-col items-center min-w-[120px]">
              <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">Franchises</span>
              <span className="text-2xl font-black text-stone-900 italic tracking-tighter">{teams.length}</span>
            </div>
            <div className="bg-stone-50 border border-stone-100 px-6 py-4 rounded-2xl flex flex-col items-center min-w-[120px]">
              <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest mb-1">Total Athletes</span>
              <span className="text-2xl font-black text-stone-900 italic tracking-tighter">{players.length}</span>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="roster" className="mt-12 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-stone-50/50 p-6 rounded-3xl border border-stone-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[120px] -mr-40 -mt-40 pointer-events-none" />
            
            <div className="flex flex-wrap items-center gap-4 relative z-10 w-full">
              <TabsList className="bg-stone-200/40 p-1.5 rounded-2xl h-auto gap-1 border border-stone-100">
                <TabsTrigger value="roster" className="rounded-xl px-12 py-4 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all text-stone-400">
                  <Users className="w-4 h-4 mr-3" />
                  Manage Personnel
                </TabsTrigger>
                <TabsTrigger value="teams" className="rounded-xl px-12 py-4 data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all text-stone-400">
                  <Settings2 className="w-4 h-4 mr-3" />
                  Team Configuration
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="roster" className="mt-0 focus-visible:outline-none">
            <RosterView />
          </TabsContent>
          <TabsContent value="teams" className="mt-0 focus-visible:outline-none">
            <TeamSetup />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
