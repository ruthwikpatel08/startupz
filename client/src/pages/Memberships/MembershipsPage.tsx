import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, Crown, ShieldCheck, Sparkles, Rocket, ArrowRight, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const MembershipsPage: React.FC = () => {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      tagline: 'Ideal for aspiring builders & curious minds exploring the startup ecosystem.',
      priceMonthly: 0,
      priceAnnual: 0,
      popular: false,
      icon: Rocket,
      badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      buttonVariant: 'secondary',
      features: [
        'Full Directory Access (Startups & Problems)',
        '3 Co-Founder Connection Requests / month',
        '5 AI Scout Bot Searches / month',
        'Public Startup Feed & Community Posts',
        'Standard User Profile',
        'Community Forum Participation',
      ],
      notIncluded: [
        'Direct Investor Introductions',
        'Priority Directory Placement',
        'Verified Founder Badge',
        'Unlimited AI Scout Queries',
      ],
    },
    {
      id: 'standard',
      name: 'Standard',
      tagline: 'Built for active founders, co-founders & growth marketers ready to scale.',
      priceMonthly: 29,
      priceAnnual: 24,
      popular: true,
      icon: Zap,
      badgeColor: 'bg-brand-500 text-white shadow-md shadow-brand-500/20',
      buttonVariant: 'primary',
      features: [
        'Unlimited Co-Founder & Team Connection Requests',
        '100 AI Scout Queries / month',
        'Post Up to 5 Startup Ideas & Job Opportunities',
        'Direct Messaging & Video Call Invites',
        'Priority Search & Directory Placement',
        'Verified Startup Founder Badge',
        'Access to Mentors & Advisor Directory',
        'Save & Bookmark Pitch Decks',
      ],
      notIncluded: [
        'Featured Landing Page Spotlight',
        'Direct Investor Matchmaking & Warm Intros',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      tagline: 'For funded startups, scale-ups & serious founders seeking top venture backing.',
      priceMonthly: 99,
      priceAnnual: 79,
      popular: false,
      icon: Crown,
      badgeColor: 'bg-amber-500 text-white shadow-md shadow-amber-500/20',
      buttonVariant: 'accent',
      features: [
        'Everything in Standard Tier',
        'Unlimited AI Scout Bot Queries & Talent Sourcing',
        'Direct Investor Matchmaking & Warm Intro Requests',
        'Featured Spotlight on StartupZ Landing Page',
        'Unlimited Job, Internship & Co-Founder Posts',
        '1-on-1 Dedicated Startup Mentor Sessions',
        'Priority Pitch Deck Review & Feedback',
        'Exclusive Investor Office Hours Access',
        '24/7 Priority Founder Support',
      ],
      notIncluded: [],
    },
  ];

  const faqs = [
    {
      q: 'Can I upgrade or downgrade my membership anytime?',
      a: 'Yes! You can upgrade, downgrade, or cancel your membership plan at any time directly from your dashboard settings. Upgrades take effect immediately.',
    },
    {
      q: 'What is the AI Scout Bot included in plans?',
      a: 'AI Scout is our intelligent matching assistant that analyzes founder skills, startup goals, and investor thesis to connect you with the exact people you need.',
    },
    {
      q: 'Are investor warm introductions guaranteed in Premium?',
      a: 'Premium members receive targeted matchmaking suggestions and intro requests forwarded directly to verified angel investors and venture funds in our network.',
    },
    {
      q: 'Is there a free trial for Standard or Premium?',
      a: 'You can start on the Basic tier for 100% free with no credit card required. Upgrade whenever your startup is ready to accelerate.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-16">

        {/* Header Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} className="text-brand-500 animate-pulse" />
            <span>StartupZ Membership Plans</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Accelerate Your Startup Journey
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Choose the right tier to find co-founders, hire top talent, connect with verified investors, and leverage AI matchmaking.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
              Monthly Billing
            </span>

            <button
              type="button"
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-300 dark:bg-slate-700 transition-colors duration-200 ease-in-out focus:outline-none"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-brand-600 shadow-md ring-0 transition duration-200 ease-in-out ${
                  billingCycle === 'annual' ? 'translate-x-6 bg-brand-500' : 'translate-x-0 bg-white'
                }`}
              />
            </button>

            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${billingCycle === 'annual' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                Annual Billing
              </span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-full">
                Save 20%
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl p-8 bg-white dark:bg-slate-900 border transition-all duration-300 hover:shadow-2xl ${
                  plan.popular
                    ? 'border-2 border-brand-500 shadow-xl shadow-brand-500/10 scale-102 z-10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md">
                    Most Popular Choice
                  </div>
                )}

                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-2xl ${plan.badgeColor}`}>
                        <Icon size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h2>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[36px] mb-6">
                    {plan.tagline}
                  </p>

                  {/* Price */}
                  <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                        ${price}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        / month {billingCycle === 'annual' && plan.priceAnnual > 0 ? '(billed annually)' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Included Features */}
                  <div className="space-y-3 mb-8">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      What's Included:
                    </p>
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                        <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}

                    {plan.notIncluded.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-400 dark:text-slate-600 line-through">
                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 mt-0.5 flex items-center justify-center text-[10px]">
                          ✕
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={user ? '/dashboard' : '/register'}
                    className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-md ${
                      plan.buttonVariant === 'primary'
                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-brand-500/25 hover:scale-102'
                        : plan.buttonVariant === 'accent'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/25 hover:scale-102'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{plan.priceMonthly === 0 ? 'Get Started Free' : `Upgrade to ${plan.name}`}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-bold text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-500" />
              <span>Verified Ecosystem Profiles</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              <span>Instant AI Scout Bot Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-purple-500" />
              <span>Cancel or Change Plan Anytime</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <HelpCircle size={22} className="text-brand-500" />
              <span>Frequently Asked Questions</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Have questions about StartupZ memberships? Here are common answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5"
              >
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{faq.q}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
