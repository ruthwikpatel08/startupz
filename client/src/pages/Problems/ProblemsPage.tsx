import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Problem } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ProblemCard } from '../../components/problems/ProblemCard';
import { ProblemFilters } from '../../components/problems/ProblemFilters';
import { ShareProblemModal } from '../../components/problems/ShareProblemModal';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Globe,
  Sparkles,
  Shield,
  Plus,
  Flame,
  Award,
  Layers,
  HeartHandshake,
  Compass,
  Languages,
} from 'lucide-react';

// Multi-language translation dictionary for problem page UI
const i18nDictionary: Record<string, Record<string, string>> = {
  en: {
    heroBadge: 'Authoritative Global Challenges & SDGs',
    heroTitle: 'World-wide Problem Statements',
    heroSubtitle: 'What real-world crisis can you build a startup to solve? Explore verified challenges aggregated from the United Nations, WHO, and World Bank.',
    stat1Title: 'Active Challenges',
    stat1Desc: 'Peer-reviewed SDGs',
    stat2Title: 'Global Regions',
    stat2Desc: 'Worldwide Coverage',
    stat3Title: '100% Impact Driven',
    stat3Desc: 'Venture Solutions',
    createNew: '+ Add Problem (Admin)',
    noResultsTitle: 'No Problem Statements Found',
    noResultsDesc: 'Try adjusting your search keywords, clearing specific category filters, or broadening your region selection.',
    resetFilters: 'Reset All Filters',
  },
  es: {
    heroBadge: 'Desafíos Globales y ODS Oficiales',
    heroTitle: 'Declaraciones de Problemas Mundiales',
    heroSubtitle: '¿Qué crisis real del mundo puedes resolver creando una startup? Explora desafíos verificados de la ONU, la OMS y el Banco Mundial.',
    stat1Title: 'Desafíos Activos',
    stat1Desc: 'ODS verificados',
    stat2Title: 'Regiones Globales',
    stat2Desc: 'Cobertura Mundial',
    stat3Title: '100% Impacto',
    stat3Desc: 'Soluciones Emprendedoras',
    createNew: '+ Añadir Problema (Admin)',
    noResultsTitle: 'No se encontraron problemas',
    noResultsDesc: 'Intenta ajustar tus palabras clave de búsqueda o restablecer los filtros de categoría y región.',
    resetFilters: 'Restablecer Filtros',
  },
  hi: {
    heroBadge: 'संयुक्त राष्ट्र एवं विश्व स्वास्थ्य संगठन की वैश्विक चुनौतियाँ',
    heroTitle: 'वैश्विक समस्या विवरण (World-wide Problems)',
    heroSubtitle: 'आप किस वास्तविक वैश्विक समस्या को हल करने के लिए एक स्टार्टअप बना सकते हैं? यूएन, डब्लूएचओ और विश्व बैंक द्वारा सत्यापित चुनौतियों को खोजें।',
    stat1Title: 'सक्रिय चुनौतियाँ',
    stat1Desc: 'एसडीजी लक्ष्य',
    stat2Title: 'वैश्विक क्षेत्र',
    stat2Desc: 'विश्वव्यापी विस्तार',
    stat3Title: '100% प्रभावकारी',
    stat3Desc: 'उद्यमी समाधान',
    createNew: '+ समस्या जोड़ें (Admin)',
    noResultsTitle: 'कोई समस्या नहीं मिली',
    noResultsDesc: 'कृपया अपने खोज शब्दों को बदलें या फ़िल्टर साफ़ करें।',
    resetFilters: 'सभी फ़िल्टर रीसेट करें',
  },
};

// In-memory cache for instant subsequent opens
let cachedProblemsList: Problem[] = [];
let cachedProblemMetaObj: { categories: string[]; regions: string[]; tags: string[] } | null = null;

function getInitialProblems(): Problem[] {
  if (cachedProblemsList && cachedProblemsList.length > 0) return cachedProblemsList;
  try {
    const raw = sessionStorage.getItem('startupz_cached_problems');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedProblemsList = parsed;
        return parsed;
      }
    }
  } catch {}
  return [];
}

export const ProblemsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isInitialMount = React.useRef(true);

  const [problems, setProblems] = useState<Problem[]>(getInitialProblems);
  const [categories, setCategories] = useState<string[]>(() => cachedProblemMetaObj?.categories || []);
  const [regions, setRegions] = useState<string[]>(() => cachedProblemMetaObj?.regions || []);
  const [tags, setTags] = useState<string[]>(() => cachedProblemMetaObj?.tags || []);
  const [loading, setLoading] = useState<boolean>(() => getInitialProblems().length === 0);

  // Filter state synced with URL search params
  const [search, setSearch] = useState<string>(searchParams.get('q') || searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [selectedRegion, setSelectedRegion] = useState<string>(searchParams.get('region') || '');
  const [selectedImpact, setSelectedImpact] = useState<string>(searchParams.get('impact') || '');
  const [selectedTag, setSelectedTag] = useState<string>(searchParams.get('tag') || '');

  // i18n Language state
  const [currentLang, setCurrentLang] = useState<'en' | 'es' | 'hi'>('en');
  const t = i18nDictionary[currentLang] || i18nDictionary.en;

  // Share modal state
  const [sharingProblem, setSharingProblem] = useState<Problem | null>(null);

  // Fetch metadata once
  useEffect(() => {
    if (cachedProblemMetaObj) {
      setCategories(cachedProblemMetaObj.categories);
      setRegions(cachedProblemMetaObj.regions);
      setTags(cachedProblemMetaObj.tags);
      return;
    }
    api.getProblemMeta()
      .then((res) => {
        if (res) {
          const cats = res.categories ? res.categories.map((c: any) => c.name || c) : [];
          const regs = res.regions ? res.regions.map((r: any) => r.name || r) : [];
          const tgs = res.tags ? res.tags.map((t: any) => t.name || t) : [];
          setCategories(cats);
          setRegions(regs);
          setTags(tgs);
          cachedProblemMetaObj = { categories: cats, regions: regs, tags: tgs };
        }
      })
      .catch((err) => console.warn('Could not load problem metadata:', err));
  }, []);

  // Fetch problems based on filter parameters
  const fetchProblems = async () => {
    // Only show full loading skeleton if we don't already have problems rendered
    if (problems.length === 0 && (!cachedProblemsList || cachedProblemsList.length === 0)) {
      setLoading(true);
    }
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategory) params.category = selectedCategory;
      if (selectedRegion) params.region = selectedRegion;
      if (selectedImpact) params.impact = selectedImpact;
      if (selectedTag) params.tag = selectedTag;

      const res = await api.getProblems(params);
      const list = Array.isArray(res) ? res : res?.problems || [];
      setProblems(list);
      if (!search.trim() && !selectedCategory && !selectedRegion && !selectedImpact && !selectedTag && list.length > 0) {
        cachedProblemsList = list;
        try {
          sessionStorage.setItem('startupz_cached_problems', JSON.stringify(list));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchProblems();
      return;
    }
    const handler = setTimeout(() => {
      fetchProblems();
    }, 200);
    return () => clearTimeout(handler);
  }, [search, selectedCategory, selectedRegion, selectedImpact, selectedTag]);

  // Sync state to URL params for deep-linking & SEO
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (search.trim()) nextParams.set('q', search.trim());
    if (selectedCategory) nextParams.set('category', selectedCategory);
    if (selectedRegion) nextParams.set('region', selectedRegion);
    if (selectedImpact) nextParams.set('impact', selectedImpact);
    if (selectedTag) nextParams.set('tag', selectedTag);

    setSearchParams(nextParams, { replace: true });
  }, [search, selectedCategory, selectedRegion, selectedImpact, selectedTag]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedRegion('');
    setSelectedImpact('');
    setSelectedTag('');
  };

  const handleSaveToggle = (problemId: string, isSaved: boolean) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === problemId ? { ...p, isSaved } : p))
    );
  };

  const handleDeleteProblem = async (problemId: string) => {
    if (!window.confirm('Are you sure you want to delete this problem statement?')) {
      return;
    }
    try {
      await api.deleteProblem(problemId);
      setProblems((prev) => prev.filter((p) => p.id !== problemId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete problem statement.');
    }
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 space-y-8">
      
      {/* Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Hero Section */}
        <div className="card-base p-6 sm:p-8 bg-white dark:bg-dark-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-3xl space-y-3.5">
              
              {/* Badge & Language Toggle */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60">
                  <Globe size={13} className="text-brand-600 dark:text-brand-400" />
                  <span>{t.heroBadge}</span>
                </div>

                {/* i18n Selector */}
                <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 text-xs font-medium">
                  <Languages size={13} className="text-slate-500 dark:text-slate-400 ml-1.5" />
                  <button
                    onClick={() => setCurrentLang('en')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      currentLang === 'en' ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setCurrentLang('es')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      currentLang === 'es' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ES
                  </button>
                  <button
                    onClick={() => setCurrentLang('hi')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      currentLang === 'hi' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    HI
                  </button>
                </div>
              </div>

              {/* Main Heading */}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                {t.heroTitle}
              </h1>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {t.heroSubtitle}
              </p>

              {/* Stats Ticker */}
              <div className="grid grid-cols-3 gap-4 pt-2 max-w-md">
                <div className="border-l-2 border-brand-500 pl-3">
                  <div className="text-lg font-bold text-white">10+</div>
                  <div className="text-[11px] text-slate-400 font-medium">{t.stat1Desc}</div>
                </div>
                <div className="border-l-2 border-slate-700 pl-3">
                  <div className="text-lg font-bold text-white">9</div>
                  <div className="text-[11px] text-slate-400 font-medium">{t.stat2Desc}</div>
                </div>
                <div className="border-l-2 border-slate-700 pl-3">
                  <div className="text-lg font-bold text-white">AI-Native</div>
                  <div className="text-[11px] text-slate-400 font-medium">{t.stat3Desc}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions (Admin Create & Co-Founder matching) */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
              {user?.isAdmin && (
                <Link
                  to="/admin/problems/create"
                  className="btn-primary py-2 px-4 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>{t.createNew}</span>
                </Link>
              )}

              <Link
                to="/cofounders"
                className="btn-secondary py-2 px-4 text-xs font-medium inline-flex items-center justify-center gap-1.5"
              >
                <HeartHandshake size={14} className="text-brand-500" />
                <span>Find Teammates by Mission</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Search & Filters Section */}
        <ProblemFilters
          search={search}
          onSearchChange={setSearch}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          selectedImpact={selectedImpact}
          onImpactChange={setSelectedImpact}
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
          categories={categories}
          regions={regions}
          tags={tags}
          totalResults={problems.length}
          onReset={handleResetFilters}
        />

        {/* Problems Grid / Loading / Empty State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-80 card-base p-6 animate-pulse space-y-4"
              >
                <div className="h-5 w-1/3 bg-slate-200 dark:bg-dark-800 rounded" />
                <div className="h-5 w-3/4 bg-slate-200 dark:bg-dark-800 rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                </div>
                <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl mt-6" />
              </div>
            ))}
          </div>
        ) : problems.length === 0 ? (
          <EmptyState
            icon={Compass}
            title={t.noResultsTitle}
            description={t.noResultsDesc}
            actionLabel={t.resetFilters}
            onAction={handleResetFilters}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onSaveToggle={handleSaveToggle}
                onDelete={handleDeleteProblem}
                onShare={(prob) => setSharingProblem(prob)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareProblemModal
        isOpen={Boolean(sharingProblem)}
        problem={sharingProblem}
        onClose={() => setSharingProblem(null)}
      />
    </div>
  );
};
