import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import {
  Rocket,
  Compass,
  Users,
  Briefcase,
  TrendingUp,
  GraduationCap,
  MessageSquare,
  Bookmark,
  Bell,
  Search,
  Sun,
  Moon,
  Plus,
  Shield,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Share2,
  Skull,
  Sparkles,
  Bot,
  Globe,
} from 'lucide-react';
import { AIScoutModal } from '../ai/AIScoutModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [aiScoutOpen, setAiScoutOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      api.getNotifications()
        .then((items) => {
          const unread = items?.filter((n: any) => !n.isRead)?.length || 0;
          setUnreadNotifications(unread);
        })
        .catch(() => {});
    }
  }, [user, location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { name: 'AI - Scout', isAiScout: true, icon: Sparkles },
    { name: 'Startups', href: '/startups', icon: Compass },
    { name: 'Co - Founders', href: '/cofounders', icon: Users },
    { name: 'Opportunities', href: '/opportunities', icon: Briefcase },
    { name: 'Investors', href: '/investors', icon: TrendingUp },
    { name: 'Graveyard', href: '/failed-startups', icon: Skull },
    { name: 'Mentors', href: '/mentors', icon: GraduationCap },
    { name: 'Problem Statements', href: '/problems', icon: Globe },
    { name: 'Feed', href: '/feed', icon: Share2 },
  ];

  const isActive = (path?: string) => path ? location.pathname === path : false;

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Rocket size={18} className="transform -rotate-12" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                StartupZ
              </span>
            </div>
          </Link>

          {/* Global Search Input (Desktop) */}
          <form onSubmit={handleSearchSubmit} className="hidden xl:flex items-center relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search startups, skills, founders..."
              className="w-full pl-9 pr-4 py-1.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-brand-500 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </form>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto">
            {navLinks.map((item) => {
              const Icon = item.icon;
              if (item.isAiScout) {
                return (
                  <button
                    key={item.name}
                    onClick={() => setAiScoutOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/80 hover:bg-purple-100 dark:hover:bg-purple-900/60 shadow-xs transition-all hover:scale-105 shrink-0"
                    title="AI People Finder Bot"
                  >
                    <Sparkles size={13} className="text-purple-500 animate-pulse" />
                    <span>{item.name}</span>
                  </button>
                );
              }
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href!}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    active
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon size={14} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {user ? (
              <>
                {/* Messages */}
                <Link
                  to="/messages"
                  aria-label="Messages"
                  className={`p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    isActive('/messages') ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60' : ''
                  }`}
                >
                  <MessageSquare size={17} />
                </Link>

                {/* Network */}
                <Link
                  to="/network"
                  aria-label="Network Connections"
                  className={`p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    isActive('/network') ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60' : ''
                  }`}
                >
                  <Users size={17} />
                </Link>

                {/* Saved Items */}
                <Link
                  to="/saved"
                  aria-label="Saved items"
                  className={`p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    isActive('/saved') ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60' : ''
                  }`}
                >
                  <Bookmark size={17} />
                </Link>

                {/* Post Startup Action */}
                <Link
                  to="/startups/create"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-sm shadow-brand-500/20 transition-all hover:scale-105"
                >
                  <Plus size={14} />
                  <span>Post Idea</span>
                </Link>

                {/* Admin Quick Link */}
                {user.isAdmin && (
                  <Link
                    to="/admin"
                    title="Admin Moderation Portal"
                    className="p-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 transition-colors"
                  >
                    <Shield size={17} />
                  </Link>
                )}

                {/* User Avatar & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 p-1 rounded-full border-2 border-brand-500/40 hover:border-brand-500 transition-all focus:outline-none"
                  >
                    <img
                      src={user.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                      alt={user.profile?.fullName || user.email}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {user.profile?.fullName || 'Founder'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <LayoutDashboard size={15} />
                          <span>Dashboard</span>
                        </Link>
                        <Link
                          to={`/profile/${user.id}`}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <UserIcon size={15} />
                          <span>My Startup Profile</span>
                        </Link>
                        <Link
                          to="/saved"
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Bookmark size={15} />
                          <span>Saved Items</span>
                        </Link>
                        {user.isAdmin && (
                          <Link
                            to="/admin"
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Shield size={15} />
                            <span>Admin Panel</span>
                          </Link>
                        )}
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={logout}
                          className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <LogOut size={15} />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-xs font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-500 shadow-sm shadow-brand-500/20 transition-all hover:scale-105"
                >
                  Join StartupZ
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-3 pb-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search platform..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white"
            />
          </form>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              if (item.isAiScout) {
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAiScoutOpen(true);
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50"
                  >
                    <Sparkles size={16} className="text-purple-500" />
                    <span>AI - Scout</span>
                  </button>
                );
              }
              return (
                <Link
                  key={item.name}
                  to={item.href!}
                  className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Icon size={16} className="text-brand-500" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {user && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <Link
                to="/startups/create"
                className="flex-1 py-2 text-center text-xs font-bold text-white bg-brand-600 rounded-xl"
              >
                + Post Idea
              </Link>
              <Link
                to={`/profile/${user.id}`}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Profile
              </Link>
            </div>
          )}
        </div>
      )}
    </header>

    {/* AI Scout Modal - Mounted outside sticky/backdrop-blur header */}
    <AIScoutModal isOpen={aiScoutOpen} onClose={() => setAiScoutOpen(false)} />
  </>
  );
};
