import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import {
  Rocket,
  Compass,
  Users,
  Briefcase,
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
  ChevronDown,
  TrendingUp,
  Megaphone,
  BriefcaseBusiness,
  Crown,
  LogIn,
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
  const [coFoundersDropdownOpen, setCoFoundersDropdownOpen] = useState(false);
  const [opportunitiesDropdownOpen, setOpportunitiesDropdownOpen] = useState(false);

  // Mobile accordion state
  const [mobileCoFoundersOpen, setMobileCoFoundersOpen] = useState(true);
  const [mobileOpportunitiesOpen, setMobileOpportunitiesOpen] = useState(true);

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [aiScoutOpen, setAiScoutOpen] = useState(false);

  const coFoundersRef = useRef<HTMLDivElement>(null);
  const opportunitiesRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (coFoundersRef.current && !coFoundersRef.current.contains(target)) {
        setCoFoundersDropdownOpen(false);
      }
      if (opportunitiesRef.current && !opportunitiesRef.current.contains(target)) {
        setOpportunitiesDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCoFoundersDropdownOpen(false);
        setOpportunitiesDropdownOpen(false);
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close all dropdowns and mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    setCoFoundersDropdownOpen(false);
    setOpportunitiesDropdownOpen(false);
  }, [location.pathname, location.search]);

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

  const coFoundersDropdownItems = [
    { name: 'Founders', categoryKey: 'founders', href: '/cofounders?category=founders', description: 'Active founders building startups', icon: Rocket },
    { name: 'Co-Founders', categoryKey: 'cofounders', href: '/cofounders?category=cofounders', description: 'Builders seeking synergy', icon: Users },
    { name: 'Marketers', categoryKey: 'marketers', href: '/cofounders?category=marketers', description: 'Growth & demand leads', icon: Megaphone },
    { name: 'Investors', categoryKey: 'investors', href: '/cofounders?category=investors', description: 'Venture funds & angel backers', icon: TrendingUp },
    { name: 'Other', categoryKey: 'other', href: '/cofounders?category=other', description: 'Engineers, designers & advisors', icon: BriefcaseBusiness },
  ];

  const opportunitiesDropdownItems = [
    { name: 'Internships', typeKey: 'internships', href: '/opportunities?type=internships', description: 'Hands-on startup training roles', icon: GraduationCap },
    { name: 'Jobs', typeKey: 'jobs', href: '/opportunities?type=jobs', description: 'Full-time & part-time positions', icon: Briefcase },
  ];

  const otherNavLinks = [
    { name: 'Memberships', href: '/memberships', icon: Crown },
    { name: 'Graveyard', href: '/failed-startups', icon: Skull },
    { name: 'Mentors', href: '/mentors', icon: GraduationCap },
    { name: 'Problem Statements', href: '/problems', icon: Globe },
    { name: 'Feed', href: '/feed', icon: Share2 },
  ];

  const isCoFoundersActive = location.pathname.startsWith('/cofounders');
  const isOpportunitiesActive = location.pathname.startsWith('/opportunities');
  const isActive = (path?: string) => path ? location.pathname === path : false;

  const currentCategoryParam = new URLSearchParams(location.search).get('category')?.toLowerCase();
  const currentTypeParam = new URLSearchParams(location.search).get('type')?.toLowerCase();

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Brand Logo */}
            <Link
              to={user ? '/dashboard' : '/'}
              title="StartupZ"
              className="flex items-center gap-2.5 shrink-0 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-110 group-active:scale-95 transition-all">
                <Rocket size={18} className="transform -rotate-12 group-hover:-translate-y-0.5 transition-transform" />
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
            <nav className="hidden lg:flex items-center space-x-1 overflow-visible">
              {/* 1. AI-Scout */}
              <button
                onClick={() => setAiScoutOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/80 hover:bg-purple-100 dark:hover:bg-purple-900/60 shadow-xs transition-all hover:scale-105 shrink-0"
                title="AI People Finder Bot"
              >
                <Sparkles size={13} className="text-purple-500 animate-pulse" />
                <span>AI - Scout</span>
              </button>

              {/* 2. Startups */}
              <Link
                to="/startups"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  isActive('/startups')
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Compass size={14} />
                <span>Startups</span>
              </Link>

              {/* 3. Co-Founders Dropdown ▼ */}
              <div
                ref={coFoundersRef}
                className="relative shrink-0"
                onMouseEnter={() => setCoFoundersDropdownOpen(true)}
                onMouseLeave={() => setCoFoundersDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCoFoundersDropdownOpen((prev) => !prev);
                    setOpportunitiesDropdownOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isCoFoundersActive
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  aria-expanded={coFoundersDropdownOpen}
                  aria-haspopup="true"
                >
                  <Users size={14} />
                  <span>Co - Founders</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${
                      coFoundersDropdownOpen ? 'transform rotate-180 text-brand-500' : 'text-slate-400'
                    }`}
                  />
                </button>

                {coFoundersDropdownOpen && (
                  <div className="absolute top-full left-0 pt-1.5 z-50">
                    <div className="w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                        Co-Founder Network
                      </div>
                      {coFoundersDropdownItems.map((item) => {
                        const Icon = item.icon;
                        const isOptionActive =
                          isCoFoundersActive &&
                          (currentCategoryParam === item.categoryKey ||
                            (!currentCategoryParam && item.categoryKey === 'cofounders'));
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setCoFoundersDropdownOpen(false)}
                            className={`flex items-start gap-2.5 px-3 py-2 mx-1.5 rounded-xl text-xs transition-colors ${
                              isOptionActive
                                ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                            }`}
                          >
                            <Icon size={14} className={`mt-0.5 shrink-0 ${isOptionActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs leading-tight">{item.name}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-normal">{item.description}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Opportunities Dropdown ▼ */}
              <div
                ref={opportunitiesRef}
                className="relative shrink-0"
                onMouseEnter={() => setOpportunitiesDropdownOpen(true)}
                onMouseLeave={() => setOpportunitiesDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpportunitiesDropdownOpen((prev) => !prev);
                    setCoFoundersDropdownOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isOpportunitiesActive
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  aria-expanded={opportunitiesDropdownOpen}
                  aria-haspopup="true"
                >
                  <Briefcase size={14} />
                  <span>Opportunities</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${
                      opportunitiesDropdownOpen ? 'transform rotate-180 text-brand-500' : 'text-slate-400'
                    }`}
                  />
                </button>

                {opportunitiesDropdownOpen && (
                  <div className="absolute top-full left-0 pt-1.5 z-50">
                    <div className="w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                        Startup Opportunities
                      </div>
                      {opportunitiesDropdownItems.map((item) => {
                        const Icon = item.icon;
                        const isOptionActive =
                          isOpportunitiesActive &&
                          currentTypeParam === item.typeKey;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setOpportunitiesDropdownOpen(false)}
                            className={`flex items-start gap-2.5 px-3 py-2 mx-1.5 rounded-xl text-xs transition-colors ${
                              isOptionActive
                                ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                            }`}
                          >
                            <Icon size={14} className={`mt-0.5 shrink-0 ${isOptionActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs leading-tight">{item.name}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-normal">{item.description}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Remaining Items in order: Graveyard, Mentors, Problem Statements, Feed */}
              {otherNavLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
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
                  <div ref={profileRef} className="relative">
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
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <LayoutDashboard size={15} />
                            <span>Dashboard</span>
                          </Link>
                          <Link
                            to={`/profile/${user.id}`}
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <UserIcon size={15} />
                            <span>My Startup Profile</span>
                          </Link>
                          <Link
                            to="/saved"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Bookmark size={15} />
                            <span>Saved Items</span>
                          </Link>
                          {user.isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Shield size={15} />
                              <span>Admin Panel</span>
                            </Link>
                          )}
                        </div>

                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => {
                              setProfileDropdownOpen(false);
                              logout();
                            }}
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
                <div className="flex items-center gap-2.5">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all"
                  >
                    <LogIn size={13} className="text-slate-400" />
                    <span>Log In</span>
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 hover:from-brand-500 hover:to-indigo-500 shadow-md shadow-brand-500/20 transition-all hover:scale-105 shrink-0"
                  >
                    <Sparkles size={13} className="text-brand-200" />
                    <span>Join StartupZ</span>
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden px-4 pt-3 pb-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 max-h-[85vh] overflow-y-auto">
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

            {/* Quick Primary Links */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAiScoutOpen(true);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50"
              >
                <Sparkles size={16} className="text-purple-500" />
                <span>AI - Scout</span>
              </button>
              <Link
                to="/startups"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Compass size={16} className="text-brand-500" />
                <span>Startups</span>
              </Link>
            </div>

            {/* Co-Founders Mobile Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 bg-slate-50/60 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setMobileCoFoundersOpen(!mobileCoFoundersOpen)}
                className="flex items-center justify-between w-full text-xs font-bold text-slate-900 dark:text-white pb-1.5"
              >
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-brand-500" />
                  <span>Co - Founders</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${mobileCoFoundersOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileCoFoundersOpen && (
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  {coFoundersDropdownItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 flex items-center gap-1.5"
                    >
                      <item.icon size={12} className="text-slate-400" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Opportunities Mobile Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 bg-slate-50/60 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setMobileOpportunitiesOpen(!mobileOpportunitiesOpen)}
                className="flex items-center justify-between w-full text-xs font-bold text-slate-900 dark:text-white pb-1.5"
              >
                <div className="flex items-center gap-2">
                  <Briefcase size={15} className="text-cyan-500" />
                  <span>Opportunities</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${mobileOpportunitiesOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileOpportunitiesOpen && (
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  {opportunitiesDropdownItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 flex items-center gap-1.5"
                    >
                      <item.icon size={12} className="text-slate-400" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Other Nav Links (Memberships, Graveyard, Mentors, Problems, Feed) */}
            <div className="grid grid-cols-2 gap-2">
              {otherNavLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Icon size={16} className="text-brand-500" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Auth / Profile Section */}
            {!user ? (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2.5">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2.5 text-center text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-xl"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2.5 text-center text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 rounded-xl shadow-md shadow-brand-500/20"
                >
                  Join StartupZ
                </Link>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <Link
                  to="/startups/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-xs font-bold text-white bg-brand-600 rounded-xl"
                >
                  + Post Idea
                </Link>
                <Link
                  to={`/profile/${user.id}`}
                  onClick={() => setMobileMenuOpen(false)}
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
