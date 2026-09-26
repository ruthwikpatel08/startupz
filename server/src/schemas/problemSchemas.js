import { z } from 'zod';

export const ProblemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(5).max(150),
  description: z.string().min(20),
  source_url: z.string().url().nullable().optional(),
  impact_level: z.number().int().min(1).max(10).nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const ProblemCreateSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150, 'Title cannot exceed 150 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  categoryIds: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  regionIds: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  impact_level: z.number().int().min(1).max(10).optional(),
  impactLevel: z.number().int().min(1).max(10).optional(),
  source_url: z.string().url('Must be a valid URL starting with http:// or https://').or(z.literal('')).optional(),
  sourceUrl: z.string().url('Must be a valid URL starting with http:// or https://').or(z.literal('')).optional(),
}).refine((data) => (data.categoryIds && data.categoryIds.length > 0) || (data.categories && data.categories.length > 0), {
  message: 'At least one category is required.',
  path: ['categories'],
});

export const ProblemUpdateSchema = z.object({
  title: z.string().min(5).max(150).optional(),
  description: z.string().min(20).optional(),
  categoryIds: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  regionIds: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  impact_level: z.number().int().min(1).max(10).optional(),
  impactLevel: z.number().int().min(1).max(10).optional(),
  source_url: z.string().url().or(z.literal('')).optional(),
  sourceUrl: z.string().url().or(z.literal('')).optional(),
});

export const SolutionSuggestionSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    })
  ).min(1),
  needed_skills: z.array(z.string()).min(1),
});

export const UserMatchSchema = z.object({
  matchScore: z.number().min(0).max(100),
  reason: z.string().min(1),
});

export const ProblemCategorizationSchema = z.object({
  categories: z.array(z.string()).min(1),
  tags: z.array(z.string()).min(1),
});
