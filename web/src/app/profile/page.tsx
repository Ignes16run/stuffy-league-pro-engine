"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { useAuth } from '@/context/auth-context';
import { useLeague } from '@/context/league-context';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, Shield, Trophy, Activity, LogOut, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { teams, history } = useLeague();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
    
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          setProfile(data);
          setIsLoading(false);
        });
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoading) return <div className="h-screen flex items-center justify-center font-black uppercase text-[10px] tracking-widest text-stone-300">Synchronizing...</div>;
  if (!user) return null;

  const totalWins = teams.reduce((acc, t) => acc + (t.allTimeWins || 0), 0);
  const totalChampionships = teams.reduce((acc, t) => acc + (t.championships || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-12 space-y-12">
      <header className="flex items-center justify-between">
         <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl shadow-stone-200/50 flex items-center justify-center border border-stone-100 overflow-hidden relative">
                {profile?.avatar_url ? (
                  <div className="relative w-full h-full">
                    <Image src={profile.avatar_url} fill className="object-cover" alt="Avatar" />
                  </div>
                ) : (
                 <UserIcon className="w-10 h-10 text-stone-200" />
               )}
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-2">Sim Tier Administrator</p>
               <h1 className="text-4xl font-black text-stone-900 uppercase tracking-widest">{profile?.display_name || user.email?.split('@')[0]}</h1>
               <p className="text-stone-400 font-medium text-sm mt-1">{user.email}</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <Button variant="outline" className="h-14 rounded-2xl border-2 border-stone-100 font-black uppercase tracking-widest text-[10px]">
               <Settings className="w-4 h-4 mr-2" /> Global Prefs
            </Button>
            <Button onClick={signOut} className="h-14 px-8 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm transition-all flex items-center justify-center gap-2">
               <LogOut className="w-4 h-4" /> De-Authenticate
            </Button>
         </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <StatCard icon={<Trophy className="text-amber-400" />} label="Sim Championships" value={totalChampionships} />
         <StatCard icon={<Activity className="text-emerald-500" />} label="Total Franchise Wins" value={totalWins} />
         <StatCard icon={<Shield className="text-blue-500" />} label="Active Franchises" value={teams.length} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
         <Card className="rounded-[3rem] border-stone-100 shadow-xl p-10 bg-white">
            <CardTitle className="text-xl font-black text-stone-900 uppercase tracking-widest mb-1">Administrative Node</CardTitle>
            <CardDescription className="text-stone-400 text-xs mb-8">Maintain record integrity and simulation identity.</CardDescription>
            <div className="space-y-6">
               <FieldItem label="Simulation Display Primary Name" value={profile?.display_name || 'Not Configured'} />
               <FieldItem label="Tier Identifier (UUID)" value={user.id} />
               <FieldItem label="Last Synchronization" value={new Date(user.last_sign_in_at!).toLocaleString()} />
            </div>
         </Card>

         <Card className="rounded-[3rem] border-stone-100 shadow-xl p-10 bg-stone-900 text-white overflow-hidden relative">
            <div className="relative z-10">
              <CardTitle className="text-xl font-black uppercase tracking-widest mb-1">Legacy History</CardTitle>
              <CardDescription className="text-stone-400 text-xs mb-8">Archived season results and historical snapshots.</CardDescription>
              <div className="space-y-4">
                 {history.length === 0 ? (
                   <div className="py-12 text-center text-stone-500 border border-dashed border-stone-800 rounded-[2rem]">
                      <p className="font-black uppercase text-[10px] tracking-widest">No Archived Eras</p>
                   </div>
                 ) : (
                   history.map((h, i) => (
                     <div key={i} className="flex items-center justify-between p-4 bg-stone-800/50 rounded-2xl border border-stone-700/50">
                        <span className="font-black text-sm uppercase tracking-widest">Year {h.year}</span>
                        <div className="flex items-center gap-3">
                           <Trophy className="w-4 h-4 text-amber-400" />
                           <span className="text-[11px] font-bold text-stone-300">Champion Node Identified</span>
                        </div>
                     </div>
                   ))
                 )}
              </div>
            </div>
            <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 5, 0] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
         </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: any, label: string, value: any }) {
  return (
    <Card className="rounded-[2.5rem] p-10 border-stone-100 shadow-xl shadow-stone-200/50 bg-white">
       <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-stone-50 flex items-center justify-center border border-stone-100">
             {React.cloneElement(icon, { size: 30 })}
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">{label}</p>
            <p className="text-4xl font-black text-stone-900 leading-none">{value}</p>
          </div>
       </div>
    </Card>
  );
}

function FieldItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="pb-6 border-b border-stone-50 last:border-0 last:pb-0">
       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">{label}</p>
       <p className="text-sm font-bold text-stone-700 truncate">{value}</p>
    </div>
  );
}
