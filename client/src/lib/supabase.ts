import { createClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { User, Profile, UserRole, Connection, Conversation, Message } from '../types';
import { api } from '../services/api';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://aqbnylhmsawdagoyggrf.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('StartupZ: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const AUTH_PROVIDERS_KEY = 'startupz_auth_provider_hints';

/**
 * Safely store an auth provider hint (e.g. 'google' or 'email') for an email.
 * This ensures that when a Google OAuth user later enters their email + password,
 * we can immediately recognize that their account uses Google and guide them accurately.
 */
export function recordAuthProviderHint(email: string, provider: 'google' | 'email'): void {
  try {
    const normalized = email.trim().toLowerCase();
    const raw = localStorage.getItem(AUTH_PROVIDERS_KEY);
    const hints = raw ? JSON.parse(raw) : {};
    hints[normalized] = provider;
    localStorage.setItem(AUTH_PROVIDERS_KEY, JSON.stringify(hints));
  } catch {
    // Non-critical local hint storage
  }
}

export function getAuthProviderHint(email: string): 'google' | 'email' | null {
  try {
    const normalized = email.trim().toLowerCase();
    const raw = localStorage.getItem(AUTH_PROVIDERS_KEY);
    if (!raw) return null;
    const hints = JSON.parse(raw);
    return hints[normalized] || null;
  } catch {
    return null;
  }
}

/**
 * Maps a Supabase Auth user and their database profile row
 * into the complete StartupZ User object structure.
 */
export function mapSupabaseToAppUser(
  authUser: SupabaseAuthUser,
  profileRow?: any
): User {
  const metadata = authUser.user_metadata || {};
  const isGoogle =
    authUser.app_metadata?.provider === 'google' ||
    authUser.identities?.some((id) => id.provider === 'google') ||
    getAuthProviderHint(authUser.email || '') === 'google';

  const role: UserRole = profileRow?.preferred_role || metadata.role || 'FOUNDER';
  const fullName =
    profileRow?.full_name ||
    metadata.full_name ||
    metadata.name ||
    authUser.email?.split('@')[0] ||
    'Member';

  const avatar =
    profileRow?.avatar ||
    metadata.avatar_url ||
    metadata.picture ||
    undefined;

  const profile: Profile = {
    id: profileRow?.id || authUser.id,
    userId: authUser.id,
    fullName,
    headline: profileRow?.headline || metadata.headline || `${role} | Startup Builder`,
    oneLineBio: profileRow?.one_line_bio || profileRow?.headline || metadata.one_line_bio || '',
    location: profileRow?.location || metadata.location || 'Remote',
    bio: profileRow?.bio || metadata.bio || '',
    avatar,
    coverImage: profileRow?.cover_image || null,
    education: profileRow?.education || '',
    portfolioUrl: profileRow?.portfolio_url || '',
    githubUrl: profileRow?.github_url || '',
    linkedinUrl: profileRow?.linkedin_url || '',
    websiteUrl: profileRow?.website_url || '',
    skills: profileRow?.skills || '',
    startupInterests: profileRow?.startup_interests || '',
    industries: profileRow?.industries || '',
    preferredRole: role,
    availability: profileRow?.availability || 'Full-time',
    startupExperience: profileRow?.startup_experience || '',
    achievements: profileRow?.achievements || '',
    openTo: profileRow?.open_to || 'Co-Founder,Startup Team,Investment',
    profileCompletion: profileRow?.profile_completion || 60,
    isCategorySelected: profileRow?.is_category_selected === true,
    createdAt: profileRow?.created_at || authUser.created_at,
    updatedAt: profileRow?.updated_at || authUser.updated_at,
  };

  return {
    id: authUser.id,
    email: authUser.email || '',
    role,
    isVerified: !!authUser.email_confirmed_at || isGoogle,
    verificationBadge: isGoogle ? 'Verified via Google' : (authUser.email_confirmed_at ? 'Verified Member' : null),
    isSuspended: false,
    isAdmin: metadata.isAdmin === true || metadata.role === 'ADMIN' || authUser.email === 'ruthwikpatel08@gmail.com' || authUser.email === 'admin@startupz.com',
    createdAt: authUser.created_at,
    updatedAt: authUser.updated_at,
    profile,
  };
}

const userProfileCache = new Map<string, { data: any; expiresAt: number }>();
const inFlightProfileRequests = new Map<string, Promise<any | null>>();
const PROFILE_CACHE_TTL_MS = 60000; // 60 seconds

export function invalidateUserProfileCache(userId?: string): void {
  if (userId) {
    userProfileCache.delete(userId);
    inFlightProfileRequests.delete(userId);
  } else {
    userProfileCache.clear();
    inFlightProfileRequests.clear();
  }
}

/**
 * Fetch a profile row from Supabase public.profiles by user UUID.
 * Includes in-memory caching and in-flight request deduplication to prevent redundant network requests.
 */
export async function fetchUserProfile(userId: string, forceRefresh = false): Promise<any | null> {
  if (!userId) return null;

  if (!forceRefresh) {
    const cached = userProfileCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
  }

  if (inFlightProfileRequests.has(userId)) {
    return inFlightProfileRequests.get(userId)!;
  }

  const fetchPromise = (async () => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!data) {
        const fallback = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (fallback.data) {
          data = fallback.data;
        }
      }

      if (error && !data) {
        console.warn('Error fetching profile from Supabase:', error.message);
        return null;
      }

      if (data) {
        userProfileCache.set(userId, { data, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
      }
      return data;
    } catch (err) {
      console.warn('Network exception fetching profile:', err);
      return null;
    }
  })().finally(() => {
    inFlightProfileRequests.delete(userId);
  });

  inFlightProfileRequests.set(userId, fetchPromise);
  return fetchPromise;
}

/**
 * Upsert or create a user profile in Supabase public.profiles table.
 */
export async function upsertUserProfile(
  userId: string,
  profileData: Partial<{
    full_name: string;
    username: string;
    headline: string;
    one_line_bio: string;
    location: string;
    bio: string;
    avatar: string;
    cover_image: string;
    skills: string;
    startup_interests: string;
    industries: string;
    preferred_role: string;
    availability: string;
    startup_experience: string;
    achievements: string;
    education: string;
    github_url: string;
    linkedin_url: string;
    website_url: string;
    open_to: string;
    profile_completion: number;
    is_category_selected: boolean;
    auth_provider: string;
    email: string;
  }>
): Promise<any | null> {
  try {
    // Generate username from email or full_name if not provided
    if (!profileData.username) {
      if (profileData.email) {
        profileData.username = profileData.email.split('@')[0];
      } else if (profileData.full_name) {
        profileData.username = profileData.full_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
    }

    // Check if profile exists first for clean upsert
    const existing = await fetchUserProfile(userId);

    if (existing) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.warn('Error updating profile in Supabase:', error.message);
        return existing;
      }
      if (data) {
        userProfileCache.set(userId, { data, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          ...profileData,
        })
        .select()
        .single();

      if (error) {
        console.warn('Error creating profile in Supabase:', error.message);
        return null;
      }
      if (data) {
        userProfileCache.set(userId, { data, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
      }
      return data;
    }
  } catch (err) {
    console.warn('Exception during profile upsert:', err);
    return null;
  }
}

/**
 * Resolves an identifier (which can be a Gmail address, custom email, or username)
 * into a valid email string for authentication.
 */
export async function resolveEmailOrUsername(identifier: string): Promise<string> {
  const clean = (identifier || '').trim().toLowerCase();
  if (!clean) return '';
  if (clean.includes('@')) {
    return clean;
  }

  // Known administrator / core account mappings
  const knownMap: Record<string, string> = {
    'admin': 'admin@startupz.com',
    'ruthwik': 'ruthwikpatel08@gmail.com',
    'ruthwikpatel': 'ruthwikpatel08@gmail.com',
    'ruthwikpatel08': 'ruthwikpatel08@gmail.com',
    'legacy': 'legacyplayer04@gmail.com',
    'legacyplayer': 'legacyplayer04@gmail.com',
    'legacyplayer04': 'legacyplayer04@gmail.com',
    'lavan': 'lavanyadav0206@gmail.com',
    'lavanyadav': 'lavanyadav0206@gmail.com',
    'lavanyadav0206': 'lavanyadav0206@gmail.com',
  };

  if (knownMap[clean]) {
    return knownMap[clean];
  }

  // 1. Try finding in Supabase public.profiles table by username, full_name or email prefix
  try {
    const { data: matchedProfiles } = await supabase
      .from('profiles')
      .select('email, full_name, username')
      .or(`username.ilike.${clean},email.ilike.${clean}@%,full_name.ilike.${clean},full_name.ilike.%${clean}%`)
      .limit(1);

    if (matchedProfiles && matchedProfiles.length > 0 && matchedProfiles[0].email) {
      return matchedProfiles[0].email.toLowerCase();
    }
  } catch (err) {
    console.warn('Profile username lookup notice:', err);
  }

  // 2. Default: If a username without @ is entered, treat as a Gmail handle (e.g. "ruthwikpatel08" -> "ruthwikpatel08@gmail.com")
  return `${clean}@gmail.com`;
}

/**
 * Centralized Supabase Auth error message translator.
 * Converts raw internal Supabase Auth errors into user-friendly production messages.
 */
export function getAuthErrorMessage(err: any, email?: string): string {
  if (!err) return 'An unexpected error occurred. Please try again.';

  const msg = (err.message || err.error_description || String(err)).toLowerCase();

  // 1. Email not confirmed
  if (msg.includes('email not confirmed') || msg.includes('not confirmed') || msg.includes('unconfirmed')) {
    return 'Please verify your email before signing in. Check your inbox for the confirmation link.';
  }

  // 2. Invalid credentials (do NOT block with "registered with Google" - allow user to proceed with password)
  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid_grant') ||
    msg.includes('invalid email or password')
  ) {
    return 'Incorrect email, username, or password. Please verify your details or use "Forgot password?".';
  }

  // 3. User already registered
  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
    return 'An account with this email already exists. Please log in with your credentials.';
  }

  // 4. Password requirements
  if (msg.includes('password') && (msg.includes('short') || msg.includes('at least') || msg.includes('characters'))) {
    return 'Password must be at least 6 characters long.';
  }

  // 6. Provider not enabled in Supabase
  if (msg.includes('unsupported provider') || msg.includes('provider is not enabled') || msg.includes('provider_disabled')) {
    return 'Google Sign-In is not enabled yet in your Supabase project. In your Supabase Dashboard, go to Authentication -> Providers -> Google and toggle it ON with your Google Client ID/Secret, or sign in with email and password.';
  }

  // 7. Rate limits
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Email rate limit exceeded by Supabase. You can confirm your user directly in Supabase Dashboard (Authentication -> Users -> click "..." -> Confirm user), or turn off "Confirm email" in Supabase Auth settings.';
  }

  // 8. Network / Connection errors
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout')) {
    return 'Unable to reach the authentication service. Please check your internet connection and try again.';
  }

  // Clean fallback
  return err.message || 'Unable to complete authentication. Please try again.';
}

// ============================================================================
// CONNECTIONS SYSTEM
// ============================================================================

export interface ConnectionStatusInfo {
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
  isSender: boolean;
  isReceiver: boolean;
  connectionId: string | null;
}

export const isUUID = (val?: string | null): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function resolveUserIdToUUID(identifier?: string | null): Promise<string | null> {
  if (!identifier) return null;
  if (isUUID(identifier)) return identifier;
  try {
    const { data: p } = await supabase
      .from('profiles')
      .select('user_id')
      .or(`username.eq.${identifier},full_name.ilike.${identifier},email.ilike.${identifier}`)
      .limit(1)
      .maybeSingle();
    if (p?.user_id && isUUID(p.user_id)) {
      return p.user_id;
    }
  } catch {}
  return null;
}

/**
 * Fetches the connection status between two users from Supabase.
 */
export async function fetchConnectionStatus(
  currentUserId: string,
  targetUserId: string
): Promise<ConnectionStatusInfo> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { status: null, isSender: false, isReceiver: false, connectionId: null };
  }

  let u1: string | null = currentUserId;
  let u2: string | null = targetUserId;
  if (!isUUID(u1)) {
    u1 = await resolveUserIdToUUID(u1);
  }
  if (!isUUID(u2)) {
    u2 = await resolveUserIdToUUID(u2);
  }

  if (u1 && u2 && isUUID(u1) && isUUID(u2)) {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(
          `and(sender_id.eq.${u1},receiver_id.eq.${u2}),and(sender_id.eq.${u2},receiver_id.eq.${u1})`
        )
        .maybeSingle();

      if (!error && data) {
        return {
          status: data.status as any,
          isSender: data.sender_id === u1,
          isReceiver: data.receiver_id === u1,
          connectionId: data.id,
        };
      }
    } catch (err) {
      console.warn('Error fetching connection status:', err);
    }
  }

  // Fallback to backend API
  try {
    const backendProfile = await api.getUser(targetUserId);
    if (backendProfile?.connectionStatus) {
      return backendProfile.connectionStatus;
    }
  } catch {}

  return { status: null, isSender: false, isReceiver: false, connectionId: null };
}

/**
 * Fetches the exact count of accepted connections for a user from Supabase.
 */
export async function fetchConnectionCount(userId: string): Promise<number> {
  if (!userId) return 0;
  let targetUuid: string | null = userId;
  if (!isUUID(targetUuid)) {
    targetUuid = await resolveUserIdToUUID(userId);
  }

  if (targetUuid && isUUID(targetUuid)) {
    try {
      // 1. Try RPC function
      const { data, error } = await supabase.rpc('get_connection_count', {
        target_user_id: targetUuid,
      });
      if (!error && typeof data === 'number') {
        return data;
      }
    } catch {}

    try {
      // 2. Direct query on connections table
      const { count, error } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${targetUuid},receiver_id.eq.${targetUuid}`)
        .eq('status', 'ACCEPTED');

      if (!error && typeof count === 'number') {
        return count;
      }
    } catch {}
  }

  // 3. Fallback to backend API
  try {
    const res = await api.getConnectionCount(userId);
    if (typeof res?.count === 'number') {
      return res.count;
    }
  } catch {}

  return 0;
}

/**
 * Sends a connection request from sender to receiver in Supabase.
 */
export async function sendConnectionRequest(
  senderId: string,
  receiverId: string,
  note?: string
): Promise<{ success: boolean; connection?: any; alreadyConnected?: boolean; message?: string }> {
  if (!senderId || !receiverId) {
    throw new Error('Sender and receiver IDs are required.');
  }
  if (senderId === receiverId) {
    throw new Error('You cannot connect with your own profile.');
  }

  // Check if an existing connection exists
  const { data: existingConns } = await supabase
    .from('connections')
    .select('*')
    .or(
      `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
    );

  const existing = existingConns && existingConns[0];
  let connection: any = null;

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      return { success: true, alreadyConnected: true, message: 'You are already connected.' };
    }
    // If pending from the other person, accept it!
    if (existing.status === 'PENDING' && existing.receiver_id === senderId) {
      return respondConnectionRequest(existing.id, 'ACCEPT', senderId);
    }
    // Otherwise update to pending and update note
    const { data: updated, error: updErr } = await supabase
      .from('connections')
      .update({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'PENDING',
        note: note ? note.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updErr) {
      throw new Error(updErr.message || 'Unable to send connection request. Please try again.');
    }
    connection = updated;
  } else {
    // Create new connection row
    const { data: created, error: insErr } = await supabase
      .from('connections')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'PENDING',
        note: note ? note.trim() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insErr) {
      throw new Error(insErr.message || 'Unable to send connection request. Please try again.');
    }
    connection = created;
  }

  // Send notification to receiver
  try {
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', senderId)
      .maybeSingle();
    const senderName = senderProfile?.full_name || 'A startup builder';

    await supabase.from('notifications').insert({
      user_id: receiverId,
      sender_id: senderId,
      type: 'CONNECTION_REQUEST',
      title: 'New Connection Request 🤝',
      message: `${senderName} wants to connect with you.${note?.trim() ? ` Note: "${note.trim()}"` : ''}`,
      link: '/network?tab=PENDING',
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } catch {}

  // Mirror to backend API
  try {
    api.sendConnection({ receiverId, note }).catch(() => {});
  } catch {}

  return { success: true, connection, message: 'Connection request sent' };
}

/**
 * Responds to a connection request (ACCEPT or REJECT) in Supabase.
 */
export async function respondConnectionRequest(
  connectionId: string,
  action: 'ACCEPT' | 'REJECT',
  currentUserId: string
): Promise<{ success: boolean; connection?: any; message?: string }> {
  const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

  // 1. Fetch connection to verify receiver and retrieve sender
  const { data: conn, error: getErr } = await supabase
    .from('connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (getErr || !conn) {
    throw new Error('Connection request not found.');
  }

  if (conn.receiver_id !== currentUserId) {
    throw new Error('Unauthorized to respond to this connection request.');
  }

  // 2. Update status in Supabase
  const { data: updated, error: updErr } = await supabase
    .from('connections')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .select()
    .single();

  if (updErr) {
    throw new Error(updErr.message || `Unable to ${action.toLowerCase()} connection request.`);
  }

  // 3. If accepted, notify sender and ensure conversation exists
  if (action === 'ACCEPT') {
    try {
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', currentUserId)
        .maybeSingle();
      const receiverName = receiverProfile?.full_name || 'A founder';

      await supabase.from('notifications').insert({
        user_id: conn.sender_id,
        sender_id: currentUserId,
        type: 'CONNECTION_ACCEPTED',
        title: 'Connection Accepted! 🤝',
        message: `${receiverName} accepted your connection request. Start a conversation!`,
        link: `/messages?user=${currentUserId}`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch {}

    // Ensure conversation exists between the two users
    try {
      const [p1, p2] = [conn.sender_id, conn.receiver_id].sort();
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant1_id', p1)
        .eq('participant2_id', p2)
        .maybeSingle();

      if (!existingConv) {
        await supabase.from('conversations').insert({
          participant1_id: p1,
          participant2_id: p2,
          last_message: 'Connected! Say hello and start collaborating.',
          last_message_at: new Date().toISOString(),
        });
      }
    } catch {}
  }

  // Mark all related CONNECTION_REQUEST notifications as read in Supabase
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUserId)
      .eq('sender_id', conn.sender_id)
      .eq('type', 'CONNECTION_REQUEST');
  } catch {}

  // Mirror to backend
  try {
    api.respondConnection(connectionId, action).catch(() => {});
  } catch {}

  return {
    success: true,
    connection: updated,
    message: action === 'ACCEPT' ? 'Connection request accepted' : 'Connection request declined',
  };
}

/**
 * Removes a connection in Supabase.
 */
export async function removeConnection(
  connectionId: string,
  currentUserId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('id', connectionId)
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

  if (error) {
    throw new Error(error.message || 'Unable to remove connection.');
  }

  try {
    api.removeConnection(connectionId).catch(() => {});
  } catch {}

  return true;
}

// ============================================================================
// MESSAGING & CONVERSATIONS SYSTEM
// ============================================================================

/**
 * Fetches all conversations for the user from Supabase.
 */
export async function getSupabaseConversations(userId: string): Promise<Conversation[]> {
  if (!userId) return [];

  const { data: convRows, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error || !convRows) {
    console.warn('Error fetching Supabase conversations:', error);
    return [];
  }

  // Get other participant IDs
  const otherIds = Array.from(
    new Set(
      convRows.map((c) => (c.participant1_id === userId ? c.participant2_id : c.participant1_id))
    )
  );

  if (otherIds.length === 0) return [];

  // Fetch profiles for all other participants and unread counts in parallel
  const [{ data: profileRows }, { data: unreadRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, user_id, full_name, avatar, headline, email, preferred_role, created_at')
      .in('user_id', otherIds),
    supabase
      .from('messages')
      .select('conversation_id')
      .eq('receiver_id', userId)
      .eq('is_read', false),
  ]);

  const profileMap = new Map((profileRows || []).map((p) => [p.user_id, p]));

  const unreadMap = new Map<string, number>();
  (unreadRows || []).forEach((r) => {
    unreadMap.set(r.conversation_id, (unreadMap.get(r.conversation_id) || 0) + 1);
  });

  return convRows.map((c) => {
    const otherId = c.participant1_id === userId ? c.participant2_id : c.participant1_id;
    const p = profileMap.get(otherId);
    const otherUser: User = {
      id: otherId,
      email: p?.email || '',
      role: (p?.preferred_role || 'FOUNDER') as any,
      isVerified: true,
      isSuspended: false,
      isAdmin: false,
      createdAt: (p as any)?.created_at || new Date().toISOString(),
      profile: {
        id: p?.id || otherId,
        userId: otherId,
        fullName: p?.full_name || 'Startup Builder',
        avatar: p?.avatar || null,
        headline: p?.headline || '',
      } as any,
    };

    return {
      id: c.id,
      participant1Id: c.participant1_id,
      participant2Id: c.participant2_id,
      participant: otherUser,
      lastMessage: c.last_message || '',
      lastMessageAt: c.last_message_at || c.created_at,
      unreadCount: unreadMap.get(c.id) || 0,
    };
  });
}

/**
 * Fetches all messages in a conversation from Supabase.
 */
export async function getSupabaseMessages(
  conversationId: string,
  currentUserId: string
): Promise<Message[]> {
  if (!conversationId) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.warn('Error fetching Supabase messages:', error);
    return [];
  }

  // Mark unread messages where receiver_id = currentUserId as read
  if (currentUserId) {
    (async () => {
      try {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .eq('receiver_id', currentUserId)
          .eq('is_read', false);
      } catch {}
    })();
  }

  return data.map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    content: m.content,
    isRead: m.is_read,
    createdAt: m.created_at,
  }));
}

/**
 * Sends a message in Supabase persistently.
 */
export async function sendSupabaseMessage(
  senderId: string,
  receiverId: string,
  content: string,
  existingConversationId?: string
): Promise<{ message: Message; conversationId: string }> {
  const text = content.trim();
  if (!text) throw new Error('Message content cannot be empty.');
  if (senderId === receiverId) throw new Error('Cannot message yourself.');

  const [p1, p2] = [senderId, receiverId].sort();
  let convId = existingConversationId;

  if (!convId || convId === 'draft') {
    // 1. Check if conversation already exists between p1 and p2
    const { data: existingConvs } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant1_id', p1)
      .eq('participant2_id', p2)
      .maybeSingle();

    if (existingConvs?.id) {
      convId = existingConvs.id;
    } else {
      // Create new conversation
      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          participant1_id: p1,
          participant2_id: p2,
          last_message: text,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (convErr || !newConv) {
        throw new Error(convErr?.message || 'Failed to create conversation in Supabase.');
      }
      convId = newConv.id;
    }
  }

  const finalConvId: string = convId!;

  // 2. Insert message into Supabase messages table
  const { data: newMsg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: finalConvId,
      sender_id: senderId,
      receiver_id: receiverId,
      content: text,
      is_read: false,
    })
    .select('*')
    .single();

  if (msgErr || !newMsg) {
    throw new Error(msgErr?.message || 'Unable to send message. Please try again.');
  }

  // 3. Update conversation last_message and last_message_at
  await supabase
    .from('conversations')
    .update({
      last_message: text,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', finalConvId);

  // 4. Send notification
  try {
    const { data: senderProf } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', senderId)
      .maybeSingle();
    const senderName = senderProf?.full_name || 'Someone';

    await supabase.from('notifications').insert({
      user_id: receiverId,
      sender_id: senderId,
      type: 'NEW_MESSAGE',
      title: `New message from ${senderName}`,
      message: text.slice(0, 80),
      link: `/messages?conversationId=${finalConvId}&user=${senderId}`,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } catch {}

  // 5. Mirror to backend in background
  try {
    api.sendMessage({ receiverId, content: text }).catch(() => {});
  } catch {}

  const formattedMsg: Message = {
    id: newMsg.id,
    conversationId: finalConvId,
    senderId: newMsg.sender_id,
    receiverId: newMsg.receiver_id,
    content: newMsg.content,
    isRead: newMsg.is_read,
    createdAt: newMsg.created_at,
  };

  return { message: formattedMsg, conversationId: finalConvId };
}

/**
 * Deletes a conversation and all its messages from Supabase.
 */
export async function deleteSupabaseConversation(
  conversationId: string,
  currentUserId: string
): Promise<boolean> {
  if (!conversationId || !currentUserId) return false;

  // 1. Verify user is a participant
  const { data: conv, error: fetchErr } = await supabase
    .from('conversations')
    .select('id, participant1_id, participant2_id')
    .eq('id', conversationId)
    .single();

  if (fetchErr || !conv) {
    throw new Error('Conversation not found.');
  }

  if (conv.participant1_id !== currentUserId && conv.participant2_id !== currentUserId) {
    throw new Error('Unauthorized to delete this conversation.');
  }

  // 2. Delete conversation (Postgres CASCADE deletes related messages)
  const { error: delErr } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (delErr) {
    throw new Error(delErr.message || 'Failed to delete conversation.');
  }

  // 3. Mirror delete to backend API if available
  try {
    api.deleteConversation(conversationId).catch(() => {});
  } catch {}

  return true;
}

