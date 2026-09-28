import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';
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
  X,
  Flame,
  UserCheck,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MatchingUser {
  id: string;
  fullName: string;
  username: string;
  role: string;
  avatar?: string;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedUsers, setMatchedUsers] = useState<MatchingUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setMatchedUsers([]);
    }
  }, [isOpen]);

  // Live real-time user lookup by username / name / email
  useEffect(() => {
    const clean = searchQuery.trim().replace(/^@/, '');
    if (clean.length < 1) {
      setMatchedUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, username, email, preferred_role, avatar')
          .or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%,email.ilike.%${clean}%,preferred_role.ilike.%${clean}%`)
          .limit(10);

        if (data) {
          const list: MatchingUser[] = data.map((p) => ({
            id: p.user_id || p.id,
            fullName: p.full_name || 'Member',
            username: p.username || (p.email ? p.email.split('@')[0] : 'user'),
            role: p.preferred_role || 'Founder',
            avatar: p.avatar,
          }));
          setMatchedUsers(list);
        } else {
          setMatchedUsers([]);
        }
      } catch (err) {
        console.warn('Live search error:', err);
      } finally {
        setSearchingUsers(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const SUGGESTION_POOL = [
    { term: 'Founders & Active Builders', type: 'Category', icon: Users, url: '/cofounders?category=founders' },
    { term: 'Co-Founders & Technical Synergy', type: 'Category', icon: Users, url: '/cofounders?category=cofounders' },
    { term: 'Active Angel Investors & Funds', type: 'Network', icon: TrendingUp, url: '/cofounders?category=investors' },
    { term: 'Growth & Demand Marketers', type: 'Network', icon: Megaphone, url: '/cofounders?category=marketers' },
    { term: 'Explore Startup Ventures', type: 'Directory', icon: Compass, url: '/startups' },
    { term: 'Global Problem Statements', type: 'Directory', icon: Globe, url: '/problems' },
    { term: 'Startup Jobs & Internships', type: 'Opportunity', icon: Briefcase, url: '/opportunities' },
  ];

  const popularTags = ['Founders', 'Co-Founders', 'Investors', 'ruthwik', 'legacy', 'AI', 'AgriTech', 'CleanTech', 'Jobs'];

  const filteredSuggestions = searchQuery.trim().length >= 1
    ? SUGGESTION_POOL.filter((s) => s.term.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : SUGGESTION_POOL.slice(0, 5);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Search Platform" maxWidth="xl">
      <div className="space-y-4 font-sans">
        
        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, username (@username), role, or startup..."
            className="w-full pl-10 pr-9 py-2.5 text-sm rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600/20 transition-all font-normal"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={15} />
            </button>
          )}
        </form>

        {/* Live Matching Real Users Section */}
        {matchedUsers.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-brand-600 dark:text-brand-400" /> Members ({matchedUsers.length})
              </span>
              <span className="text-[11px] text-slate-400">Direct match</span>
            </div>

            <div className="space-y-1">
              {matchedUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectOption(`/profile/${u.id}`)}
                  className="w-full flex items-center justify-between p-2 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={
                        u.avatar ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.fullName)}&backgroundColor=2457d6`
                      }
                      alt={u.fullName}
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {u.fullName}
                        </span>
                        <span className="text-[11px] text-brand-600 dark:text-brand-400 font-mono">
                          @{u.username}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {u.role}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 font-medium shrink-0 ml-2">
                    View profile →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Popular Keyword Pills */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Popular Searches
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
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-600 hover:text-brand-600 dark:hover:border-brand-500 dark:hover:text-brand-400 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Query Option */}
        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => handleSelectOption(`/search?q=${encodeURIComponent(searchQuery.trim())}`)}
            className="w-full text-left p-2.5 rounded-md bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100/70 dark:hover:bg-brand-900/40 border border-brand-200 dark:border-brand-900 flex items-center justify-between text-brand-700 dark:text-brand-300 text-xs font-semibold transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search size={14} />
              <span>Search ecosystem for "{searchQuery}"</span>
            </div>
            <ArrowRight size={13} />
          </button>
        )}

        {/* Direct Category Shortcuts */}
        <div className="space-y-0.5 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
          {filteredSuggestions.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(item.url)}
                className="w-full text-left p-2 rounded-md hover:bg-slate-100/80 dark:hover:bg-slate-800/80 flex items-center justify-between text-slate-700 dark:text-slate-300 transition-colors group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon size={14} className="text-slate-400 group-hover:text-brand-600 shrink-0" />
                  <span className="font-medium text-xs">{item.term}</span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 ml-2">
                  {item.type}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Press Enter to run global search or click any member to open profile.
        </div>

      </div>
    </Modal>
  );
};
