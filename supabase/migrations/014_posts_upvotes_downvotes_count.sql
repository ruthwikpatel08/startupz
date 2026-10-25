-- ==============================================================================
-- StartupZ: Post Upvotes & Downvotes Separate Accurate Tracking
-- Migration: 014_posts_upvotes_downvotes_count.sql
-- ==============================================================================

-- 1. Ensure upvotes_count and downvotes_count columns exist on posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS upvotes_count INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS downvotes_count INT DEFAULT 0;

-- 2. Backfill accurate counts from existing likes table
UPDATE posts p
SET 
  upvotes_count = COALESCE((
    SELECT COUNT(*) 
    FROM likes 
    WHERE post_id = p.id AND (vote_type = 'UP' OR vote_type IS NULL)
  ), 0),
  downvotes_count = COALESCE((
    SELECT COUNT(*) 
    FROM likes 
    WHERE post_id = p.id AND vote_type = 'DOWN'
  ), 0);

-- 3. Update the trigger function to synchronize both upvotes_count and downvotes_count alongside likes_count
CREATE OR REPLACE FUNCTION update_post_counts() RETURNS TRIGGER AS $$
DECLARE
  target_post_id UUID;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);
  IF target_post_id IS NOT NULL THEN
    IF TG_TABLE_NAME = 'likes' THEN
      UPDATE posts
      SET 
        likes_count = COALESCE((
          SELECT SUM(CASE WHEN vote_type = 'DOWN' THEN -1 ELSE 1 END)
          FROM likes
          WHERE post_id = target_post_id
        ), 0),
        upvotes_count = COALESCE((
          SELECT COUNT(*)
          FROM likes
          WHERE post_id = target_post_id AND (vote_type = 'UP' OR vote_type IS NULL)
        ), 0),
        downvotes_count = COALESCE((
          SELECT COUNT(*)
          FROM likes
          WHERE post_id = target_post_id AND vote_type = 'DOWN'
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
