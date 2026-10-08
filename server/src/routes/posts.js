import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';

const router = express.Router();

// GET /api/posts
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { postType, startupId, authorId, page = 1, limit = 15 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (postType && postType !== 'ALL') where.postType = postType;
    if (startupId) where.startupId = startupId;
    if (authorId) where.authorId = authorId;

    let [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              role: true,
              isVerified: true,
              verificationBadge: true,
              profile: {
                select: { fullName: true, avatar: true, headline: true, location: true },
              },
            },
          },
          startup: {
            select: { id: true, name: true, logo: true, stage: true, industry: true },
          },
          comments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              author: {
                select: {
                  id: true,
                  profile: { select: { fullName: true, avatar: true } },
                },
              },
            },
          },
          _count: { select: { comments: true, likes: true } },
        },
      }),
    ]);

    if (total === 0 && supabaseAdmin) {
      try {
        const { data: supaList } = await supabaseAdmin
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (Array.isArray(supaList) && supaList.length > 0) {
          for (const sp of supaList) {
            await ensurePostInPrisma(sp.id);
          }
          [total, posts] = await Promise.all([
            prisma.post.count({ where }),
            prisma.post.findMany({
              where,
              skip,
              take: limitNum,
              orderBy: { createdAt: 'desc' },
              include: {
                author: {
                  select: {
                    id: true,
                    email: true,
                    role: true,
                    isVerified: true,
                    verificationBadge: true,
                    profile: {
                      select: { fullName: true, avatar: true, headline: true, location: true },
                    },
                  },
                },
                startup: {
                  select: { id: true, name: true, logo: true, stage: true, industry: true },
                },
                comments: {
                  take: 3,
                  orderBy: { createdAt: 'desc' },
                  include: {
                    author: {
                      select: {
                        id: true,
                        profile: { select: { fullName: true, avatar: true } },
                      },
                    },
                  },
                },
                _count: { select: { comments: true, likes: true } },
              },
            }),
          ]);
        }
      } catch (syncErr) {
        console.warn('Initial posts sync notice:', syncErr?.message);
      }
    }

    let userLikes = new Set();
    let userSaves = new Set();

    if (req.user) {
      const [likes, saves] = await Promise.all([
        prisma.like.findMany({
          where: { userId: req.user.id, postId: { not: null } },
          select: { postId: true },
        }),
        prisma.savedItem.findMany({
          where: { userId: req.user.id, itemType: 'POST' },
          select: { itemId: true },
        }),
      ]);

      likes.forEach((l) => userLikes.add(l.postId));
      saves.forEach((s) => userSaves.add(s.itemId));
    }

    const formatted = posts.map((p) => ({
      ...p,
      isLiked: userLikes.has(p.id),
      isSaved: userSaves.has(p.id),
    }));

    return res.json({
      posts: formatted,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve posts.' });
  }
});

// POST /api/posts
router.post('/', requireAuth, async (req, res) => {
  try {
    const { postType = 'UPDATE', title, content, startupId, images, links } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content cannot be empty.' });
    }

    const post = await prisma.post.create({
      data: {
        authorId: req.user.id,
        startupId: startupId || null,
        postType,
        title: title ? title.trim() : null,
        content: content.trim(),
        images,
        links,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            role: true,
            isVerified: true,
            verificationBadge: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
        startup: { select: { id: true, name: true, logo: true, stage: true } },
      },
    });

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('posts').insert({
          id: post.id,
          author_id: req.user.id,
          startup_id: startupId || null,
          post_type: postType,
          title: title ? title.trim() : null,
          content: content.trim(),
          images: images || null,
          links: links || null,
        });
      } catch (sErr) {
        console.warn('Supabase post mirror notice:', sErr.message);
      }
    }

    return res.status(201).json({
      message: 'Post published!',
      post: { ...post, isLiked: false, isSaved: false, comments: [] },
    });
  } catch (error) {
    console.error('Failed to publish post:', error);
    return res.status(500).json({ error: error.message || 'Failed to publish post.' });
  }
});

// Helper to ensure a post exists in Prisma (syncing from Supabase if needed)
async function ensurePostInPrisma(postId) {
  try {
    let post = await prisma.post.findUnique({ where: { id: postId } });
    if (post) return post;

    if (!supabaseAdmin) return null;

    const { data: supaPost, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', postId)
      .maybeSingle();

    if (error || !supaPost) return null;

    // Ensure author exists in Prisma User table
    let author = await prisma.user.findUnique({ where: { id: supaPost.author_id } });
    if (!author) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', supaPost.author_id)
        .maybeSingle();

      const fullName = prof?.full_name || 'Community Builder';
      const role = (prof?.preferred_role || 'FOUNDER').toUpperCase();

      author = await prisma.user.create({
        data: {
          id: supaPost.author_id,
          email: `${supaPost.author_id}@startupz.network`,
          password: 'SUPABASE_SYNCED',
          role: role,
          isVerified: true,
          verificationBadge: 'Verified Member',
          profile: {
            create: {
              fullName,
              headline: prof?.headline || 'Startup Builder',
              location: prof?.location || 'Remote',
              avatar: prof?.avatar || null,
            },
          },
        },
      });
    }

    // Insert post into Prisma
    post = await prisma.post.create({
      data: {
        id: supaPost.id,
        authorId: author.id,
        startupId: supaPost.startup_id || null,
        postType: supaPost.post_type || 'UPDATE',
        title: supaPost.title || null,
        content: supaPost.content || '',
        images: supaPost.images || null,
        links: supaPost.links || null,
        likesCount: supaPost.likes_count || 0,
        commentsCount: supaPost.comments_count || 0,
        createdAt: supaPost.created_at ? new Date(supaPost.created_at) : new Date(),
      },
    });

    return post;
  } catch (err) {
    console.warn('ensurePostInPrisma error:', err?.message);
    return null;
  }
}

// POST /api/posts/:id/like
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await ensurePostInPrisma(id);

    const existing = await prisma.like.findFirst({
      where: { userId: req.user.id, postId: id },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      const updated = await prisma.post.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      }).catch(() => null);

      const likesCount = Math.max(0, updated ? updated.likesCount : 0);

      if (supabaseAdmin) {
        await supabaseAdmin.from('likes').delete().match({ user_id: req.user.id, post_id: id }).catch(() => null);
        await supabaseAdmin.from('posts').update({ likes_count: likesCount }).eq('id', id).catch(() => null);
      }

      return res.json({ liked: false, likesCount });
    } else {
      await prisma.like.create({
        data: { userId: req.user.id, postId: id },
      }).catch(() => null);

      const updated = await prisma.post.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      }).catch(() => null);

      const likesCount = updated ? updated.likesCount : 1;

      if (supabaseAdmin) {
        await supabaseAdmin.from('likes').insert({ user_id: req.user.id, post_id: id }).catch(() => null);
        await supabaseAdmin.from('posts').update({ likes_count: likesCount }).eq('id', id).catch(() => null);
      }

      const post = await prisma.post.findUnique({ where: { id } }).catch(() => null);
      if (post && post.authorId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: post.authorId,
            senderId: req.user.id,
            type: 'POST_LIKE',
            title: 'Liked your post',
            message: `${req.user.profile?.fullName || 'Someone'} liked your update.`,
            link: '/feed',
          },
        }).catch(() => null);
      }

      return res.json({ liked: true, likesCount });
    }
  } catch (error) {
    console.error('Like post error:', error);
    return res.status(500).json({ error: 'Failed to like post.' });
  }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty.' });
    }

    await ensurePostInPrisma(id);

    const comment = await prisma.comment.create({
      data: {
        postId: id,
        authorId: req.user.id,
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
      },
    });

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { commentsCount: { increment: 1 } },
    }).catch(() => null);

    if (supabaseAdmin) {
      await supabaseAdmin.from('comments').insert({
        id: comment.id,
        post_id: id,
        author_id: req.user.id,
        content: content.trim(),
      }).catch(() => null);

      if (updatedPost) {
        await supabaseAdmin.from('posts').update({ comments_count: updatedPost.commentsCount }).eq('id', id).catch(() => null);
      }
    }

    const post = await prisma.post.findUnique({ where: { id } }).catch(() => null);
    if (post && post.authorId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          senderId: req.user.id,
          type: 'POST_COMMENT',
          title: 'New Comment on your post 💬',
          message: `${req.user.profile?.fullName || 'Someone'} commented: "${content.slice(0, 50)}..."`,
          link: '/feed',
        },
      }).catch(() => null);
    }

    return res.status(201).json({ message: 'Comment posted.', comment });
  } catch (error) {
    console.error('Post comment error:', error);
    return res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// GET /api/posts/:id/comments
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await ensurePostInPrisma(id);

    let comments = await prisma.comment.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
      },
    });

    if (comments.length === 0 && supabaseAdmin) {
      const { data: supaComments } = await supabaseAdmin
        .from('comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (Array.isArray(supaComments) && supaComments.length > 0) {
        const authorIds = supaComments.map((c) => c.author_id);
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .in('user_id', authorIds);
        const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));

        comments = supaComments.map((sc) => {
          const pr = profMap.get(sc.author_id);
          return {
            id: sc.id,
            postId: sc.post_id,
            authorId: sc.author_id,
            content: sc.content,
            createdAt: sc.created_at,
            author: {
              id: sc.author_id,
              email: '',
              profile: pr ? { fullName: pr.full_name, avatar: pr.avatar, headline: pr.headline } : null,
            },
          };
        });
      }
    }

    return res.json({ comments });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) return res.status(404).json({ error: 'Post not found.' });

    if (post.authorId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this post.' });
    }

    await prisma.post.delete({ where: { id } });

    // Clean up any saved items referencing this post
    await prisma.savedItem.deleteMany({
      where: { itemType: 'POST', itemId: id },
    }).catch(() => null);

    // Mirror delete to Supabase if configured
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('posts').delete().eq('id', id);
      } catch (sErr) {}
    }

    return res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete post.' });
  }
});

export default router;
