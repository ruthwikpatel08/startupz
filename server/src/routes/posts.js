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

    // Always ensure fresh posts from Supabase are synchronized into Prisma
    if (supabaseAdmin) {
      try {
        const { data: supaList } = await supabaseAdmin
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

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
        console.warn('Posts sync notice:', syncErr?.message);
      }
    }

    let userLikes = new Set();
    let userVotesMap = new Map();
    let userSaves = new Set();

    if (req.user) {
      const [likes, saves] = await Promise.all([
        prisma.like.findMany({
          where: { userId: req.user.id, postId: { not: null } },
          select: { postId: true, voteType: true },
        }),
        prisma.savedItem.findMany({
          where: { userId: req.user.id, itemType: 'POST' },
          select: { itemId: true },
        }),
      ]);

      likes.forEach((l) => {
        if (l.voteType === 'DOWN') {
          userVotesMap.set(l.postId, 'down');
        } else {
          userLikes.add(l.postId);
          userVotesMap.set(l.postId, 'up');
        }
      });
      saves.forEach((s) => userSaves.add(s.itemId));
    }

    const formatted = posts.map((p) => ({
      ...p,
      isLiked: userLikes.has(p.id),
      userVote: userVotesMap.get(p.id) || null,
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
        await supabaseAdmin.from('posts').upsert({
          id: post.id,
          author_id: req.user.id,
          startup_id: startupId || null,
          post_type: postType,
          title: title ? title.trim() : null,
          content: content.trim(),
          images: images || null,
          links: links || null,
          likes_count: 0,
          comments_count: 0,
        }, { onConflict: 'id' });
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
    if (post) {
      if (supabaseAdmin) {
        try {
          const { data: supaCounts } = await supabaseAdmin
            .from('posts')
            .select('likes_count, comments_count')
            .eq('id', postId)
            .maybeSingle();
          if (supaCounts && (supaCounts.likes_count !== post.likesCount || supaCounts.comments_count !== post.commentsCount)) {
            post = await prisma.post.update({
              where: { id: postId },
              data: {
                likesCount: supaCounts.likes_count ?? post.likesCount,
                commentsCount: supaCounts.comments_count ?? post.commentsCount,
              },
            }).catch(() => post);
          }
        } catch {}
      }
      return post;
    }

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

    let liked = false;
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } }).catch(() => null);
      liked = false;

      // Erase like notification when removed
      const post = await prisma.post.findUnique({ where: { id } }).catch(() => null);
      if (post && post.authorId !== req.user.id) {
        await prisma.notification.deleteMany({
          where: {
            userId: post.authorId,
            senderId: req.user.id,
            type: { in: ['POST_LIKE', 'POST_UPVOTE'] },
          },
        }).catch(() => null);

        if (supabaseAdmin) {
          await supabaseAdmin.from('notifications')
            .delete()
            .match({ user_id: post.authorId, sender_id: req.user.id })
            .in('type', ['POST_LIKE', 'POST_UPVOTE'])
            .catch(() => null);
        }
      }

      if (supabaseAdmin) {
        await supabaseAdmin.from('likes').delete().match({ user_id: req.user.id, post_id: id }).catch(() => null);
      }
    } else {
      await prisma.like.create({
        data: { userId: req.user.id, postId: id, voteType: 'UP' },
      }).catch(async () => {
        await prisma.like.updateMany({
          where: { userId: req.user.id, postId: id },
          data: { voteType: 'UP' },
        });
      });
      liked = true;

      if (supabaseAdmin) {
        await supabaseAdmin.from('likes').upsert({
          user_id: req.user.id,
          post_id: id,
          vote_type: 'UP',
        }, { onConflict: 'user_id,post_id' }).catch(() => null);
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
            link: `/feed#post-${id}`,
          },
        }).catch(() => null);

        if (supabaseAdmin) {
          await supabaseAdmin.from('notifications').insert({
            user_id: post.authorId,
            sender_id: req.user.id,
            type: 'POST_LIKE',
            title: 'Liked your post ❤️',
            message: `${req.user.profile?.fullName || 'Someone'} liked your update.`,
            link: `/feed#post-${id}`,
            is_read: false,
          }).catch(() => null);
        }
      }
    }

    const upCount = await prisma.like.count({ where: { postId: id, voteType: { not: 'DOWN' } } });
    const downCount = await prisma.like.count({ where: { postId: id, voteType: 'DOWN' } });
    const score = Math.max(0, upCount - downCount);

    await prisma.post.update({
      where: { id },
      data: { likesCount: score },
    }).catch(() => null);

    if (supabaseAdmin) {
      await supabaseAdmin.from('posts').update({ likes_count: score }).eq('id', id).catch(() => null);
    }

    return res.json({ liked, likesCount: score });
  } catch (error) {
    console.error('Like post error:', error);
    return res.status(500).json({ error: 'Failed to like post.' });
  }
});

// POST /api/posts/:id/vote - Reddit / Hacker News style upvote/downvote
router.post('/:id/vote', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body; // 'up', 'down', or null
    await ensurePostInPrisma(id);

    if (vote === 'up') {
      const existing = await prisma.like.findFirst({ where: { userId: req.user.id, postId: id } });
      if (existing) {
        await prisma.like.update({ where: { id: existing.id }, data: { voteType: 'UP' } }).catch(() => null);
      } else {
        await prisma.like.create({ data: { userId: req.user.id, postId: id, voteType: 'UP' } }).catch(() => null);
      }

      if (supabaseAdmin) {
        await supabaseAdmin.from('likes').upsert({
          user_id: req.user.id,
          post_id: id,
          vote_type: 'UP',
        }, { onConflict: 'user_id,post_id' }).catch(() => null);
      }
    } else if (vote === 'down') {
      const existing = await prisma.like.findFirst({ where: { userId: req.user.id, postId: id } });
      if (existing) {
        await prisma.like.update({ where: { id: existing.id }, data: { voteType: 'DOWN' } }).catch(() => null);
      } else {
        await prisma.like.create({ data: { userId: req.user.id, postId: id, voteType: 'DOWN' } }).catch(() => null);
      }

      if (supabaseAdmin) {
        await supabaseAdmin.from('likes').upsert({
          user_id: req.user.id,
          post_id: id,
          vote_type: 'DOWN',
        }, { onConflict: 'user_id,post_id' }).catch(() => null);
      }
    } else {
      // Toggle off / remove vote
      await prisma.like.deleteMany({ where: { userId: req.user.id, postId: id } }).catch(() => null);
      if (supabaseAdmin) {
        await supabaseAdmin.from('likes').delete().match({ user_id: req.user.id, post_id: id }).catch(() => null);
      }
    }

    const upCount = await prisma.like.count({ where: { postId: id, voteType: 'UP' } });
    const downCount = await prisma.like.count({ where: { postId: id, voteType: 'DOWN' } });
    const score = upCount - downCount;

    await prisma.post.update({
      where: { id },
      data: { likesCount: score },
    }).catch(() => null);

    if (supabaseAdmin) {
      await supabaseAdmin.from('posts').update({ likes_count: score }).eq('id', id).catch(() => null);
    }

    const currentPost = await prisma.post.findUnique({ where: { id } }).catch(() => null);
    const senderName = req.user.profile?.fullName || req.user.email?.split('@')[0] || 'A founder';

    // Handle vote notifications
    if (currentPost && currentPost.authorId !== req.user.id) {
      if (vote === 'up') {
        await prisma.notification.deleteMany({
          where: { userId: currentPost.authorId, senderId: req.user.id, type: 'POST_DOWNVOTE' },
        }).catch(() => null);

        await prisma.notification.create({
          data: {
            userId: currentPost.authorId,
            senderId: req.user.id,
            type: 'POST_LIKE',
            title: 'Upvoted your idea 💡',
            message: `${senderName} upvoted your idea.`,
            link: `/feed#post-${id}`,
          },
        }).catch(() => null);

        if (supabaseAdmin) {
          await supabaseAdmin.from('notifications')
            .delete()
            .match({ user_id: currentPost.authorId, sender_id: req.user.id, type: 'POST_DOWNVOTE' })
            .catch(() => null);

          await supabaseAdmin.from('notifications').insert({
            user_id: currentPost.authorId,
            sender_id: req.user.id,
            type: 'POST_LIKE',
            title: 'Upvoted your idea 💡',
            message: `${senderName} upvoted your idea.`,
            link: `/feed#post-${id}`,
            is_read: false,
          }).catch(() => null);
        }
      } else if (vote === 'down') {
        await prisma.notification.deleteMany({
          where: { userId: currentPost.authorId, senderId: req.user.id, type: { in: ['POST_LIKE', 'POST_UPVOTE'] } },
        }).catch(() => null);

        await prisma.notification.create({
          data: {
            userId: currentPost.authorId,
            senderId: req.user.id,
            type: 'POST_DOWNVOTE',
            title: 'Downvoted your idea 👎',
            message: `${senderName} downvoted your idea.`,
            link: `/feed#post-${id}`,
          },
        }).catch(() => null);

        if (supabaseAdmin) {
          await supabaseAdmin.from('notifications')
            .delete()
            .match({ user_id: currentPost.authorId, sender_id: req.user.id })
            .in('type', ['POST_LIKE', 'POST_UPVOTE'])
            .catch(() => null);

          await supabaseAdmin.from('notifications').insert({
            user_id: currentPost.authorId,
            sender_id: req.user.id,
            type: 'POST_DOWNVOTE',
            title: 'Downvoted your idea 👎',
            message: `${senderName} downvoted your idea.`,
            link: `/feed#post-${id}`,
            is_read: false,
          }).catch(() => null);
        }
      } else {
        await prisma.notification.deleteMany({
          where: { userId: currentPost.authorId, senderId: req.user.id, type: { in: ['POST_LIKE', 'POST_UPVOTE', 'POST_DOWNVOTE'] } },
        }).catch(() => null);

        if (supabaseAdmin) {
          await supabaseAdmin.from('notifications')
            .delete()
            .match({ user_id: currentPost.authorId, sender_id: req.user.id })
            .in('type', ['POST_LIKE', 'POST_UPVOTE', 'POST_DOWNVOTE'])
            .catch(() => null);
        }
      }
    }

    return res.json({ success: true, vote, score });
  } catch (error) {
    console.error('Vote post error:', error);
    return res.status(500).json({ error: 'Failed to vote on post.' });
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

      if (supabaseAdmin) {
        await supabaseAdmin.from('notifications').insert({
          user_id: post.authorId,
          sender_id: req.user.id,
          type: 'POST_COMMENT',
          title: 'New Comment on your post 💬',
          message: `${req.user.profile?.fullName || 'Someone'} commented: "${content.slice(0, 50)}..."`,
          link: '/feed',
          is_read: false,
        }).catch(() => null);
      }
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
