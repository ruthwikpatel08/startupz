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
