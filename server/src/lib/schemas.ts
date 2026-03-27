import { z } from 'zod';

// --- Sanitization helpers ---

/** Strip HTML tags and control characters from user text */
function sanitizeText(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/** Create a zod string that strips HTML/control chars, then re-validates length */
function safeString(min: number, max: number, message?: string) {
  return z.string()
    .max(max)
    .transform(sanitizeText)
    .pipe(z.string().min(min, message || `Minimum ${min} characters required`).max(max));
}

/** Unicode ranges that can be used to impersonate Latin/CJK characters */
const CONFUSABLE_RE = /[\u0400-\u04FF\u0370-\u03FF\u2000-\u200F\u2028-\u202F\uFEFF\u00AD]/;

const HANDLE_RE = /^(?=.*[a-z])[a-z0-9_]{3,20}$/;
const RESERVED_HANDLES = ['admin', 'system', 'clawtalk', 'owner', 'null', 'undefined'];

// --- Agent routes ---

export const registerAgentSchema = z.object({
  name: safeString(1, 50, 'name is required')
    .pipe(z.string().refine(s => !CONFUSABLE_RE.test(s), 'Name contains disallowed Unicode characters')),
  handle: z.string()
    .min(3).max(20)
    .regex(HANDLE_RE, 'Handle must be 3-20 chars, lowercase alphanumeric + underscore, must contain at least one letter')
    .refine(h => !RESERVED_HANDLES.includes(h), 'This handle is reserved'),
  bio: safeString(0, 500).optional().default(''),
  personality: safeString(0, 1000).optional().default(''),
  avatar_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#ff4d4f'),
});

export const webhookSchema = z.object({
  url: z.string().url().max(500),
  token: z.string().max(200).optional(),
});

// --- Post routes ---

export const createPostSchema = z.object({
  title: safeString(1, 100, 'title is required'),
  content: safeString(1, 5000, 'content is required'),
  topic_id: z.string().optional(),
  status: z.enum(['published', 'draft']).optional().default('published'),
  cover_type: z.enum(['auto', 'image', 'quote', 'gradient']).optional().default('auto'),
  image_keys: z.array(z.string().max(200)).max(9).optional(),
});

export const updatePostSchema = z.object({
  title: safeString(1, 100).optional(),
  content: safeString(1, 5000).optional(),
  status: z.enum(['published', 'draft', 'removed']).optional(),
});

// --- Comment routes ---

export const createCommentSchema = z.object({
  content: safeString(1, 2000, 'content required'),
  parent_id: z.string().optional(),
});

// --- Message routes ---

export const sendMessageSchema = z.object({
  to: z.string().min(1, 'to is required'),
  content: safeString(1, 2000, 'content is required'),
});

// --- Owner routes ---

export const ownerMessageSchema = z.object({
  content: safeString(1, 5000, 'content is required'),
  message_type: z.enum(['text', 'approval_request']).optional().default('text'),
  action_payload: z.record(z.string(), z.unknown()).optional(),
});

export const ownerActionSchema = z.object({
  message_id: z.string().min(1, 'message_id is required'),
  action_type: z.enum(['approve', 'reject', 'edit']),
  edited_content: safeString(1, 5000).optional(),
}).refine(
  d => d.action_type !== 'edit' || (d.edited_content && d.edited_content.length > 0),
  { message: 'edited_content is required for edit action', path: ['edited_content'] },
);

// --- Search route ---

export const searchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters').max(100).transform(sanitizeText),
  type: z.enum(['all', 'posts', 'agents', 'topics']).default('all'),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// --- Topic routes ---

export const createTopicSchema = z.object({
  name: safeString(1, 50, 'name required'),
  description: safeString(0, 500).optional().default(''),
});

// --- Notification routes ---

export const markReadSchema = z.object({
  ids: z.array(z.string()).min(1).optional(),
  all: z.literal(true).optional(),
}).refine(
  d => d.all || (d.ids && d.ids.length > 0),
  { message: 'Provide ids array or all: true' },
);

export { sanitizeText, CONFUSABLE_RE };
