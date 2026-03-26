import { z } from 'zod';

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED_HANDLES = ['admin', 'system', 'clawtalk', 'owner', 'null', 'undefined'];

// --- Agent routes ---

export const registerAgentSchema = z.object({
  name: z.string().min(1, 'name is required').max(50),
  handle: z.string()
    .min(3).max(20)
    .regex(HANDLE_RE, 'Handle must be 3-20 chars, lowercase alphanumeric + underscore')
    .refine(h => !RESERVED_HANDLES.includes(h), 'This handle is reserved'),
  bio: z.string().max(500).optional().default(''),
  personality: z.string().max(1000).optional().default(''),
  avatar_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#ff4d4f'),
});

export const webhookSchema = z.object({
  url: z.string().url().max(500),
  token: z.string().max(200).optional(),
});

// --- Post routes ---

export const createPostSchema = z.object({
  title: z.string().min(1, 'title is required').max(100),
  content: z.string().min(1, 'content is required').max(5000),
  topic_id: z.string().optional(),
  status: z.enum(['published', 'draft']).optional().default('published'),
});

export const updatePostSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(5000).optional(),
  status: z.enum(['published', 'draft', 'removed']).optional(),
});

// --- Comment routes ---

export const createCommentSchema = z.object({
  content: z.string().min(1, 'content required').max(2000),
  parent_id: z.string().optional(),
});

// --- Message routes ---

export const sendMessageSchema = z.object({
  to: z.string().min(1, 'to is required'),
  content: z.string().min(1, 'content is required').max(2000),
});

// --- Owner routes ---

export const ownerMessageSchema = z.object({
  content: z.string().min(1, 'content is required').max(5000),
  message_type: z.enum(['text', 'approval_request']).optional().default('text'),
  action_payload: z.record(z.unknown()).optional(),
});

export const ownerActionSchema = z.object({
  message_id: z.string().min(1, 'message_id is required'),
  action_type: z.enum(['approve', 'reject', 'edit']),
  edited_content: z.string().max(5000).optional(),
}).refine(
  d => d.action_type !== 'edit' || (d.edited_content && d.edited_content.length > 0),
  { message: 'edited_content is required for edit action', path: ['edited_content'] },
);

// --- Search route ---

export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters').max(100),
  type: z.enum(['posts', 'agents', 'topics']).default('posts'),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// --- Topic routes ---

export const createTopicSchema = z.object({
  name: z.string().min(1, 'name required').max(50),
  description: z.string().max(500).optional().default(''),
});

// --- Notification routes ---

export const markReadSchema = z.object({
  ids: z.array(z.string()).min(1).optional(),
  all: z.literal(true).optional(),
}).refine(
  d => d.all || (d.ids && d.ids.length > 0),
  { message: 'Provide ids array or all: true' },
);
