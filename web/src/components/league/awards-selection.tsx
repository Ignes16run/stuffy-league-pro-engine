"use client";
// Last Updated: 2026-03-22T21:25:00-04:00

import React, { useState } from 'react';
import { useLeague } from '@/context/league-context';
import { Player, PlayerStats } from '@/lib/league/types';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Shield, Zap, Target, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export function AwardsSelection() {
  const { 
    isAwardsPhase, setIsAwardsPhase, awardFinalists, setAwardWinner, selectedAwards, 
    awardResults, finalizeSeason, simulateAwards 
  } = useLeague();
  
  const [currentStep, setCurrentStep] = useState(0);
  const categories = Object.keys(awardFinalists);
  const isResultsStep = currentStep === categories.length;
  const currentCategory = isResultsStep ? null : categories[currentStep];
  const finalists = currentCategory ? (awardFinalists[currentCategory] || []) : [];
  
  const handleNext = () => {
    if (currentCategory && selectedAwards[currentCategory]) {
      setCurrentStep(s => s + 1);
    }
  };

  if (!isAwardsPhase) return null;

  return (
    <Dialog open={isAwardsPhase} onOpenChange={setIsAwardsPhase}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] border-none shadow-2xl p-0">
        <div className="bg-stone-50/50 p-8">
          <DialogHeader className="mb-8 relative pr-12">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black text-stone-900 leading-tight flex items-center gap-3">
                  {isResultsStep ? "Awards Ceremony" : "End of Season Awards"}
                  {!isResultsStep && (
                    <Button 
                      onClick={simulateAwards}
                      size="sm"
                      className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none rounded-xl text-[10px] h-7 font-black uppercase tracking-widest px-3"
                    >
                      <Zap className="w-3.5 h-3.5 mr-1" />
                      Simulate All
                    </Button>
                  )}
                </DialogTitle>
                <DialogDescription className="text-stone-500 font-medium text-xs">
                  {isResultsStep ? "Presenting this year's most impactful stuffies" : "Select the most deserving stuffy for each category"}
                </DialogDescription>
              </div>
            </div>
            
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsAwardsPhase(false)}
                className="absolute right-0 top-0 rounded-full hover:bg-stone-200"
              >
                <X className="w-5 h-5 text-stone-500" />
            </Button>

            <div className="flex gap-2 mt-6">
              {categories.map((cat, idx) => (
                <div 
                  key={cat}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    idx === currentStep ? "bg-stone-900 w-full" : (idx < currentStep ? "bg-emerald-500" : "bg-stone-100")
                  )}
                />
              ))}
              <div 
                 className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    isResultsStep ? "bg-amber-500 w-full" : "bg-stone-100"
                 )}
              />
            </div>
          </DialogHeader>

          {!isResultsStep && currentCategory && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-2">
                   {getIcon(currentCategory)}
                   {currentCategory} Finalists
                </h3>
                <Badge className="bg-stone-900 text-white border-none px-4 py-1 text-xs font-black uppercase">
                   Step {currentStep + 1} of {categories.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentCategory}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    {finalists.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {finalists.map(player => (
                          <Card 
                            key={player.id}
                            className={cn(
                              "cursor-pointer transition-all border-2 rounded-2xl overflow-hidden group hover:scale-[1.01] h-full",
                              selectedAwards[currentCategory] === player.id 
                                ? "border-amber-400 bg-amber-50/30 shadow-lg shadow-amber-100" 
                                : "border-stone-100 hover:border-stone-200 bg-white"
                            )}
                            onClick={() => setAwardWinner(currentCategory, player.id)}
                          >
                            <CardContent className="p-3 flex items-center gap-4">
                               <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-xl shrink-0 overflow-hidden border border-stone-200">
                                     {player.profilePicture ? (
                                       <img src={player.profilePicture} alt={player.name} className="w-full h-full object-cover" />
                                     ) : (
                                       <div className="text-stone-300">🧸</div>
                                     )}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-sm text-stone-900 truncate">{player.name}</span>
                                    <Badge variant="outline" className="text-[8px] font-bold py-0 h-4">{player.position}</Badge>
                                  </div>
                                  <div className="flex gap-2.5 mt-0.5">
                                    {getRelevantStats(player, currentCategory).slice(0, 2).map(s => (
                                      <div key={s.label} className="flex flex-col">
                                        <span className="text-[8px] text-stone-400 font-bold uppercase leading-none">{s.label}</span>
                                        <span className="text-[10px] font-black text-stone-700">{s.value}</span>
                                      </div>
                                    ))}
                                  </div>
                               </div>
                               <div className="flex flex-col items-end shrink-0">
                                  <span className="text-[7px] text-stone-400 font-bold uppercase leading-none">OVR</span>
                                  <span className="text-lg font-black text-stone-900">{player.rating}</span>
                               </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-stone-50 rounded-3xl border border-stone-100">
                         <p className="text-stone-400 font-bold uppercase text-[10px]">No valid candidates found for this category</p>
                         <Button variant="ghost" className="mt-4 text-stone-600 font-black h-12 rounded-2xl" onClick={() => setCurrentStep(prev => prev + 1)}>
                           Skip Category
                         </Button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          {isResultsStep && (
            <div className="space-y-8 py-4">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100 mb-2">
                  <Trophy className="w-5 h-5 text-amber-600" />
                  <h3 className="text-lg font-black text-stone-900 uppercase italic leading-none">Season Awards Ceremony</h3>
                </div>
                <p className="text-stone-400 font-bold uppercase text-[8px] tracking-widest mt-1">Presenting this year&apos;s most impactful stuffies.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {categories.map(cat => {
                   const res = awardResults[cat];
                   if (!res) return null;
                   return (
                     <Card key={cat} className="rounded-3xl border-stone-100 shadow-xl shadow-stone-200/50 overflow-hidden bg-white border-2">
                        <div className="p-4 flex flex-col h-full">
                          <div className="flex items-center justify-between mb-3">
                            <Badge className="bg-stone-900 text-white border-none py-0.5 px-2 text-[8px] font-black uppercase tracking-widest">{cat}</Badge>
                            {getIcon(cat)}
                          </div>
                          
                          <div className="flex items-center gap-3 mb-4">
                             <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-lg border border-stone-100 shrink-0 overflow-hidden">
                                {res.winner.profilePicture ? (
                                   <img src={res.winner.profilePicture} alt={res.winner.name} className="w-full h-full object-cover" />
                                ) : (
                                   "🧸"
                                )}
                             </div>
                             <div className="min-w-0">
                                <p className="font-black text-stone-900 text-[13px] leading-tight truncate">{res.winner.name}</p>
                                <p className="text-[8px] text-stone-400 font-bold uppercase tracking-widest truncate">{res.winner.position} • {res.statValue} {res.statName.split('/')[0]}</p>
                             </div>
                          </div>
 
                          <div className="flex-1 p-3 bg-stone-50 rounded-xl border border-stone-100 italic text-stone-600 text-[11px] leading-relaxed font-medium">
                             &quot;{res.narrative}&quot;
                          </div>
                        </div>
                     </Card>
                   );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between">
            {!isResultsStep ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsAwardsPhase(false)}
                  className="rounded-2xl h-14 px-8 font-black text-stone-500 hover:bg-stone-100"
                >
                  Save & Exit
                </Button>
                <Button 
                  onClick={handleNext}
                  disabled={!currentCategory || !selectedAwards[currentCategory]}
                  className="bg-stone-900 text-white hover:bg-stone-800 rounded-2xl h-14 px-10 font-black text-lg gap-2 transition-all"
                >
                  Next Award
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <Button 
                onClick={finalizeSeason}
                className="bg-amber-500 text-white hover:bg-amber-600 rounded-2xl h-14 px-10 font-black text-lg gap-2 transition-all w-full shadow-lg shadow-amber-200"
              >
                Finalize League Reset
                <SaveIcon className="w-5 h-5" />
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getIcon(type: string) {
  switch(type) {
    case 'MVP': return <Star className="w-5 h-5 text-amber-500 fill-amber-500" />;
    case 'OPOY': return <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />;
    case 'DPOY': return <Shield className="w-5 h-5 text-blue-500 fill-blue-500" />;
    case 'STPOY': return <Target className="w-5 h-5 text-purple-500 fill-purple-500" />;
    default: return null;
  }
}

function getRelevantStats(player: Player, type: string) {
  const s = player.stats;
  if (type === 'MVP' || type === 'OPOY') {
    if (player.position === 'QB') return [
      { label: 'Yds', value: s.passingYards || 0 },
      { label: 'TD', value: s.passingTds || 0 },
      { label: 'INT', value: s.interceptionsThrown || 0 }
    ];
    if (player.position === 'RB') return [
      { label: 'Yds', value: s.rushingYards || 0 },
      { label: 'TD', value: s.rushingTds || 0 },
      { label: 'Car', value: s.carries || 0 }
    ];
    return [
      { label: 'Yds', value: s.receivingYards || (s as PlayerStats).yards || 0 },
      { label: 'TD', value: s.receivingTds || 0 },
      { label: 'Rec', value: s.receptions || 0 }
    ];
  }
  if (type === 'DPOY') {
    return [
      { label: 'Tkl', value: s.tackles || 0 },
      { label: 'Sck', value: s.sacks || 0 },
      { label: 'Int', value: s.interceptions || 0 },
      { label: 'PD', value: s.passDeflections || 0 }
    ];
  }
  if (type === 'STPOY') {
    return [
      { label: 'Pts', value: s.points || 0 }
    ];
  }
  return [];
}

const SaveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);
