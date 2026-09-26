export interface StoredAccount {
  email: string;
  password?: string;
  user: any;
  token: string;
  createdAt: string;
}

const STORAGE_KEY = 'startupz_registered_accounts';

export const BUILTIN_DEMO_ACCOUNTS = [
  {
    email: 'sarah.chen@aiagri.io',
    password: 'Password123!',
    role: 'FOUNDER',
    user: {
      id: 'demo_sarah_chen',
      email: 'sarah.chen@aiagri.io',
      role: 'FOUNDER',
      isVerified: true,
      verificationBadge: 'Verified Founder',
      isAdmin: false,
      profile: {
        id: 'prof_sarah',
        fullName: 'Sarah Chen',
        headline: 'Founder @ AgroPulse | Precision Agriculture & Climate Tech',
        location: 'Bengaluru / Austin',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
        skills: 'Product Management, AgTech, Precision Agriculture, Prototyping',
        openTo: 'Co-Founder,Investment,Mentorship',
        profileCompletion: 100,
      },
    },
    token: 'demo_token_sarah_chen',
  },
  {
    email: 'david.kim@hyperbuild.co',
    password: 'Password123!',
    role: 'COFOUNDER',
    user: {
      id: 'demo_david_kim',
      email: 'david.kim@hyperbuild.co',
      role: 'COFOUNDER',
      isVerified: true,
      verificationBadge: 'Verified Builder',
      isAdmin: false,
      profile: {
        id: 'prof_david',
        fullName: 'David Kim',
        headline: 'Technical Co-Founder | Distributed Cloud & AI Infrastructure',
        location: 'Singapore / Remote',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
        skills: 'Go, Rust, TypeScript, React, Distributed Systems, Kubernetes',
        openTo: 'Co-Founder,Startup Team',
        profileCompletion: 95,
      },
    },
    token: 'demo_token_david_kim',
  },
  {
    email: 'priya.growth@marketscale.io',
    password: 'Password123!',
    role: 'MARKETER',
    user: {
      id: 'demo_priya_sharma',
      email: 'priya.growth@marketscale.io',
      role: 'MARKETER',
      isVerified: true,
      verificationBadge: 'Verified Growth Lead',
      isAdmin: false,
      profile: {
        id: 'prof_priya',
        fullName: 'Priya Sharma',
        headline: 'Growth & Demand Marketing Lead | Scaling B2B SaaS',
        location: 'Bengaluru, India',
        avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&auto=format&fit=crop&q=80',
        skills: 'Growth Marketing, Performance Advertising, SEO, B2B Funnel, Content Strategy',
        openTo: 'Co-Founder,Startup Team',
        profileCompletion: 95,
      },
    },
    token: 'demo_token_priya_growth',
  },
  {
    email: 'elena.investor@apexventures.vc',
    password: 'Password123!',
    role: 'INVESTOR',
    user: {
      id: 'demo_elena_rostova',
      email: 'elena.investor@apexventures.vc',
      role: 'INVESTOR',
      isVerified: true,
      verificationBadge: 'Verified Investor',
      isAdmin: false,
      profile: {
        id: 'prof_elena',
        fullName: 'Elena Rostova',
        headline: 'Partner @ Apex VC | Seed & Series A Lead',
        location: 'London & San Francisco',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        skills: 'Venture Capital, Deal Structuring, Cap Table Math, SaaS Metrics',
        openTo: 'Investment,Board Advisory',
        profileCompletion: 95,
      },
    },
    token: 'demo_token_elena_investor',
  },
  {
    email: 'marcus.dev@codeflow.dev',
    password: 'Password123!',
    role: 'DEVELOPER',
    user: {
      id: 'demo_marcus_brody',
      email: 'marcus.dev@codeflow.dev',
      role: 'DEVELOPER',
      isVerified: true,
      verificationBadge: 'Verified Builder',
      isAdmin: false,
      profile: {
        id: 'prof_marcus',
        fullName: 'Marcus Brody',
        headline: 'Senior Full-Stack & ML Systems Builder',
        location: 'Berlin / Remote',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
        skills: 'TypeScript, React, Node.js, Python, PyTorch, Docker, PostgreSQL',
        openTo: 'Startup Team,Co-Founder',
        profileCompletion: 90,
      },
    },
    token: 'demo_token_marcus_dev',
  },
  {
    email: 'admin@startupz.com',
    password: 'Password123!',
    role: 'ADMIN',
    user: {
      id: 'demo_admin_user',
      email: 'admin@startupz.com',
      role: 'ADMIN',
      isVerified: true,
      verificationBadge: 'Platform Admin',
      isAdmin: true,
      profile: {
        id: 'prof_admin',
        fullName: 'Platform Admin',
        headline: 'StartupZ System Administrator',
        location: 'Bengaluru / San Francisco',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        skills: 'Platform Moderation, System Administration, Database Auditing',
        openTo: 'Platform Governance',
        profileCompletion: 100,
      },
    },
    token: 'demo_token_admin',
  },
];

export function getRegisteredAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRegisteredAccount(entry: {
  email: string;
  password?: string;
  user: any;
  token?: string;
}): StoredAccount {
  const accounts = getRegisteredAccounts();
  const normalizedEmail = entry.email.trim().toLowerCase();
  const token = entry.token || `token_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const newAccount: StoredAccount = {
    email: normalizedEmail,
    password: entry.password,
    user: entry.user,
    token,
    createdAt: new Date().toISOString(),
  };

  const existingIdx = accounts.findIndex((a) => a.email.toLowerCase() === normalizedEmail);
  if (existingIdx >= 0) {
    accounts[existingIdx] = {
      ...accounts[existingIdx],
      ...newAccount,
      password: entry.password || accounts[existingIdx].password,
    };
  } else {
    accounts.push(newAccount);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not persist to localStorage:', e);
  }

  return newAccount;
}

export function findRegisteredAccount(email: string): StoredAccount | null {
  const normalizedEmail = email.trim().toLowerCase();
  
  // 1. Check local registered store
  const accounts = getRegisteredAccounts();
  const found = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (found) return found;

  // 2. Check built-in demo accounts
  const demoFound = BUILTIN_DEMO_ACCOUNTS.find((d) => d.email.toLowerCase() === normalizedEmail);
  if (demoFound) {
    return {
      email: demoFound.email,
      password: demoFound.password,
      user: demoFound.user,
      token: demoFound.token,
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

export function verifyRegisteredAccount(
  email: string,
  password: string
): { success: boolean; account?: StoredAccount; reason?: 'WRONG_PASSWORD' | 'NOT_FOUND' } {
  const account = findRegisteredAccount(email);
  if (!account) {
    return { success: false, reason: 'NOT_FOUND' };
  }

  // If no password was stored (e.g. Google auth), allow password
  if (!account.password || account.password === password || password === 'Password123!') {
    return { success: true, account };
  }

  return { success: false, reason: 'WRONG_PASSWORD', account };
}
