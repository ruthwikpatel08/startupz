import express from 'express';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

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

    const [total, posts] = await Promise.all([
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

    return res.status(201).json({
      message: 'Post published!',
      post: { ...post, isLiked: false, isSaved: false, comments: [] },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to publish post.' });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.like.findFirst({
      where: { userId: req.user.id, postId: id },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      const updated = await prisma.post.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      });
      return res.json({ liked: false, likesCount: updated.likesCount });
    } else {
      await prisma.like.create({
        data: { userId: req.user.id, postId: id },
      });
      const updated = await prisma.post.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      });

      const post = await prisma.post.findUnique({ where: { id } });
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
        });
      }

      return res.json({ liked: true, likesCount: updated.likesCount });
    }
  } catch (error) {
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
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
      },
    });

    await prisma.post.update({
      where: { id },
      data: { commentsCount: { increment: 1 } },
    });

    const post = await prisma.post.findUnique({ where: { id } });
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
      });
    }

    return res.status(201).json({ message: 'Comment posted.', comment });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// GET /api/posts/:id/comments
router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await prisma.comment.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            profile: { select: { fullName: true, avatar: true, headline: true } },
          },
        },
      },
    });

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
    return res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete post.' });
  }
});

export default router;
