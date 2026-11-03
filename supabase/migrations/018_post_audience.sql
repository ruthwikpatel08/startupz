-- Restrictive policies compose with existing SELECT policies rather than widening them.
-- Retain the legacy title marker as storage metadata; clients strip it for display.
DROP POLICY IF EXISTS posts_audience ON public.posts;
CREATE POLICY posts_audience ON public.posts AS RESTRICTIVE FOR SELECT
TO anon, authenticated USING (
  coalesce(title, '') !~* '\[Connections Only\]'
  OR author_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.connections c WHERE c.status = 'ACCEPTED'
    AND ((c.sender_id = auth.uid() AND c.receiver_id = posts.author_id)
      OR (c.receiver_id = auth.uid() AND c.sender_id = posts.author_id))
  )
);

DROP POLICY IF EXISTS comments_post_audience ON public.comments;
CREATE POLICY comments_post_audience ON public.comments AS RESTRICTIVE FOR SELECT
TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = comments.post_id));

DROP POLICY IF EXISTS likes_post_audience ON public.likes;
CREATE POLICY likes_post_audience ON public.likes AS RESTRICTIVE FOR SELECT
TO anon, authenticated USING (post_id IS NULL OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = likes.post_id));
