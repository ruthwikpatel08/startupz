import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, Crown, ShieldCheck, Sparkles, Rocket, ArrowRight, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SEO } from '../../components/common/SEO';

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
        'Featured Spotlight on HookZ Landing Page',
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
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Ecosystem Memberships & Tiers | HookZ"
        description="Choose the right tier to match with co-founders, hire technical builders, pitch verified investors, and access platform discovery tools on HookZ."
        canonicalPath="/memberships"
        breadcrumbs={[{ name: 'Memberships', path: '/memberships' }]}
      />
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/40 border border-brand-200/50 dark:border-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-semibold">
            <Sparkles size={13} className="text-brand-600 dark:text-brand-400" />
            <span>Membership Plans</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Accelerate Your Startup Journey
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Choose the right tier to match with co-founders, hire technical builders, pitch verified investors, and access platform discovery tools.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-3 flex items-center justify-center gap-2.5">
            <span className={`text-xs font-medium ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
              Monthly
            </span>

            <button
              type="button"
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 dark:bg-dark-800 transition-colors duration-150 ease-in-out focus:outline-none"
              aria-label="Toggle billing cycle"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-brand-600 transition duration-150 ease-in-out ${
                  billingCycle === 'annual' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>

            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${billingCycle === 'annual' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                Annual
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50 rounded">
                Save 20%
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between card-base p-6 transition-colors ${
                  plan.popular
                    ? 'border-brand-600 dark:border-brand-500 shadow-xs'
                    : 'hover:border-slate-300 dark:hover:border-dark-700'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-brand-600 text-white shadow-xs">
                    Most Popular
                  </div>
                )}

                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-dark-850 flex items-center justify-center text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-dark-800">
                        <Icon size={16} />
                      </div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h2>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[32px] mb-5">
                    {plan.tagline}
                  </p>

                  {/* Price */}
                  <div className="mb-5 pb-5 border-b border-slate-100 dark:border-dark-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                        ${price}
                      </span>
                      <span className="text-xs font-normal text-slate-400">
                        / month {billingCycle === 'annual' && plan.priceAnnual > 0 ? '(billed annually)' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Included Features */}
                  <div className="space-y-2.5 mb-6">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      What's Included:
                    </p>
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}

                    {plan.notIncluded.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-400 line-through">
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-dark-700 shrink-0 mt-0.5 flex items-center justify-center text-[9px]">
                          ✕
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-dark-800">
                  <Link
                    to={user ? '/' : '/register'}
                    className={`w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-semibold rounded-md transition-colors ${
                      plan.popular
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    <span>{plan.priceMonthly === 0 ? 'Get Started Free' : `Upgrade to ${plan.name}`}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust Badges */}
        <div className="card-base p-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-brand-600 dark:text-brand-400" />
              <span>Verified Ecosystem Profiles</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-brand-600 dark:text-brand-400" />
              <span>Instant AI Scout Bot Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-brand-600 dark:text-brand-400" />
              <span>Cancel or Change Plan Anytime</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
              <HelpCircle size={18} className="text-brand-600 dark:text-brand-400" />
              <span>Frequently Asked Questions</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Common questions about HookZ memberships and features.
            </p>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="card-base p-3.5 space-y-1"
              >
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{faq.q}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
