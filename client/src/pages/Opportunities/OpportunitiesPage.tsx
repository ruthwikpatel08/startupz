import React, { useState } from 'react';
import { RefreshCw, ArrowUpRight, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { SEO } from '../../components/common/SEO';

type Statement = { title: string; description: string; tags?: string[]; sourceUrl?: string };
export const OpportunitiesPage: React.FC = () => {
  const [domain, setDomain] = useState('Education');
  const [problems, setProblems] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const generate = async () => {
    setLoading(true); setError('');
    try {
      const result = await api.discoverAIProblems(`${domain}: accessible real-world problems for student hackathons and collaborative projects`);
      if (!Array.isArray(result.problems)) throw new Error('Invalid problem response');
      setProblems(result.problems.filter(p => typeof p.title === 'string' && typeof p.description === 'string'));
      setLoaded(true);
    } catch { setError('Problem statements could not be loaded. Please try again.'); }
    finally { setLoading(false); }
  };
  return <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 w-full">
    <SEO title="Problem Statements | HookZ" description="Find a real-world challenge for your next hackathon or student project." />
    <span className="text-xs font-semibold tracking-widest text-[var(--brand-primary)]">BUILD SOMETHING THAT MATTERS</span>
    <h1 className="text-4xl sm:text-5xl mt-4">Problem Statements</h1>
    <p className="theme-muted mt-4 max-w-xl leading-relaxed">Find a challenge worth solving. Explore real-world problems for your next hackathon or collaborative project.</p>
    <div className="flex flex-wrap items-end gap-3 my-8"><div><label htmlFor="problem-domain" className="block text-sm mb-2">Domain</label><select id="problem-domain" className="input-base" value={domain} onChange={e => setDomain(e.target.value)} disabled={loading}>{['Education', 'Accessibility', 'Climate', 'Healthcare', 'Agriculture', 'Campus life'].map(d => <option key={d}>{d}</option>)}</select></div><button className="btn-primary" onClick={generate} disabled={loading}>{loading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}{loading ? 'Finding problems…' : loaded ? 'Refresh statements' : 'Generate statements'}</button></div>
    <p className="text-xs theme-muted mb-6">Powered by the existing Gemini discovery pipeline, with curated fallback challenges. Review source material before using generated claims.</p>
    {error && <p role="alert" className="card-base p-5 text-rose-600 dark:text-rose-300 mb-6">{error}</p>}
    {loading && <p role="status" className="card-base p-8">Finding challenges your team can tackle…</p>}
    {!loading && !problems.length && <div className="card-base p-10 text-center"><h2 className="text-xl">{loaded ? 'No statements found' : 'Your next project starts with a good question.'}</h2><p className="theme-muted mt-3">Choose a domain and generate a set of problem statements.</p></div>}
    {!loading && <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">{problems.map((p, i) => {
      let source = ''; try { const url = new URL(p.sourceUrl || ''); if (['https:', 'http:'].includes(url.protocol)) source = url.href; } catch { /* No source link when the model returns an invalid URL. */ }
      return <article key={`${p.title}-${i}`} className="card-base p-6 flex flex-col gap-4"><span className="text-xs text-[var(--brand-primary)]">CHALLENGE {String(i + 1).padStart(2, '0')}</span><h2 className="text-2xl">{p.title}</h2><p className="text-sm theme-muted leading-relaxed line-clamp-4">{p.description}</p><div className="flex flex-wrap gap-2">{(Array.isArray(p.tags) ? p.tags.filter(t => typeof t === 'string') : []).slice(0, 4).map(tag => <span key={tag} className="text-xs rounded-lg bg-[var(--brand-soft)] px-2 py-1 text-[var(--brand-primary)]">{tag}</span>)}</div><details className="text-sm mt-auto"><summary className="font-semibold text-[var(--brand-primary)]">View statement</summary><p className="mt-3 leading-relaxed theme-muted">{p.description}</p>{source && <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex gap-2 items-center mt-4 underline">Read source <ArrowUpRight size={14} /></a>}</details></article>;
    })}</div>}
  </section>;
};
