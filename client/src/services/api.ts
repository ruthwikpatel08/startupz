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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

    return data as T;
  } catch (err: any) {
    if (err.name === 'TypeError' && (err.message || '').includes('fetch')) {
      throw new Error('Cloud backend is waking up or updating. Please wait 10-20 seconds or use Continue with Google.');
    }
    throw err;
  }
}

export const api = {
  // AUTH
  register: (payload: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  googleAuth: (payload: any) => request<any>('/auth/google', { method: 'POST', body: JSON.stringify(payload) }),
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
  sendConnection: (receiverId: string, note?: string) =>
    request<any>('/connections', { method: 'POST', body: JSON.stringify({ receiverId, note }) }),
  respondConnection: (id: string, action: 'ACCEPT' | 'REJECT') =>
    request<any>(`/connections/${id}`, { method: 'PUT', body: JSON.stringify({ action }) }),
  removeConnection: (id: string) => request<any>(`/connections/${id}`, { method: 'DELETE' }),
  sendStartupProposal: (payload: { receiverId: string; ideaTitle: string; pitchDescription: string; proposedRole: string; proposedEquity?: string }) =>
    request<any>('/connections/startup-proposal', { method: 'POST', body: JSON.stringify(payload) }),
  getStartupProposals: (type?: 'sent' | 'received') =>
    request<any[]>(`/connections/startup-proposals${type ? `?type=${type}` : ''}`),
  respondStartupProposal: (id: string, status: 'ACCEPTED' | 'DECLINED') =>
    request<any>(`/connections/startup-proposals/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),

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
  getConversations: () => request<any[]>('/messages/conversations'),
  getMessages: (conversationId: string) => request<any[]>(`/messages/${conversationId}`),
  sendMessage: (payload: { receiverId: string; content: string }) =>
    request<any>('/messages', { method: 'POST', body: JSON.stringify(payload) }),

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
  getNotifications: () => request<any[]>('/notifications'),
  markNotificationAsRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsAsRead: () => request<any>('/notifications/read-all', { method: 'PUT' }),

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

