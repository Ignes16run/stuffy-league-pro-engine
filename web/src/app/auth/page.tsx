"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Github, LogIn, ChevronRight, UserPlus, Fingerprint } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = isLogin 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
        
      if (error) throw error;
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 selection:bg-emerald-100 selection:text-emerald-900">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[480px]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-[1.5rem] shadow-xl shadow-stone-200/50 mb-6 border border-stone-100">
             <Fingerprint className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-stone-900 uppercase tracking-widest leading-none mb-3">Entrance Tier</h1>
          <p className="text-stone-500 text-sm font-medium">Synchronize your simulation across all devices.</p>
        </div>

        <Card className="rounded-[2.5rem] border-stone-200 shadow-2xl overflow-hidden bg-white">
          <CardContent className="p-10">
            <div className="space-y-4 mb-10">
              <Button 
                onClick={signInWithGoogle}
                variant="outline" 
                className="w-full h-14 rounded-2xl border-2 border-stone-100 font-bold text-stone-700 hover:bg-stone-50 transition-all flex items-center justify-center gap-3"
              >
                <Image src="https://www.google.com/favicon.ico" width={16} height={16} className="grayscale opacity-70 group-hover:grayscale-0 transition-all" alt="Google" />
                Sign in with Google
              </Button>
              <div className="relative py-4 flex items-center">
                <div className="flex-grow border-t border-stone-100"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">or credential access</span>
                <div className="flex-grow border-t border-stone-100"></div>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="space-y-1">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Simulation ID (Email)" 
                  className="w-full h-14 rounded-2xl bg-stone-50 border-2 border-stone-100 px-5 text-sm font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-stone-300"
                  required
                />
              </div>
              <div className="space-y-1">
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Access Code (Password)" 
                  className="w-full h-14 rounded-2xl bg-stone-50 border-2 border-stone-100 px-5 text-sm font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-stone-300"
                  required
                />
              </div>
              
              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-rose-500 text-[11px] font-bold px-1 pt-1">{error}</motion.p>
                )}
              </AnimatePresence>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-14 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 mt-4 shadow-xl shadow-stone-900/10"
              >
                {isLoading ? 'Processing...' : (isLogin ? 'Grant Access' : 'Establish Profile')}
                {!isLoading && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-stone-50">
               <button 
                 onClick={() => setIsLogin(!isLogin)}
                 className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-400 hover:text-emerald-500 transition-colors"
               >
                 {isLogin ? "No identity? Establish new profile" : "Existing identity? Recalibrate entry"}
               </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
