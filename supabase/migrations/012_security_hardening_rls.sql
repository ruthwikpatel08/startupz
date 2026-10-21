-- ==============================================================================
-- HookZ: Production Security Hardening — Row Level Security (RLS) Remediation
-- Migration: 012_security_hardening_rls.sql
-- Addresses: SEC-01 (OWASP API1:2023 - Broken Object Level Authorization)
--
-- Supported Tables:
-- 1. connections (Connection Requests & Relationship State Machine)
-- 2. conversations (Direct Chat Thread Rooms)
-- 3. messages (Direct Chat Message Payloads & Read Receipts)
-- 4. notifications (User & System Notifications)
-- 5. project_messages (Project Group Chat Message Streams)
-- 6. prototype_proposals (Build Together Prototype Proposals)
-- 7. startup_proposals (Startup & Co-Founder Pitch Proposals)
-- 8. projects (Project Cards, Exact JSONB Membership & Visibility Controls)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- HELPER FUNCTIONS FOR EXACT MEMBERSHIP & STATE INTEGRITY
-- ------------------------------------------------------------------------------

-- Exact JSONB membership check for projects (replaces insecure substring matching)
CREATE OR REPLACE FUNCTION public.is_project_member(p_roles jsonb, p_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_roles IS NULL OR jsonb_typeof(p_roles) <> 'array' THEN false
    ELSE EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_roles) r
      WHERE (
        r->'assignedTo'->>'userId' = p_user_id
        OR r->'assignedMember'->>'id' = p_user_id
        OR r->'assignedTo'->>'id' = p_user_id
      )
    )
  END;
$$;

-- Connection state-machine and immutability trigger
CREATE OR REPLACE FUNCTION public.enforce_connection_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent altering connection participants
  IF NEW.sender_id <> OLD.sender_id OR NEW.receiver_id <> OLD.receiver_id THEN
    RAISE EXCEPTION 'Cannot modify sender_id or receiver_id of an existing connection.';
  END IF;

  -- Sender cannot accept their own connection request or alter status
  IF auth.uid() IS NOT NULL AND OLD.sender_id::text = auth.uid()::text THEN
    IF NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Sender is not authorized to transition connection status. Delete to withdraw.';
    END IF;
  END IF;

  -- Recipient cannot modify sender note
  IF auth.uid() IS NOT NULL AND OLD.receiver_id::text = auth.uid()::text THEN
    NEW.note := OLD.note;
  END IF;

  -- Established connections cannot be transitioned back to pending or altered via update
  IF OLD.status = 'ACCEPTED' AND NEW.status <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'Established connections cannot change status; delete the connection to disconnect.';
  END IF;

  RETURN NEW;
END;
$$;

-- Prototype proposal integrity and field-level modification trigger
CREATE OR REPLACE FUNCTION public.enforce_prototype_proposal_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent changing core identity, ownership, and prototype link
  IF NEW.sender_id <> OLD.sender_id OR NEW.receiver_id <> OLD.receiver_id OR NEW.prototype_id <> OLD.prototype_id THEN
    RAISE EXCEPTION 'Cannot transfer proposal ownership, modify prototype_id, or change sender/receiver IDs.';
  END IF;

  -- Sender cannot modify status; senders withdraw by deleting
  IF auth.uid() IS NOT NULL AND OLD.sender_id::text = auth.uid()::text THEN
    IF NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Proposal sender cannot modify status. Delete proposal to withdraw.';
    END IF;
  END IF;

  -- Recipient can only update status; recipient cannot alter proposal description/pitch content
  IF auth.uid() IS NOT NULL AND OLD.receiver_id::text = auth.uid()::text THEN
    NEW.prototype_title := OLD.prototype_title;
    NEW.about_builder := OLD.about_builder;
    NEW.contribution := OLD.contribution;
    NEW.contact_info := OLD.contact_info;
  END IF;

  -- Decided proposals cannot be reopened or edited via update
  IF OLD.status IN ('ACCEPTED', 'DECLINED', 'REJECTED') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Closed proposals cannot change status.';
  END IF;

  RETURN NEW;
END;
$$;

-- Startup pitch proposal integrity and field-level modification trigger
CREATE OR REPLACE FUNCTION public.enforce_startup_proposal_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent changing core identity and ownership
  IF NEW.sender_id <> OLD.sender_id OR NEW.receiver_id <> OLD.receiver_id THEN
    RAISE EXCEPTION 'Cannot transfer proposal ownership or change sender/receiver IDs.';
  END IF;

  -- Sender cannot modify status; senders withdraw by deleting
  IF auth.uid() IS NOT NULL AND OLD.sender_id::text = auth.uid()::text THEN
    IF NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Proposal sender cannot modify status. Delete proposal to withdraw.';
    END IF;
  END IF;

  -- Recipient can only update status; recipient cannot alter proposal description/pitch content
  IF auth.uid() IS NOT NULL AND OLD.receiver_id::text = auth.uid()::text THEN
    NEW.idea_title := OLD.idea_title;
    NEW.pitch_description := OLD.pitch_description;
    NEW.proposed_role := OLD.proposed_role;
    NEW.proposed_equity := OLD.proposed_equity;
  END IF;

  -- Decided proposals cannot be reopened or edited via update
  IF OLD.status IN ('ACCEPTED', 'DECLINED', 'REJECTED') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Closed proposals cannot change status.';
  END IF;

  RETURN NEW;
END;
$$;

-- Message tampering guard trigger
CREATE OR REPLACE FUNCTION public.enforce_message_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent altering core relationship headers
  IF NEW.sender_id <> OLD.sender_id OR NEW.receiver_id <> OLD.receiver_id OR NEW.conversation_id <> OLD.conversation_id THEN
    RAISE EXCEPTION 'Cannot reassign conversation_id, sender_id, or receiver_id of a message.';
  END IF;

  -- Recipient can only update read status; recipient cannot forge or edit message content
  IF auth.uid() IS NOT NULL AND OLD.receiver_id::text = auth.uid()::text THEN
    NEW.content := OLD.content;
  END IF;

  -- Sender cannot tamper with read receipts once marked read
  IF auth.uid() IS NOT NULL AND OLD.sender_id::text = auth.uid()::text THEN
    NEW.is_read := OLD.is_read;
  END IF;

  RETURN NEW;
END;
$$;

-- Project creator guard trigger
CREATE OR REPLACE FUNCTION public.enforce_project_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Project creator cannot be stolen or reassigned
  NEW.creator_id := OLD.creator_id;

  -- Non-creator team members can only update role state; core project metadata is protected
  IF auth.uid() IS NOT NULL AND OLD.creator_id::text <> auth.uid()::text THEN
    NEW.title := OLD.title;
    NEW.idea_summary := OLD.idea_summary;
    NEW.tagline := OLD.tagline;
    NEW.problem_solved := OLD.problem_solved;
    NEW.solution_approach := OLD.solution_approach;
    NEW.detailed_description := OLD.detailed_description;
    NEW.stage := OLD.stage;
    NEW.visibility := OLD.visibility;
    NEW.creator := OLD.creator;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

-- Secure RPC for system notifications
CREATE OR REPLACE FUNCTION public.create_system_notification(
  p_user_id text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Strictly restricted to service role or verified administrators
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id::text = auth.uid()::text
    AND (u.role = 'ADMIN' OR u.is_admin = true)
  ) THEN
    RAISE EXCEPTION 'Access denied: Only system administrators can generate system notifications.';
  END IF;

  INSERT INTO public.notifications (user_id, sender_id, type, title, message, link, is_read, created_at)
  VALUES (p_user_id::uuid, NULL, 'SYSTEM', p_title, p_message, p_link, false, NOW())
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_system_notification(text, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_system_notification(text, text, text, text) TO service_role;


-- ------------------------------------------------------------------------------
-- 0. USERS TABLE SECURITY HARDENING
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Revoke direct client access from anon and authenticated to prevent table enumeration or tampering
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
GRANT ALL ON TABLE public.users TO service_role;

DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 1. CONNECTIONS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on connections" ON public.connections;
DROP POLICY IF EXISTS "Allow insert on connections" ON public.connections;
DROP POLICY IF EXISTS "Allow update on connections" ON public.connections;
DROP POLICY IF EXISTS "Allow delete on connections" ON public.connections;
DROP POLICY IF EXISTS "connections_select_own" ON public.connections;
DROP POLICY IF EXISTS "connections_select" ON public.connections;
DROP POLICY IF EXISTS "connections_insert_own" ON public.connections;
DROP POLICY IF EXISTS "connections_update_own" ON public.connections;
DROP POLICY IF EXISTS "connections_update_recipient" ON public.connections;
DROP POLICY IF EXISTS "connections_update_sender" ON public.connections;
DROP POLICY IF EXISTS "connections_delete_own" ON public.connections;
DROP POLICY IF EXISTS "Service role full access on connections" ON public.connections;

-- Participants can see all their requests (PENDING, ACCEPTED, REJECTED);
-- established ACCEPTED connections are viewable for networking/profile discovery
CREATE POLICY "connections_select" ON public.connections
  FOR SELECT TO authenticated, anon
  USING (
    status = 'ACCEPTED'
    OR sender_id::text = auth.uid()::text
    OR receiver_id::text = auth.uid()::text
  );

-- Authenticated users can only create connection requests where they are the sender
CREATE POLICY "connections_insert_own" ON public.connections
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id::text = auth.uid()::text
    AND sender_id <> receiver_id
  );

-- Recipient can accept or reject a pending incoming request
CREATE POLICY "connections_update_recipient" ON public.connections
  FOR UPDATE TO authenticated
  USING (
    receiver_id::text = auth.uid()::text
    AND status = 'PENDING'
  )
  WITH CHECK (
    receiver_id::text = auth.uid()::text
    AND status IN ('ACCEPTED', 'REJECTED')
  );

-- Sender can update their pending request (e.g. note) but CANNOT change status
CREATE POLICY "connections_update_sender" ON public.connections
  FOR UPDATE TO authenticated
  USING (
    sender_id::text = auth.uid()::text
    AND status = 'PENDING'
  )
  WITH CHECK (
    sender_id::text = auth.uid()::text
    AND status = 'PENDING'
  );

-- Only involved participants can remove/disconnect
CREATE POLICY "connections_delete_own" ON public.connections
  FOR DELETE TO authenticated
  USING (sender_id::text = auth.uid()::text OR receiver_id::text = auth.uid()::text);

-- Backend service role retains full access for administrative operations
CREATE POLICY "Service role full access on connections" ON public.connections
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Attach trigger for connection immutability & self-acceptance protection
DROP TRIGGER IF EXISTS trg_connections_integrity ON public.connections;
CREATE TRIGGER trg_connections_integrity
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_connection_integrity();


-- ------------------------------------------------------------------------------
-- 2. CONVERSATIONS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow insert on conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow update on conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow delete on conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;
DROP POLICY IF EXISTS "Service role full access on conversations" ON public.conversations;

-- Only conversation participants can view their conversations
CREATE POLICY "conversations_select_own" ON public.conversations
  FOR SELECT TO authenticated
  USING (participant1_id::text = auth.uid()::text OR participant2_id::text = auth.uid()::text);

-- Authenticated users can only create conversations they participate in
CREATE POLICY "conversations_insert_own" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    (participant1_id::text = auth.uid()::text OR participant2_id::text = auth.uid()::text)
    AND participant1_id <> participant2_id
  );

-- Only participants can update conversation metadata (e.g. last_message, last_message_at)
CREATE POLICY "conversations_update_own" ON public.conversations
  FOR UPDATE TO authenticated
  USING (participant1_id::text = auth.uid()::text OR participant2_id::text = auth.uid()::text)
  WITH CHECK (participant1_id::text = auth.uid()::text OR participant2_id::text = auth.uid()::text);

-- Only participants can delete conversations
CREATE POLICY "conversations_delete_own" ON public.conversations
  FOR DELETE TO authenticated
  USING (participant1_id::text = auth.uid()::text OR participant2_id::text = auth.uid()::text);

CREATE POLICY "Service role full access on conversations" ON public.conversations
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 3. MESSAGES TABLE (Direct Chat Messages)
-- ------------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on messages" ON public.messages;
DROP POLICY IF EXISTS "Allow insert on messages" ON public.messages;
DROP POLICY IF EXISTS "Allow update on messages" ON public.messages;
DROP POLICY IF EXISTS "Allow delete on messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
DROP POLICY IF EXISTS "messages_update_recipient" ON public.messages;
DROP POLICY IF EXISTS "messages_update_sender" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
DROP POLICY IF EXISTS "Service role full access on messages" ON public.messages;

-- Only message sender or receiver can read private direct messages
CREATE POLICY "messages_select_own" ON public.messages
  FOR SELECT TO authenticated
  USING (sender_id::text = auth.uid()::text OR receiver_id::text = auth.uid()::text);

-- Senders can only insert messages from their authenticated ID to another user
CREATE POLICY "messages_insert_own" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id::text = auth.uid()::text
    AND sender_id <> receiver_id
  );

-- Recipients can mark messages as read
CREATE POLICY "messages_update_recipient" ON public.messages
  FOR UPDATE TO authenticated
  USING (receiver_id::text = auth.uid()::text)
  WITH CHECK (receiver_id::text = auth.uid()::text);

-- Senders can edit their own sent message
CREATE POLICY "messages_update_sender" ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id::text = auth.uid()::text)
  WITH CHECK (sender_id::text = auth.uid()::text);

-- Only the author can delete their sent message
CREATE POLICY "messages_delete_own" ON public.messages
  FOR DELETE TO authenticated
  USING (sender_id::text = auth.uid()::text);

CREATE POLICY "Service role full access on messages" ON public.messages
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Attach trigger for message content integrity
DROP TRIGGER IF EXISTS trg_messages_integrity ON public.messages;
CREATE TRIGGER trg_messages_integrity
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_integrity();


-- ------------------------------------------------------------------------------
-- 4. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow insert on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow update on notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow delete on notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "Service role full access on notifications" ON public.notifications;

-- Users can only view notifications explicitly addressed to them
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Ordinary authenticated users can ONLY create notifications originating from themselves,
-- and CANNOT create 'SYSTEM' notifications or set sender_id to NULL
CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id IS NOT NULL
    AND sender_id::text = auth.uid()::text
    AND type <> 'SYSTEM'
  );

-- Users can only mark their own notifications as read
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- Users can delete notifications addressed to them; Senders can retract notifications they sent
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id::text = auth.uid()::text OR sender_id::text = auth.uid()::text);

CREATE POLICY "Service role full access on notifications" ON public.notifications
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 5. PROJECT MESSAGES TABLE
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.project_messages') IS NOT NULL THEN
    ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public read on project_messages" ON public.project_messages;
    DROP POLICY IF EXISTS "Authenticated insert on project_messages" ON public.project_messages;
    DROP POLICY IF EXISTS "Authenticated delete on project_messages" ON public.project_messages;
    DROP POLICY IF EXISTS "project_messages_select" ON public.project_messages;
    DROP POLICY IF EXISTS "project_messages_insert" ON public.project_messages;
    DROP POLICY IF EXISTS "project_messages_update" ON public.project_messages;
    DROP POLICY IF EXISTS "project_messages_delete" ON public.project_messages;
    DROP POLICY IF EXISTS "Service role full access on project_messages" ON public.project_messages;

    -- Only active project members, creators, or viewers of PUBLIC projects can read project messages
    CREATE POLICY "project_messages_select" ON public.project_messages
      FOR SELECT TO authenticated, anon
      USING (
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_messages.project_id
          AND (
            p.visibility = 'PUBLIC'
            OR p.creator_id::text = auth.uid()::text
            OR public.is_project_member(p.roles, auth.uid()::text)
          )
        )
      );

    -- Authors can only insert messages into accessible projects
    CREATE POLICY "project_messages_insert" ON public.project_messages
      FOR INSERT TO authenticated
      WITH CHECK (
        sender_id::text = auth.uid()::text
        AND EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_messages.project_id
          AND (
            p.visibility = 'PUBLIC'
            OR p.creator_id::text = auth.uid()::text
            OR public.is_project_member(p.roles, auth.uid()::text)
          )
        )
      );

    -- Authors can update/upsert their own messages (required for client upserts on conflict)
    CREATE POLICY "project_messages_update" ON public.project_messages
      FOR UPDATE TO authenticated
      USING (sender_id::text = auth.uid()::text)
      WITH CHECK (sender_id::text = auth.uid()::text);

    -- Authors can delete their own messages; Project creators can delete all messages in their project
    CREATE POLICY "project_messages_delete" ON public.project_messages
      FOR DELETE TO authenticated
      USING (
        sender_id::text = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_messages.project_id
          AND p.creator_id::text = auth.uid()::text
        )
      );

    CREATE POLICY "Service role full access on project_messages" ON public.project_messages
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 6. PROTOTYPE PROPOSALS TABLE ("Build Together" Proposals)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.prototype_proposals') IS NOT NULL THEN
    ALTER TABLE public.prototype_proposals ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Proposals are viewable by sender or receiver" ON public.prototype_proposals;
    DROP POLICY IF EXISTS "Authenticated users can create proposals" ON public.prototype_proposals;
    DROP POLICY IF EXISTS "Receivers can update proposal status" ON public.prototype_proposals;
    DROP POLICY IF EXISTS "Senders can delete proposals" ON public.prototype_proposals;
    DROP POLICY IF EXISTS "proposals_select_own" ON public.prototype_proposals;
    DROP POLICY IF EXISTS "proposals_insert_own" ON public.prototype_proposals;
    DROP POLICY IF EXISTS "proposals_update_own" ON public.prototype_proposals;
    DROP POLICY IF EXISTS "proposals_update_recipient" ON public.prototype_proposals;
    DROP POLICY IF EXISTS "proposals_update_sender" ON public.prototype_proposals;
    DROP POLICY IF EXISTS "proposals_delete_own" ON public.prototype_proposals;
    DROP POLICY IF EXISTS "Service role full access on prototype_proposals" ON public.prototype_proposals;

    -- Only the proposal sender or proposal recipient can read proposal details
    CREATE POLICY "proposals_select_own" ON public.prototype_proposals
      FOR SELECT TO authenticated
      USING (sender_id::text = auth.uid()::text OR receiver_id::text = auth.uid()::text);

    -- Senders can only create proposals where they are the authenticated sender
    CREATE POLICY "proposals_insert_own" ON public.prototype_proposals
      FOR INSERT TO authenticated
      WITH CHECK (
        sender_id::text = auth.uid()::text
        AND sender_id <> receiver_id
      );

    -- Recipients can accept or decline a pending proposal
    CREATE POLICY "proposals_update_recipient" ON public.prototype_proposals
      FOR UPDATE TO authenticated
      USING (receiver_id::text = auth.uid()::text AND status = 'PENDING')
      WITH CHECK (
        receiver_id::text = auth.uid()::text
        AND status IN ('ACCEPTED', 'DECLINED', 'REJECTED')
      );

    -- Senders can update proposal details while pending, but CANNOT change status (withdraw by deleting)
    CREATE POLICY "proposals_update_sender" ON public.prototype_proposals
      FOR UPDATE TO authenticated
      USING (sender_id::text = auth.uid()::text AND status = 'PENDING')
      WITH CHECK (
        sender_id::text = auth.uid()::text
        AND status = 'PENDING'
      );

    -- Only the sender can withdraw/delete a proposal
    CREATE POLICY "proposals_delete_own" ON public.prototype_proposals
      FOR DELETE TO authenticated
      USING (sender_id::text = auth.uid()::text);

    CREATE POLICY "Service role full access on prototype_proposals" ON public.prototype_proposals
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    -- Attach proposal integrity trigger
    DROP TRIGGER IF EXISTS trg_prototype_proposals_integrity ON public.prototype_proposals;
    CREATE TRIGGER trg_prototype_proposals_integrity
      BEFORE UPDATE ON public.prototype_proposals
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_prototype_proposal_integrity();
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 7. STARTUP PROPOSALS TABLE (Pitch & Co-Founder Proposals)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.startup_proposals') IS NOT NULL THEN
    ALTER TABLE public.startup_proposals ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "startup_proposals_select_own" ON public.startup_proposals;
    DROP POLICY IF EXISTS "startup_proposals_insert_own" ON public.startup_proposals;
    DROP POLICY IF EXISTS "startup_proposals_update_own" ON public.startup_proposals;
    DROP POLICY IF EXISTS "startup_proposals_update_recipient" ON public.startup_proposals;
    DROP POLICY IF EXISTS "startup_proposals_update_sender" ON public.startup_proposals;
    DROP POLICY IF EXISTS "startup_proposals_delete_own" ON public.startup_proposals;
    DROP POLICY IF EXISTS "Service role full access on startup_proposals" ON public.startup_proposals;

    -- Only sender or receiver can view startup proposals
    CREATE POLICY "startup_proposals_select_own" ON public.startup_proposals
      FOR SELECT TO authenticated
      USING (sender_id::text = auth.uid()::text OR receiver_id::text = auth.uid()::text);

    -- Senders can only create startup proposals where they are the authenticated sender
    CREATE POLICY "startup_proposals_insert_own" ON public.startup_proposals
      FOR INSERT TO authenticated
      WITH CHECK (
        sender_id::text = auth.uid()::text
        AND sender_id <> receiver_id
      );

    -- Recipients can accept or decline a pending startup pitch proposal
    CREATE POLICY "startup_proposals_update_recipient" ON public.startup_proposals
      FOR UPDATE TO authenticated
      USING (receiver_id::text = auth.uid()::text AND status = 'PENDING')
      WITH CHECK (
        receiver_id::text = auth.uid()::text
        AND status IN ('ACCEPTED', 'DECLINED', 'REJECTED')
      );

    -- Senders can update proposal details while pending, but CANNOT change status (withdraw by deleting)
    CREATE POLICY "startup_proposals_update_sender" ON public.startup_proposals
      FOR UPDATE TO authenticated
      USING (sender_id::text = auth.uid()::text AND status = 'PENDING')
      WITH CHECK (
        sender_id::text = auth.uid()::text
        AND status = 'PENDING'
      );

    -- Only the sender can delete/withdraw their proposal
    CREATE POLICY "startup_proposals_delete_own" ON public.startup_proposals
      FOR DELETE TO authenticated
      USING (sender_id::text = auth.uid()::text);

    CREATE POLICY "Service role full access on startup_proposals" ON public.startup_proposals
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    -- Attach startup proposal integrity trigger
    DROP TRIGGER IF EXISTS trg_startup_proposals_integrity ON public.startup_proposals;
    CREATE TRIGGER trg_startup_proposals_integrity
      BEFORE UPDATE ON public.startup_proposals
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_startup_proposal_integrity();
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 8. PROJECTS TABLE (Project Cards & Group Rooms)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.projects') IS NOT NULL THEN
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON public.projects;
    DROP POLICY IF EXISTS "projects_select" ON public.projects;
    DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
    DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
    DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
    DROP POLICY IF EXISTS "Service role full access on projects" ON public.projects;

    -- Public projects are viewable by all; private projects viewable by creator or assigned team members (exact JSONB check)
    CREATE POLICY "projects_select" ON public.projects
      FOR SELECT TO authenticated, anon
      USING (
        visibility = 'PUBLIC'
        OR creator_id::text = auth.uid()::text
        OR public.is_project_member(roles, auth.uid()::text)
      );

    -- Authenticated users can create projects where they are the creator
    CREATE POLICY "projects_insert_own" ON public.projects
      FOR INSERT TO authenticated
      WITH CHECK (creator_id::text = auth.uid()::text);

    -- Creators can update project details; assigned team members can update role state
    CREATE POLICY "projects_update_own" ON public.projects
      FOR UPDATE TO authenticated
      USING (
        creator_id::text = auth.uid()::text
        OR public.is_project_member(roles, auth.uid()::text)
      )
      WITH CHECK (
        creator_id::text = auth.uid()::text
        OR public.is_project_member(roles, auth.uid()::text)
      );

    -- Only creators can delete their project
    CREATE POLICY "projects_delete_own" ON public.projects
      FOR DELETE TO authenticated
      USING (creator_id::text = auth.uid()::text);

    CREATE POLICY "Service role full access on projects" ON public.projects
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);

    -- Attach project creator protection trigger
    DROP TRIGGER IF EXISTS trg_projects_integrity ON public.projects;
    CREATE TRIGGER trg_projects_integrity
      BEFORE UPDATE ON public.projects
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_project_integrity();
  END IF;
END $$;
