"use client";
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLeague } from '@/context/league-context';
import { Newspaper, Trophy, Ghost, MessageSquare, Flame, TrendingUp, Calendar, ThumbsUp, ThumbsDown, Zap, ShieldAlert } from 'lucide-react';
import { NewsStory } from '@/lib/league/types';
// Updated: 2026-03-27T19:55Z

/**
 * The Daily Stuffy - A dynamic narrative news feed for the league.
 * Displays contextual recaps, drama, and interviews.
 */
export function DailyStuffy() {
  const { news, currentWeek, games, teams, players, setNews, generateWeeklyNews, toggleStoryFeedback } = useLeague();

  const handleManualGenerate = () => {
    const currentGames = games.filter(g => g.week === currentWeek);
    const newStories = generateWeeklyNews(currentWeek, currentGames, teams, players);
    setNews(prev => [...newStories, ...prev]);
  };

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700/50"
        >
          <Newspaper className="w-10 h-10 text-slate-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">No Headlines Yet</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-8">
          The press is waiting! News stories generate automatically when you advance the week, but you can also call for a press release right now.
        </p>
        <button 
          onClick={handleManualGenerate}
          className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all hover:scale-105 shadow-lg shadow-red-500/20"
        >
          <MessageSquare className="w-5 h-5" />
          Interview the Team
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <header className="mb-12 text-center relative">
        <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-5 text-slate-900">
           <Newspaper size={200} />
        </div>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 text-xs font-bold tracking-widest uppercase mb-4"
        >
          <Flame className="w-3 h-3" />
          Live Narrative Engine
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 italic drop-shadow-sm">
          THE DAILY <span className="text-transparent bg-clip-text bg-linear-to-r from-red-500 to-orange-400">STUFFY</span>
        </h1>
        <div className="h-px w-full bg-linear-to-r from-transparent via-slate-700 to-transparent mb-4" />
        <div className="flex items-center justify-between text-slate-500 text-sm font-medium px-4">
          <span>VOL. 2026</span>
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            WEEK {currentWeek} EDITION
          </span>
          <span>STUFFY TOWN, ST</span>
        </div>
        <div className="h-0.5 w-full bg-slate-800 mt-2" />
      </header>

      <div className="grid gap-8">
        <AnimatePresence mode="popLayout">
          {news.filter(s => s.week === currentWeek).map((story, index) => (
            <NewsCard key={story.id} story={story} index={index} onFeedback={toggleStoryFeedback} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Updated: 2026-03-27T19:56Z

function NewsCard({ story, index, onFeedback }: { story: NewsStory; index: number; onFeedback: (id: string, type: 'UP' | 'DOWN') => void }) {
  const getIcon = (type: NewsStory['type']) => {
    switch (type) {
      case 'GAME_RECAP': return <Trophy className="w-4 h-4" />;
      case 'PLAYER_DRAMA': return <Ghost className="w-4 h-4" />;
      case 'INTERVIEW': return <MessageSquare className="w-4 h-4" />;
      case 'LEAGUE_MILESTONE': return <Flame className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  const getBadgeColor = (type: NewsStory['type']) => {
    switch (type) {
      case 'GAME_RECAP': return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      case 'PLAYER_DRAMA': return 'bg-purple-600/20 text-purple-300 border-purple-500/30';
      case 'INTERVIEW': return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'LEAGUE_MILESTONE': return 'bg-red-600/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-600/20 text-slate-300 border-slate-500/30';
    }
  };

  const getLabel = (type: NewsStory['type']) => {
    switch (type) {
      case 'GAME_RECAP': return 'Recap';
      case 'PLAYER_DRAMA': return 'Drama';
      case 'INTERVIEW': return 'Interview';
      case 'LEAGUE_MILESTONE': return 'Milestone';
      default: return 'News';
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-700/80"
    >
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getBadgeColor(story.type)}`}>
              {getIcon(story.type)}
              {getLabel(story.type)}
            </span>
            <span className="text-slate-500 text-xs font-medium">Week {story.week}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => onFeedback(story.id, 'UP')}
              className={`p-2 rounded-lg border transition-all ${story.feedback === 'UP' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}`}
              title="Boost Team Momentum"
            >
              <ThumbsUp className={`w-4 h-4 ${story.feedback === 'UP' ? 'fill-emerald-400/20' : ''}`} />
            </button>
            <button 
              onClick={() => onFeedback(story.id, 'DOWN')}
              className={`p-2 rounded-lg border transition-all ${story.feedback === 'DOWN' ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}`}
              title="Decrease Team Focus"
            >
              <ThumbsDown className={`w-4 h-4 ${story.feedback === 'DOWN' ? 'fill-rose-400/20' : ''}`} />
            </button>
          </div>
        </div>

        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight group-hover:text-red-400 transition-colors duration-300">
          {story.title}
        </h3>

        <div className="prose prose-invert max-w-none">
          <p className="text-slate-100 leading-relaxed text-lg font-medium opacity-90">
            {story.content}
          </p>
        </div>

        {story.feedback && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${story.feedback === 'UP' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}
          >
            {story.feedback === 'UP' ? <Zap className="w-3.5 h-3.5 fill-emerald-400/20" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            {story.feedback === 'UP' ? 'OVR BOOST APPLIED (+2)' : 'OVR PENALTY APPLIED (-2)'}
          </motion.div>
        )}

        {story.type === 'GAME_RECAP' && (
          <div className="mt-8 pt-6 border-t border-slate-800/50 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex -space-x-3 overflow-hidden">
               <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-slate-400">
                 SP
               </div>
            </div>
            <button className="text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 transition-colors">
              Full Match Report <TrendingUp className="w-4 h-4" />
            </button>
          </div>
        )}

        {story.type === 'PLAYER_DRAMA' && (
          <div className="mt-8 p-6 bg-purple-500/10 border border-purple-500/20 rounded-xl italic text-purple-200 font-medium text-base shadow-inner">
            &ldquo;We aren&apos;t making excuses, but the vibes in the locker room are... complicated.&rdquo; &mdash; Anonymous Source
          </div>
        )}
      </div>
      
      {/* Visual flair - light streak */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-red-500/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    </motion.article>
  );
}
