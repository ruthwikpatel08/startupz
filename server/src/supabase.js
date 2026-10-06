import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://aqbnylhmsawdagoyggrf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Permanently deletes a user from Supabase Auth and all Supabase PostgreSQL tables.
 * Uses the privileged service-role key on the backend.
 *
 * @param {string} userId - The user ID to delete (UUID or internal ID)
 * @param {string} userEmail - The user's email address
 */
export async function deleteSupabaseUserCompletely(userId, userEmail) {
  if (!supabaseAdmin) {
    console.warn('StartupZ: Supabase Admin client not configured, skipping Supabase user deletion.');
    return { success: false, reason: 'No admin client' };
  }

  const cleanEmail = (userEmail || '').trim().toLowerCase();
  const deletedAuthIds = new Set();

  try {
    // 1. Discover all matching Supabase Auth users
    try {
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (!listError && listData?.users) {
        for (const u of listData.users) {
          const matchId = userId && (u.id === userId || String(u.id).toLowerCase() === String(userId).toLowerCase());
          const matchEmail = cleanEmail && u.email && u.email.toLowerCase() === cleanEmail;
          if (matchId || matchEmail) {
            deletedAuthIds.add(u.id);
          }
        }
      }
    } catch (err) {
      console.warn('Error listing Supabase Auth users during deletion:', err?.message);
    }

    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      deletedAuthIds.add(userId);
    }

    const allIds = Array.from(deletedAuthIds);
    console.log(`[Account Deletion] Targeted user: ${userId}, email: ${cleanEmail}, matched Supabase Auth IDs:`, allIds);

    // 2. Delete conversations and messages involving user
    for (const id of allIds) {
      try {
        await supabaseAdmin
          .from('messages')
          .delete()
          .or(`sender_id.eq.${id},receiver_id.eq.${id}`);
      } catch (err) {
        console.warn('Error deleting messages for', id, err?.message);
      }
      try {
        await supabaseAdmin
          .from('conversations')
          .delete()
          .or(`participant1_id.eq.${id},participant2_id.eq.${id}`);
      } catch (err) {
        console.warn('Error deleting conversations for', id, err?.message);
      }
    }

    // 2.5 Delete connections, notifications, posts, comments, likes, saved items
    for (const id of allIds) {
      try {
        await supabaseAdmin
          .from('connections')
          .delete()
          .or(`sender_id.eq.${id},receiver_id.eq.${id}`);
      } catch (err) {
        console.warn('Error deleting connections for', id, err?.message);
      }
      try {
        await supabaseAdmin
          .from('notifications')
          .delete()
          .or(`user_id.eq.${id},sender_id.eq.${id}`);
      } catch (err) {
        console.warn('Error deleting notifications for', id, err?.message);
      }
      try {
        await supabaseAdmin.from('posts').delete().eq('author_id', id);
      } catch (err) {}
      try {
        await supabaseAdmin.from('comments').delete().eq('author_id', id);
      } catch (err) {}
      try {
        await supabaseAdmin.from('likes').delete().eq('user_id', id);
      } catch (err) {}
      try {
        await supabaseAdmin.from('saved_items').delete().eq('user_id', id);
      } catch (err) {}
      try {
        await supabaseAdmin.from('startups').delete().eq('founder_id', id);
      } catch (err) {}
      try {
        await supabaseAdmin.from('problems').delete().eq('created_by', id);
      } catch (err) {}
      try {
        await supabaseAdmin.from('opportunities').delete().eq('creator_id', id);
      } catch (err) {}
      try {
        await supabaseAdmin.from('mentors').delete().eq('user_id', id);
      } catch (err) {}
      try {
        await supabaseAdmin.from('investors').delete().eq('user_id', id);
      } catch (err) {}
    }

    // 3. Delete from public.users (triggers ON DELETE CASCADE for all dependent tables)
    for (const id of allIds) {
      try {
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('Error deleting public.users for', id, err?.message);
      }
    }

    // 4. Ensure public.profiles is completely deleted
    for (const id of allIds) {
      try {
        await supabaseAdmin
          .from('profiles')
          .delete()
          .or(`user_id.eq.${id},id.eq.${id}`);
      } catch (err) {
        console.warn('Error deleting public.profiles for', id, err?.message);
      }
    }

    if (cleanEmail) {
      try {
        await supabaseAdmin
          .from('profiles')
          .delete()
          .ilike('email', cleanEmail);
      } catch (err) {
        console.warn('Error deleting public.profiles by email', cleanEmail, err?.message);
      }
      try {
        await supabaseAdmin
          .from('users')
          .delete()
          .ilike('email', cleanEmail);
      } catch (err) {
        console.warn('Error deleting public.users by email', cleanEmail, err?.message);
      }
    }

    // 5. Delete Supabase Auth identities (permanently invalidates credentials and Google tokens)
    for (const authId of deletedAuthIds) {
      try {
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(authId);
        if (delErr) {
          console.warn('Supabase auth.admin.deleteUser warning:', authId, delErr.message);
        } else {
          console.log('Successfully deleted Supabase Auth identity:', authId);
        }
      } catch (err) {
        console.warn('Exception deleting Supabase Auth identity:', authId, err?.message);
      }
    }

    return { success: true, deletedAuthIds: allIds };
  } catch (err) {
    console.error('deleteSupabaseUserCompletely critical error:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Upsert or update a user profile in Supabase public.profiles table using service-role privileges.
 * Ensures the PostgreSQL database stays in exact sync with profile updates.
 */
export async function upsertSupabaseProfile(userId, userEmail, profileData) {
  if (!supabaseAdmin) {
    return null;
  }

  try {
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    const payload = {};

    if (profileData.fullName !== undefined) payload.full_name = profileData.fullName;
    if (profileData.headline !== undefined) payload.headline = profileData.headline;
    if (profileData.oneLineBio !== undefined) payload.one_line_bio = profileData.oneLineBio;
    if (profileData.location !== undefined) payload.location = profileData.location;
    if (profileData.bio !== undefined) payload.bio = profileData.bio;
    if (profileData.avatar !== undefined) payload.avatar = profileData.avatar;
    if (profileData.coverImage !== undefined) payload.cover_image = profileData.coverImage;
    if (profileData.education !== undefined) payload.education = profileData.education;
    if (profileData.portfolioUrl !== undefined) payload.portfolio_url = profileData.portfolioUrl;
    if (profileData.githubUrl !== undefined) payload.github_url = profileData.githubUrl;
    if (profileData.linkedinUrl !== undefined) payload.linkedin_url = profileData.linkedinUrl;
    if (profileData.websiteUrl !== undefined) payload.website_url = profileData.websiteUrl;
    if (profileData.skills !== undefined) payload.skills = profileData.skills;
    if (profileData.startupInterests !== undefined) payload.startup_interests = profileData.startupInterests;
    if (profileData.industries !== undefined) payload.industries = profileData.industries;
    if (profileData.preferredRole !== undefined) payload.preferred_role = profileData.preferredRole;
    if (profileData.availability !== undefined) payload.availability = profileData.availability;
    if (profileData.startupExperience !== undefined) payload.startup_experience = profileData.startupExperience;
    if (profileData.achievements !== undefined) payload.achievements = profileData.achievements;
    if (profileData.openTo !== undefined) {
      payload.open_to = Array.isArray(profileData.openTo) ? profileData.openTo.join(',') : profileData.openTo;
    }
    if (profileData.isCategorySelected !== undefined) payload.is_category_selected = Boolean(profileData.isCategorySelected);
    if (profileData.profileCompletion !== undefined) payload.profile_completion = Number(profileData.profileCompletion) || 60;
    if (cleanEmail) payload.email = cleanEmail;
    payload.updated_at = new Date().toISOString();

    // 1. Check if profile exists by user_id or id or email
    const filter = cleanEmail
      ? `user_id.eq.${userId},id.eq.${userId},email.ilike.${cleanEmail}`
      : `user_id.eq.${userId},id.eq.${userId}`;

    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id')
      .or(filter)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.warn('upsertSupabaseProfile update error:', error.message);
        return null;
      }
      return data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: userId,
          ...payload,
        })
        .select()
        .single();

      if (error) {
        console.warn('upsertSupabaseProfile insert error:', error.message);
        return null;
      }
      return data;
    }
  } catch (err) {
    console.warn('upsertSupabaseProfile exception:', err?.message);
    return null;
  }
}

