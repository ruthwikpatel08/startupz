import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import {
  Search,
  Sparkles,
  Users,
  Compass,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Megaphone,
  Globe,
  Skull,
  ArrowRight,
  ExternalLink,
  X,
  Flame,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const SUGGESTION_POOL = [
    { term: 'AI & Machine Learning', type: 'Category', icon: Sparkles, url: '/search?q=AI' },
    { term: 'Co-Founders & Technical Builders', type: 'Network', icon: Users, url: '/cofounders' },
    { term: 'React & Frontend Developers', type: 'Skill', icon: Search, url: '/search?q=React' },
    { term: 'Full-Stack Software Engineers', type: 'Skill', icon: Search, url: '/search?q=Engineer' },
    { term: 'Fintech & Digital Payments', type: 'Industry', icon: Compass, url: '/search?q=Fintech' },
    { term: 'AgriTech & Sustainability', type: 'Industry', icon: Compass, url: '/search?q=AgriTech' },
    { term: 'Full-Time Startup Positions', type: 'Opportunity', icon: Briefcase, url: '/opportunities?type=jobs' },
    { term: 'Student Internships', type: 'Opportunity', icon: GraduationCap, url: '/opportunities?type=internships' },
    { term: 'Venture Capital & Angel Backers', type: 'Network', icon: TrendingUp, url: '/cofounders?category=investors' },
    { term: 'Growth & Demand Marketers', type: 'Network', icon: Megaphone, url: '/cofounders?category=marketers' },
    { term: 'Problem Statements & Idea Vault', type: 'Directory', icon: Globe, url: '/problems' },
    { term: 'Failed Startup Graveyard', type: 'Directory', icon: Skull, url: '/failed-startups' },
    { term: 'Startup Mentors & Advisors', type: 'Directory', icon: GraduationCap, url: '/mentors' },
  ];

  const popularTags = ['React', 'AI / LLM', 'Founders', 'Co-Founders', 'Fintech', 'AgriTech', 'Marketers', 'Investors', 'Internships', 'Jobs'];

  // Filter recommendations matching 1+ typed letters
  const filteredSuggestions = searchQuery.trim().length >= 1
    ? SUGGESTION_POOL.filter((s) => s.term.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : SUGGESTION_POOL.slice(0, 6);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      onClose();
    }
  };

  const handleSelectOption = (url: string) => {
    navigate(url);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Global Startup Search" maxWidth="xl">
      <div className="space-y-5 font-sans">
        
        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search size={18} className="absolute left-4 top-3.5 text-brand-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type any word, skill, startup or founder..."
            className="w-full pl-11 pr-10 py-3 text-sm rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-brand-500/30 focus:border-brand-500 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          )}
        </form>

        {/* Quick Popular Keyword Pills */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Flame size={13} className="text-amber-500" />
            <span>Trending Search Keywords</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {popularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSearchQuery(tag);
                  navigate(`/search?q=${encodeURIComponent(tag)}`);
                  onClose();
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950 text-slate-700 dark:text-slate-300 hover:text-brand-600 transition-colors cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Autocomplete Recommendations */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>{searchQuery.trim().length >= 1 ? 'Instant Matching Words' : 'Suggested Direct Links'}</span>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {/* Direct Query Option */}
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => handleSelectOption(`/search?q=${encodeURIComponent(searchQuery.trim())}`)}
                className="w-full text-left p-3 rounded-xl bg-brand-50/80 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 flex items-center justify-between text-brand-600 dark:text-brand-300 font-bold transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Search size={15} />
                  <span>Search for "{searchQuery}"</span>
                </div>
                <ArrowRight size={14} />
              </button>
            )}

            {filteredSuggestions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(item.url)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-200 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={15} className="text-slate-400 group-hover:text-brand-500 shrink-0" />
                    <span className="font-semibold text-xs">{item.term}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-brand-600 shrink-0 ml-2">
                    {item.type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Enter</kbd> to search or click any option to open in a new tab.
        </div>

      </div>
    </Modal>
  );
};
