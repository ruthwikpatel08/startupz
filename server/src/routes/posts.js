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

    let supaPostMap = new Map();
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
            supaPostMap.set(sp.id, sp);
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

    const formatted = posts.map((p) => {
      const sp = supaPostMap.get(p.id);
      return {
        ...p,
        problem: sp?.problem || p.problem || null,
        solution: sp?.solution || p.solution || null,
        websiteUrl: sp?.website_url || p.websiteUrl || p.links || null,
        mediaUrl: sp?.media_url || p.mediaUrl || p.images || null,
        mediaType: sp?.media_type || p.mediaType || null,
        isLiked: userLikes.has(p.id),
        userVote: userVotesMap.get(p.id) || null,
        isSaved: userSaves.has(p.id),
      };
    });

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
    const {
      postType = 'UPDATE',
      title,
      content,
      startupId,
      images,
      links,
      problem,
      solution,
      websiteUrl,
      mediaUrl,
      mediaType,
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content cannot be empty.' });
    }

    const finalLinks = links || websiteUrl || null;
    const finalImages = images || mediaUrl || null;

    const post = await prisma.post.create({
      data: {
        authorId: req.user.id,
        startupId: startupId || null,
        postType,
        title: title ? title.trim() : null,
        content: content.trim(),
        images: finalImages,
        links: finalLinks,
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
          images: finalImages,
          links: finalLinks,
          problem: problem ? problem.trim() : null,
          solution: solution ? solution.trim() : null,
          website_url: websiteUrl ? websiteUrl.trim() : finalLinks,
          media_url: mediaUrl ? mediaUrl.trim() : finalImages,
          media_type: mediaType || null,
          likes_count: 0,
          comments_count: 0,
        }, { onConflict: 'id' });
      } catch (sErr) {
        console.warn('Supabase post mirror notice:', sErr.message);
      }
    }

    return res.status(201).json({
      message: 'Post published!',
      post: {
        ...post,
        problem: problem || null,
        solution: solution || null,
        websiteUrl: websiteUrl || finalLinks,
        mediaUrl: mediaUrl || finalImages,
        mediaType: mediaType || null,
        isLiked: false,
        isSaved: false,
        comments: [],
      },
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

// ============================================================================
// PROTOTYPE BUILD TOGETHER PROPOSALS
// ============================================================================

// POST /api/posts/:id/proposals - Send a "Build Together" proposal to the uploader
router.post('/:id/proposals', requireAuth, async (req, res) => {
  try {
    const { id: prototypeId } = req.params;
    const { aboutMe, contribution, contactInfo } = req.body;

    if (!aboutMe?.trim() || !contribution?.trim()) {
      return res.status(400).json({ error: 'Please describe yourself and what you want to do for this prototype.' });
    }

    // Find the prototype post
    let post = await prisma.post.findUnique({
      where: { id: prototypeId },
      include: { author: { select: { id: true, email: true, profile: true } } },
    }).catch(() => null);

    if (!post && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('posts').select('*').eq('id', prototypeId).maybeSingle();
      if (data) {
        post = { id: data.id, authorId: data.author_id, title: data.title };
      }
    }

    if (!post) {
      return res.status(404).json({ error: 'Prototype not found.' });
    }

    const receiverId = post.authorId || post.author_id;
    if (receiverId === req.user.id) {
      return res.status(400).json({ error: 'You cannot submit a build together proposal to your own prototype.' });
    }

    const prototypeTitle = post.title || 'Prototype';
    let createdProposal = null;

    // 1. Direct Supabase insertion into prototype_proposals table
    if (supabaseAdmin) {
      try {
        const { data: supaProp, error: sErr } = await supabaseAdmin.from('prototype_proposals').insert({
          prototype_id: prototypeId,
          sender_id: req.user.id,
          receiver_id: receiverId,
          prototype_title: prototypeTitle,
          about_builder: aboutMe.trim(),
          contribution: contribution.trim(),
          contact_info: contactInfo?.trim() || null,
          status: 'PENDING',
        }).select().single();
        if (!sErr && supaProp) {
          createdProposal = supaProp;
        }
      } catch (supaErr) {
        console.warn('Supabase prototype proposal insert notice:', supaErr?.message);
      }
    }

    // 2. Also save to Prisma startup_proposals as relational backup
    try {
      await prisma.startupProposal.create({
        data: {
          senderId: req.user.id,
          receiverId,
          ideaTitle: `[Prototype:${prototypeId}] ${prototypeTitle}`,
          pitchDescription: JSON.stringify({
            aboutMe: aboutMe.trim(),
            contribution: contribution.trim(),
            contactInfo: contactInfo?.trim() || null,
            prototypeId,
          }),
          proposedRole: 'Prototype Builder',
          proposedEquity: 'Build Together',
          status: 'PENDING',
        },
      });
    } catch (prismaErr) {
      console.warn('Prisma startupProposal backup notice:', prismaErr?.message);
    }

    // 3. Create notification for the prototype uploader
    const senderName = req.user.profile?.fullName || req.user.email?.split('@')[0] || 'A builder';
    try {
      await prisma.notification.create({
        data: {
          userId: receiverId,
          type: 'PROTOTYPE_PROPOSAL',
          title: '🔨 Prototype Build Together Proposal!',
          message: `${senderName} wants to build together on "${prototypeTitle}": ${contribution.slice(0, 100)}${contribution.length > 100 ? '...' : ''}`,
          link: `/feed?pillar=PROTOTYPES&postId=${prototypeId}`,
        },
      });
    } catch (notifErr) {
      if (supabaseAdmin) {
        await supabaseAdmin.from('notifications').insert({
          user_id: receiverId,
          type: 'PROTOTYPE_PROPOSAL',
          title: '🔨 Prototype Build Together Proposal!',
          message: `${senderName} wants to build together on "${prototypeTitle}": ${contribution.slice(0, 100)}${contribution.length > 100 ? '...' : ''}`,
          link: `/feed?pillar=PROTOTYPES&postId=${prototypeId}`,
        }).catch(() => null);
      }
    }

    return res.status(201).json({
      message: 'Proposal submitted successfully!',
      proposal: createdProposal || {
        id: Date.now().toString(),
        prototypeId,
        senderId: req.user.id,
        receiverId,
        prototypeTitle,
        aboutBuilder: aboutMe.trim(),
        contribution: contribution.trim(),
        contactInfo: contactInfo?.trim() || null,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to submit prototype proposal:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit proposal.' });
  }
});

// GET /api/posts/:id/proposals - Get all proposals for a prototype
router.get('/:id/proposals', requireAuth, async (req, res) => {
  try {
    const { id: prototypeId } = req.params;
    let proposals = [];

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('prototype_proposals')
          .select('*')
          .eq('prototype_id', prototypeId)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const senderIds = [...new Set(data.map((d) => d.sender_id))];
          const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .in('user_id', senderIds);
          const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));

          proposals = data.map((d) => ({
            id: d.id,
            prototypeId: d.prototype_id,
            senderId: d.sender_id,
            receiverId: d.receiver_id,
            prototypeTitle: d.prototype_title,
            aboutBuilder: d.about_builder,
            contribution: d.contribution,
            contactInfo: d.contact_info,
            status: d.status,
            createdAt: d.created_at,
            sender: {
              id: d.sender_id,
              profile: profMap.get(d.sender_id) || null,
            },
          }));
        }
      } catch (supaErr) {
        console.warn('Supabase prototype proposals fetch notice:', supaErr?.message);
      }
    }

    // Fallback to Prisma startup_proposals if empty
    if (proposals.length === 0) {
      const pPrefix = `[Prototype:${prototypeId}]`;
      const dbProposals = await prisma.startupProposal.findMany({
        where: {
          OR: [
            { ideaTitle: { startsWith: pPrefix } },
            { pitchDescription: { contains: prototypeId } },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, avatar: true, headline: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []);

      proposals = dbProposals.map((dp) => {
        let parsed = {};
        try { parsed = JSON.parse(dp.pitchDescription); } catch {}
        return {
          id: dp.id,
          prototypeId,
          senderId: dp.senderId,
          receiverId: dp.receiverId,
          prototypeTitle: dp.ideaTitle.replace(pPrefix, '').trim(),
          aboutBuilder: parsed.aboutMe || dp.pitchDescription,
          contribution: parsed.contribution || '',
          contactInfo: parsed.contactInfo || null,
          status: dp.status,
          createdAt: dp.createdAt,
          sender: dp.sender,
        };
      });
    }

    return res.json({ proposals });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve prototype proposals.' });
  }
});

// PUT /api/posts/proposals/:proposalId - Update proposal status (ACCEPTED / DECLINED)
router.put('/proposals/:proposalId', requireAuth, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { status = 'ACCEPTED' } = req.body;

    let updated = null;

    if (supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from('prototype_proposals')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', proposalId)
          .select()
          .single();
        if (data) updated = data;
      } catch (sErr) {}
    }

    // Also update in Prisma if present
    try {
      await prisma.startupProposal.update({
        where: { id: proposalId },
        data: { status },
      });
    } catch (pErr) {}

    return res.json({ message: `Proposal status marked as ${status}`, proposal: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update proposal.' });
  }
});

// GET /api/posts/proposals/stats - Get proposal counts for the current user's prototypes
router.get('/proposals/stats', requireAuth, async (req, res) => {
  try {
    const counts = {};
    if (supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin
          .from('prototype_proposals')
          .select('prototype_id')
          .eq('receiver_id', req.user.id);
        if (Array.isArray(data)) {
          data.forEach((p) => {
            counts[p.prototype_id] = (counts[p.prototype_id] || 0) + 1;
          });
        }
      } catch (sErr) {}
    }

    return res.json({ counts });
  } catch (error) {
    return res.json({ counts: {} });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req, res) => {

  try {
    const { id } = req.params;
    let post = await prisma.post.findUnique({ where: { id } }).catch(() => null);
    if (!post && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('posts').select('*').eq('id', id).maybeSingle();
      if (data) {
        post = { id: data.id, authorId: data.author_id };
      }
    }

    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const authorId = post.authorId || post.author_id;
    if (authorId && authorId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this post.' });
    }

    await prisma.post.delete({ where: { id } }).catch(() => null);

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
