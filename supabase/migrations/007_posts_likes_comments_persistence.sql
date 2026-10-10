-- ==============================================================================
-- StartupZ: Posts, Achievements, Likes & Comments Permanent Persistence
-- Migration: 007_posts_likes_comments_persistence.sql
-- ==============================================================================

-- 1. Ensure foreign key constraints do not block user posts, comments, or likes
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_author_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;

-- 2. Add vote_type column to likes table for upvoting and downvoting
ALTER TABLE likes ADD COLUMN IF NOT EXISTS vote_type TEXT NOT NULL DEFAULT 'UP';

-- 3. Add unique constraint on likes(user_id, post_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'likes_user_post_unique'
  ) THEN
    ALTER TABLE likes ADD CONSTRAINT likes_user_post_unique UNIQUE (user_id, post_id);
  END IF;
END $$;

-- 4. Enable RLS and setup permissive policies for authenticated users
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Posts policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Public posts are viewable') THEN
    CREATE POLICY "Public posts are viewable" ON posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Authenticated users can create posts') THEN
    CREATE POLICY "Authenticated users can create posts" ON posts FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Authenticated users can update posts') THEN
    CREATE POLICY "Authenticated users can update posts" ON posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Users can delete their own posts') THEN
    CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE TO authenticated USING (auth.uid() = author_id);
  END IF;

  -- Comments policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Comments are viewable') THEN
    CREATE POLICY "Comments are viewable" ON comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Authenticated users can create comments') THEN
    CREATE POLICY "Authenticated users can create comments" ON comments FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'Users can delete their own comments') THEN
    CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE TO authenticated USING (auth.uid() = author_id);
  END IF;

  -- Likes policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'Likes are viewable') THEN
    CREATE POLICY "Likes are viewable" ON likes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'Authenticated users can create likes') THEN
    CREATE POLICY "Authenticated users can create likes" ON likes FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'likes' AND policyname = 'Authenticated users can delete their own likes') THEN
    CREATE POLICY "Authenticated users can delete their own likes" ON likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Trigger functions for automatic count synchronization
CREATE OR REPLACE FUNCTION update_post_counts() RETURNS TRIGGER AS $$
DECLARE
  target_post_id UUID;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);
  IF target_post_id IS NOT NULL THEN
    IF TG_TABLE_NAME = 'likes' THEN
      UPDATE posts
      SET likes_count = COALESCE((
        SELECT SUM(CASE WHEN vote_type = 'DOWN' THEN -1 ELSE 1 END)
        FROM likes
        WHERE post_id = target_post_id
      ), 0),
      updated_at = NOW()
      WHERE id = target_post_id;
    ELSIF TG_TABLE_NAME = 'comments' THEN
      UPDATE posts
      SET comments_count = COALESCE((
        SELECT COUNT(*)
        FROM comments
        WHERE post_id = target_post_id
      ), 0),
      updated_at = NOW()
      WHERE id = target_post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_likes_count') THEN
    CREATE TRIGGER trg_likes_count
      AFTER INSERT OR UPDATE OR DELETE ON likes
      FOR EACH ROW EXECUTE FUNCTION update_post_counts();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_comments_count') THEN
    CREATE TRIGGER trg_comments_count
      AFTER INSERT OR DELETE ON comments
      FOR EACH ROW EXECUTE FUNCTION update_post_counts();
  END IF;
END $$;
