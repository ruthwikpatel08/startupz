const getApiBase = (): string => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  // Fallback to Render backend in production when hosted on Vercel
  if (typeof window !== 'undefined' && window.location.hostname && !window.location.hostname.includes('localhost')) {
    return 'https://startupz-90c7.onrender.com/api';
  }
  return '/api';
};

const API_BASE = getApiBase();

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('startupz_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildQuery(params?: any): string {
  if (!params) return '';
  if (typeof params === 'string') return params.startsWith('?') ? params : `?${params}`;
  const qs = new URLSearchParams(params).toString();
  return qs ? `?${qs}` : '';
}

const REAL_ACCOUNT_EMAILS = [
  'ruthwikpatel08@gmail.com',
  'legacyplayer04@gmail.com',
  'lavanyadav0206@gmail.com',
];

export function isDemoRecord(item: any): boolean {
  if (!item) return false;
  const str = JSON.stringify(item).toLowerCase();
  
  // Real registered users must never be filtered
  if (REAL_ACCOUNT_EMAILS.some((email) => str.includes(email.toLowerCase()))) {
    return false;
  }

  return (
    str.includes('[demo account]') ||
    str.includes('demo account') ||
    str.includes('contact@') ||
    str.includes('advisory@') ||
    str.includes('demo.') ||
    str.includes('admin@startupz.com') ||
    str.includes('@startupz.com') ||
    str.includes('sarah.chen') ||
    str.includes('marcus.dev') ||
    str.includes('david.kim') ||
    str.includes('maya.design') ||
    str.includes('priya.growth') ||
    str.includes('elena.investor') ||
    str.includes('dr.aravind') ||
    str.includes('healthventures') ||
    str.includes('@codeflow.dev') ||
    str.includes('@hyperbuild.co') ||
    str.includes('@aiagri.io') ||
    str.includes('@pixelcraft.studio') ||
    str.includes('@marketscale.io') ||
    str.includes('@apexventures.vc') ||
    str.includes('bitspilanitbi') ||
    str.includes('cieiiithyderabad') ||
    str.includes('berkeleyskydeck') ||
    str.includes('startxstanford') ||
    str.includes('creativedestructionlab') ||
    str.includes('masschallenge') ||
    str.includes('villgro') ||
    str.includes('nexus startup hub')
  );
}

function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.filter((item) => !isDemoRecord(item));
  }

  const cleaned = { ...data };
  const arrayKeys = ['users', 'matches', 'people', 'startups', 'investors', 'mentors', 'opportunities', 'posts', 'results'];
  
  for (const key of arrayKeys) {
    if (Array.isArray(cleaned[key])) {
      cleaned[key] = cleaned[key].filter((item: any) => !isDemoRecord(item));
    }
  }

  if (cleaned.results && typeof cleaned.results === 'object') {
    cleaned.results = sanitizeData(cleaned.results);
  }

  return cleaned;
}

const inFlightGetRequests = new Map<string, Promise<any>>();
const getResponseCache = new Map<string, { data: any; expiresAt: number }>();
const GET_CACHE_TTL = 15000; // 15 seconds: absorbs React StrictMode remounts, component sibling renders, and rapid back-forth navigation

export function clearApiCache() {
  getResponseCache.clear();
  inFlightGetRequests.clear();
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const token = localStorage.getItem('startupz_token') || 'anon';
  const cacheKey = `${token}:${endpoint}`;

  // If a mutation occurs, invalidate cached GET responses so subsequent reads reflect new state
  if (!isGet && !endpoint.startsWith('/auth/sync') && !endpoint.startsWith('/auth/login')) {
    getResponseCache.clear();
  }

  if (isGet) {
    const cached = getResponseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return Promise.resolve(cached.data as T);
    }
    if (inFlightGetRequests.has(cacheKey)) {
      return inFlightGetRequests.get(cacheKey)!;
    }
  }

  const executeRequest = async (): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || data.error || `HTTP error ${response.status}`;
        throw new Error(errorMsg);
      }

      const sanitized = sanitizeData(data) as T;
      if (isGet) {
        getResponseCache.set(cacheKey, { data: sanitized, expiresAt: Date.now() + GET_CACHE_TTL });
      }
      return sanitized;
    } catch (err: any) {
      if (err.name === 'TypeError' && (err.message || '').includes('fetch')) {
        throw new Error('Cloud backend is waking up or updating. Please wait 10-20 seconds or use Continue with Google.');
      }
      throw err;
    }
  };

  if (isGet) {
    const promise = executeRequest().finally(() => {
      inFlightGetRequests.delete(cacheKey);
    });
    inFlightGetRequests.set(cacheKey, promise);
    return promise;
  }

  return executeRequest();
}

export const api = {
  clearCache: clearApiCache,
  // AUTH
  register: (payload: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  googleAuth: (payload: any) => request<any>('/auth/google', { method: 'POST', body: JSON.stringify(payload) }),
  syncAuth: (payload: any) => request<any>('/auth/sync', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request<any>('/auth/me'),
  forgotPassword: (emailOrPayload: any) => {
    const body = typeof emailOrPayload === 'string' ? { email: emailOrPayload } : emailOrPayload;
    return request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) });
  },
  resetPassword: (payload: any) => request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),

  // USERS
  getUsers: (params?: any) => request<any>(`/users${buildQuery(params)}`),
  getUser: (id: string) => request<any>(`/users/${id}`),
  getUserById: (id: string) => request<any>(`/users/${id}`),
  updateProfile: (payload: any) => request<any>('/users/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAccount: () => request<any>('/users/me', { method: 'DELETE' }),
  getCoFounderMatches: (params?: any) => request<any>(`/users/matching/cofounders${buildQuery(params)}`),
  getCofounderMatches: (params?: any) => request<any>(`/users/matching/cofounders${buildQuery(params)}`),
  getRecommendedPeople: () => request<any>('/users/recommendations'),

  // STARTUPS
  getStartups: (params?: any) => request<any>(`/startups${buildQuery(params)}`),
  getStartup: (id: string) => request<any>(`/startups/${id}`),
  getStartupById: (id: string) => request<any>(`/startups/${id}`),
  createStartup: (payload: any) => request<any>('/startups', { method: 'POST', body: JSON.stringify(payload) }),
  updateStartup: (id: string, payload: any) => request<any>(`/startups/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteStartup: (id: string) => request<any>(`/startups/${id}`, { method: 'DELETE' }),
  likeStartup: (id: string) => request<any>(`/startups/${id}/like`, { method: 'POST' }),
  followStartup: (id: string) => request<any>(`/startups/${id}/follow`, { method: 'POST' }),
  getAIValidation: (payload: { problem: string; solution: string; targetCustomers?: string; industry?: string }) =>
    request<any>('/startups/validate-ai', { method: 'POST', body: JSON.stringify(payload) }),
  getRecommendedStartups: () => request<any>('/startups/recommendations'),

  // OPPORTUNITIES
  getOpportunities: (params?: any) => request<any>(`/opportunities${buildQuery(params)}`),
  getOpportunity: (id: string) => request<any>(`/opportunities/${id}`),
  getOpportunityById: (id: string) => request<any>(`/opportunities/${id}`),
  createOpportunity: (payload: any) => request<any>('/opportunities', { method: 'POST', body: JSON.stringify(payload) }),
  applyOpportunity: (id: string, payload: any) => request<any>(`/opportunities/${id}/apply`, { method: 'POST', body: JSON.stringify(payload) }),
  getMyApplications: () => request<any>('/opportunities/my-applications'),

  // CONNECTIONS & STARTUP PROPOSALS
  getConnections: (params?: any) => request<any>(`/connections${buildQuery(params)}`),
  getPendingConnections: () => request<any>('/connections/pending'),
  getConnectionCount: (userId: string) => request<{ count: number }>(`/connections/count/${userId}`),
  sendConnection: (payloadOrReceiverId: any, note?: string) => {
    const body = typeof payloadOrReceiverId === 'string'
      ? { receiverId: payloadOrReceiverId, note }
      : payloadOrReceiverId;
    return request<any>('/connections', { method: 'POST', body: JSON.stringify(body) });
  },
  respondConnection: (id: string, action: 'ACCEPT' | 'REJECT' | 'ACCEPTED' | 'REJECTED') => {
    const status = action === 'ACCEPT' || action === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';
    return request<any>(`/connections/${id}`, { method: 'PUT', body: JSON.stringify({ status, action }) });
  },
  removeConnection: (id: string) => request<any>(`/connections/${id}`, { method: 'DELETE' }),
  sendStartupProposal: (payload: { receiverId: string; ideaTitle: string; pitchDescription: string; proposedRole: string; proposedEquity?: string; receiverEmail?: string; receiverName?: string }) =>
    request<any>('/connections/startup-proposal', { method: 'POST', body: JSON.stringify(payload) }),
  getStartupProposals: (type?: 'sent' | 'received') =>
    request<any[]>(`/connections/startup-proposals${type ? `?type=${type}` : ''}`),
  respondStartupProposal: (id: string, status: 'ACCEPTED' | 'DECLINED' | 'ACCEPT' | 'DECLINE') => {
    const norm = status === 'ACCEPT' || status === 'ACCEPTED' ? 'ACCEPTED' : 'DECLINED';
    return request<any>(`/connections/startup-proposals/${id}`, { method: 'PUT', body: JSON.stringify({ status: norm, action: norm }) });
  },

  // MEETINGS
  scheduleMeeting: (payload: { guestId: string; title: string; scheduledAt?: string; durationMinutes?: number; notes?: string }) =>
    request<any>('/meetings/schedule', { method: 'POST', body: JSON.stringify(payload) }),
  getMeetings: (type?: 'upcoming' | 'past' | 'all') =>
    request<any[]>(`/meetings${type ? `?type=${type}` : ''}`),
  getMeetingRoom: (roomCode: string) => request<any>(`/meetings/${roomCode}`),
  updateMeetingStatus: (id: string, status: string) =>
    request<any>(`/meetings/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // AI PEOPLE FINDER
  aiFindPeople: (query: string) =>
    request<any>('/ai/find-people', { method: 'POST', body: JSON.stringify({ query }) }),

  // FAILED STARTUPS & RAISE SOLUTION
  getFailedStartups: (params?: any) =>
    request<any[]>(`/failed-startups${buildQuery(params)}`),
  getFailedStartupById: (id: string) =>
    request<any>(`/failed-startups/${id}`),
  raiseSolution: (failedStartupId: string, payload: { title: string; description: string; targetAudience?: string; differentiation?: string; startupId?: string }) =>
    request<any>(`/failed-startups/${failedStartupId}/solutions`, { method: 'POST', body: JSON.stringify(payload) }),
  upvoteSolution: (solutionId: string) =>
    request<any>(`/failed-startups/solutions/${solutionId}/upvote`, { method: 'POST' }),

  // INVESTORS
  getInvestors: (params?: any) => request<any>(`/investors${buildQuery(params)}`),
  getInvestor: (id: string) => request<any>(`/investors/${id}`),
  getInvestorById: (id: string) => request<any>(`/investors/${id}`),
  sendPitch: (investorId: string, payload: any) =>
    request<any>(`/investors/${investorId}/pitch`, { method: 'POST', body: JSON.stringify(payload) }),

  // MENTORS
  getMentors: (params?: any) => request<any>(`/mentors${buildQuery(params)}`),
  getMentor: (id: string) => request<any>(`/mentors/${id}`),
  getMentorById: (id: string) => request<any>(`/mentors/${id}`),
  requestMentorship: (mentorId: string, payload: any) =>
    request<any>(`/mentors/${mentorId}/request`, { method: 'POST', body: JSON.stringify(payload) }),

  // POSTS
  getPosts: (params?: any) => request<any>(`/posts${buildQuery(params)}`),
  createPost: (payload: any) => request<any>('/posts', { method: 'POST', body: JSON.stringify(payload) }),
  deletePost: (id: string) => request<any>(`/posts/${id}`, { method: 'DELETE' }),
  likePost: (id: string) => request<any>(`/posts/${id}/like`, { method: 'POST' }),
  addComment: (id: string, content: string) =>
    request<any>(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),

  // MESSAGES
  getConversations: async () => {
    const res = await request<any>('/messages/conversations');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.conversations)) return res.conversations;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  },
  getMessages: async (conversationId: string) => {
    const res = await request<any>(`/messages/${conversationId}`);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.messages)) return res.messages;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  },
  sendMessage: (payload: { receiverId: string; content: string }) =>
    request<any>('/messages', { method: 'POST', body: JSON.stringify(payload) }),
  deleteConversation: (conversationId: string) =>
    request<any>(`/messages/${conversationId}`, { method: 'DELETE' }),


  // SAVED
  getSavedItems: (itemType?: string) => {
    const q = itemType ? `?itemType=${itemType}` : '';
    return request<any[]>(`/saved${q}`);
  },
  toggleSave: (itemType: string, itemId: string) =>
    request<any>('/saved/toggle', { method: 'POST', body: JSON.stringify({ itemType, itemId }) }),
  toggleSaveItem: (itemType: string, itemId: string) =>
    request<any>('/saved/toggle', { method: 'POST', body: JSON.stringify({ itemType, itemId }) }),

  // NOTIFICATIONS
  getNotifications: async () => {
    const res = await request<any>('/notifications');
    if (Array.isArray(res)) {
      return { notifications: res, unreadCount: res.filter((n: any) => !n.isRead).length };
    }
    return {
      notifications: Array.isArray(res?.notifications) ? res.notifications : (Array.isArray(res?.data) ? res.data : []),
      unreadCount: typeof res?.unreadCount === 'number' ? res.unreadCount : (res?.notifications?.filter((n: any) => !n.isRead)?.length || 0),
    };
  },
  markNotificationAsRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsAsRead: () => request<any>('/notifications/read-all', { method: 'PUT' }),
  deleteNotification: (id: string) => request<any>(`/notifications/${id}`, { method: 'DELETE' }),

  // SEARCH
  searchAll: (query: string, type?: string) => {
    const params = new URLSearchParams({ q: query });
    if (type && type !== 'ALL') params.append('type', type);
    return request<any>(`/search?${params.toString()}`);
  },

  // REPORTS
  createReport: (payload: { targetType: string; targetId: string; reason: string; description?: string }) =>
    request<any>('/reports', { method: 'POST', body: JSON.stringify(payload) }),

  // VERIFICATIONS
  submitVerification: (payload: any) => request<any>('/verifications', { method: 'POST', body: JSON.stringify(payload) }),

  // ADMIN
  getAdminStats: () => request<any>('/admin/stats'),
  getAdminUsers: () => request<any[]>('/admin/users'),
  toggleUserSuspension: (id: string, isSuspended: boolean) =>
    request<any>(`/admin/users/${id}/suspend`, { method: 'PUT', body: JSON.stringify({ isSuspended }) }),
  verifyUserBadge: (id: string, badge: string | null) =>
    request<any>(`/admin/users/${id}/verify`, { method: 'PUT', body: JSON.stringify({ badge }) }),
  getAdminStartups: () => request<any[]>('/admin/startups'),
  verifyStartupBadge: (id: string, isVerified: boolean) =>
    request<any>(`/admin/startups/${id}/verify`, { method: 'PUT', body: JSON.stringify({ isVerified }) }),
  getAdminReports: () => request<any[]>('/admin/reports'),
  updateReportStatus: (id: string, status: string) =>
    request<any>(`/admin/reports/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // WORLD-WIDE PROBLEM STATEMENTS
  getProblems: (params?: any) => request<any>(`/problems${buildQuery(params)}`),
  getProblem: (id: string) => request<any>(`/problems/${id}`),
  getProblemById: (id: string) => request<any>(`/problems/${id}`),
  getProblemMeta: () => request<any>('/problems/meta'),
  createProblem: (payload: any) => request<any>('/problems', { method: 'POST', body: JSON.stringify(payload) }),
  updateProblem: (id: string, payload: any) => request<any>(`/problems/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProblem: (id: string) => request<any>(`/problems/${id}`, { method: 'DELETE' }),
  analyzeProblem: (id: string, type: 'solutions' | 'match') =>
    request<any>(`/problems/${id}/analyze?type=${type}`, { method: 'POST' }),
  categorizeProblemAI: (payload: { title?: string; description: string }) =>
    request<any>('/problems/categorize-ai', { method: 'POST', body: JSON.stringify(payload) }),
  discoverAIProblems: (topic?: string) =>
    request<{ problems: any[] }>('/problems/discover-ai', { method: 'POST', body: JSON.stringify({ topic }) }),
};

