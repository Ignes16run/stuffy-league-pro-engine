"use client";
import React, { useState } from 'react';
import { useLeague } from '@/context/league-context';
import TeamSetup from './team-setup';
import RosterView from './roster-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings2, Users } from 'lucide-react';

export default function ManagementView() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-stone-100">
        <h2 className="text-3xl font-black text-stone-900 mb-2 uppercase tracking-widest">Management Hub</h2>
        <p className="text-stone-500 font-medium italic">Configure teams and manage athlete personnel.</p>
        
        <Tabs defaultValue="roster" className="mt-8 space-y-6">
          <TabsList className="bg-stone-100/50 p-1.5 rounded-2xl h-auto gap-1">
            <TabsTrigger value="roster" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
              <Users className="w-3.5 h-3.5 mr-2" />
              Manage Personnel
            </TabsTrigger>
            <TabsTrigger value="teams" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm font-black text-[10px] uppercase tracking-widest transition-all">
              <Settings2 className="w-3.5 h-3.5 mr-2" />
              Team Configuration
            </TabsTrigger>
          </TabsList>

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
