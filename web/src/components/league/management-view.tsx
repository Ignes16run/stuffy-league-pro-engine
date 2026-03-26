import React from 'react';
import TeamSetup from './team-setup';
import RosterView from './roster-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Users } from 'lucide-react';

export default function ManagementView() {
  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <div className="bg-white/60 backdrop-blur-2xl rounded-3xl p-8 shadow-sm border border-stone-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[120px] -mr-40 -mt-40 pointer-events-none" />
        
        <h2 className="text-5xl font-black text-stone-900 mb-2 uppercase tracking-tighter leading-none italic">Management Hub</h2>
        <p className="text-emerald-500/60 font-black uppercase text-[10px] tracking-[0.4em] mt-4">Franchise Infrastructure & Personnel Protocols</p>
        
        <Tabs defaultValue="roster" className="mt-12 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-stone-50/50 p-6 rounded-2xl border border-stone-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[120px] -mr-40 -mt-40 pointer-events-none" />
            
            <div className="flex flex-wrap items-center gap-4 relative z-10 w-full">
              <TabsList className="bg-stone-100/50 p-1.5 rounded-2xl h-auto gap-1 border border-stone-100">
                <TabsTrigger value="roster" className="rounded-xl px-10 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
                  <Users className="w-4 h-4 mr-2 text-emerald-500" />
                  Manage Personnel
                </TabsTrigger>
                <TabsTrigger value="teams" className="rounded-xl px-10 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
                  <Settings2 className="w-4 h-4 mr-2 text-emerald-500" />
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
