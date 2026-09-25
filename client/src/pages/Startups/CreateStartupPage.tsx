import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Rocket, ShieldAlert, Sparkles, Lock, ArrowRight } from 'lucide-react';
import { StartupStage } from '../../types';

export const CreateStartupPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [oneLineDescription, setOneLineDescription] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [targetCustomers, setTargetCustomers] = useState('');
  const [industry, setIndustry] = useState('AI');
  const [businessModel, setBusinessModel] = useState('B2B SaaS');
  const [stage, setStage] = useState<StartupStage>('Idea');
  const [location, setLocation] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [fundingStatus, setFundingStatus] = useState('Bootstrapped');
  const [fundingRequired, setFundingRequired] = useState('');
  const [currentTraction, setCurrentTraction] = useState('');
  const [website, setWebsite] = useState('');
  const [demoLink, setDemoLink] = useState('');
  const [pitchDeckUrl, setPitchDeckUrl] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'CONNECTIONS_ONLY' | 'PRIVATE'>('PUBLIC');
  const [isConfidential, setIsConfidential] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.createStartup({
        name,
        logo: logo || undefined,
        oneLineDescription,
        problem,
        solution,
        targetCustomers,
        industry,
        businessModel,
        stage,
        location,
        requiredSkills,
        fundingStatus,
        fundingRequired,
        currentTraction,
        website,
        demoLink,
        pitchDeckUrl,
        visibility,
        isConfidential,
      });

      navigate(`/startups/${res.startup.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create startup venture.');
    } finally {
      setLoading(false);
    }
  };

  const industries = ['AI', 'AgTech', 'HealthTech', 'ClimateTech', 'EdTech', 'FinTech', 'B2B SaaS', 'Consumer Tech', 'Robotics', 'Other'];
  const stages: StartupStage[] = ['Idea', 'Validation', 'MVP', 'Early Revenue', 'Growth', 'Fundraising'];
  const businessModels = ['B2B SaaS', 'B2C Subscription', 'Marketplace', 'D2C', 'Enterprise', 'Freemium', 'Usage-based API'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Rocket className="text-brand-600" size={28} /> Publish Startup Idea or Venture
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Publish your venture on StartupZ to discover co-founders, early teammates, and investor interest.
        </p>
      </div>

      {/* IP Protection Notice */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
        <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="font-bold">Privacy & Idea Protection Advisory:</p>
          <p className="leading-relaxed">
            StartupZ does not automatically enforce NDAs or legal patents. Focus on sharing your problem, market insight, and execution vision without disclosing sensitive proprietary algorithms or trade secrets. You can set visibility to "Connections Only" or toggle "Confidential Idea".
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Startup Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. FarmConnect"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Industry Sector *
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              One-Line Pitch / Elevator Summary *
            </label>
            <input
              type="text"
              required
              value={oneLineDescription}
              onChange={(e) => setOneLineDescription(e.target.value)}
              placeholder="e.g. AI-powered agronomic advisory platform delivering real-time crop disease detection."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Problem & Solution */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              The Problem You're Solving *
            </label>
            <textarea
              rows={3}
              required
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="What painful friction or loss does the customer experience today?"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Your Solution & Technology *
            </label>
            <textarea
              rows={3}
              required
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="How does your product solve this problem 10x better or cheaper?"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Target Customers & Business Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Target Customers
              </label>
              <input
                type="text"
                value={targetCustomers}
                onChange={(e) => setTargetCustomers(e.target.value)}
                placeholder="e.g. Commercial farmers, B2B SaaS SMBs"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Business Model
              </label>
              <select
                value={businessModel}
                onChange={(e) => setBusinessModel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {businessModels.map((bm) => (
                  <option key={bm} value={bm}>
                    {bm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stage, Location, Required Skills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Venture Stage *
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as StartupStage)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {stages.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Headquarters / Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Austin, TX or Remote"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Funding Status
              </label>
              <input
                type="text"
                value={fundingStatus}
                onChange={(e) => setFundingStatus(e.target.value)}
                placeholder="e.g. Bootstrapped / Pre-Seed"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Required Skills (comma separated)
            </label>
            <input
              type="text"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="e.g. AI Developer, Full Stack Engineer, Growth Marketer"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Links & Traction */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Funding Target ($)
              </label>
              <input
                type="text"
                value={fundingRequired}
                onChange={(e) => setFundingRequired(e.target.value)}
                placeholder="e.g. $250,000"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Demo Link
              </label>
              <input
                type="url"
                value={demoLink}
                onChange={(e) => setDemoLink(e.target.value)}
                placeholder="https://demo..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Current Traction / Milestones
            </label>
            <input
              type="text"
              value={currentTraction}
              onChange={(e) => setCurrentTraction(e.target.value)}
              placeholder="e.g. 500 active beta users, 12 signed LOIs, $3k MRR"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white"
            />
          </div>

          {/* Privacy & Confidentiality Settings */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Visibility & Confidentiality
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Audience Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="w-full py-2 px-3 text-xs rounded-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="PUBLIC">Public (Visible across StartupZ)</option>
                  <option value="CONNECTIONS_ONLY">Connections Only</option>
                  <option value="PRIVATE">Private (Only You & Team)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="confidential"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded"
                />
                <label htmlFor="confidential" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mark as Confidential Idea
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
          >
            {loading ? (
              'Publishing Venture...'
            ) : (
              <>
                <Rocket size={16} />
                <span>Publish Startup Profile</span>
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
};
