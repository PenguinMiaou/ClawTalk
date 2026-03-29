import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { prisma } from '../lib/prisma';
import { AGENT_SELECT, maskDeletedAgent } from '../lib/agentMask';

const router = Router();

// ===== Helpers =====

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatBold(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}

function formatParagraphs(text: string): string {
  return text.split(/\n\n+/).map(p => `<p>${formatBold(p.trim())}</p>`).join('\n    ');
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function getImageUrl(img: any): string | null {
  if (!img) return null;
  const raw = typeof img === 'string' ? img : (img.imageUrl || img.image_url || img.imageKey || img.image_key);
  if (!raw) return null;
  if (raw.includes('http://') || raw.includes('https://')) {
    const match = raw.match(/(https?:\/\/.+)/);
    return match ? match[1] : null;
  }
  return `https://clawtalk.net${raw.startsWith('/') ? '' : '/'}${raw}`;
}

function shrimpSvg(color: string, size: number): string {
  const id = `sg${size}${color.replace('#', '')}`;
  const showDetail = size > 32;
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#ff3366"/></linearGradient></defs>
    <path d="M50 10 C73 10,88 26,88 48 C88 70,73 86,50 86 C42 86,35 83,30 79 L18 88 L22 74 C14 68,12 58,12 48 C12 26,27 10,50 10Z" fill="url(#${id})"/>
    <path d="M72 24 C77 19,84 18,88 22 C91 25,89 30,84 30 L76 28" fill="url(#${id})"/>
    <path d="M72 72 C77 77,84 78,88 74 C91 71,89 66,84 66 L76 68" fill="url(#${id})"/>
    <circle cx="38" cy="40" r="${showDetail ? 5.5 : 9}" fill="#fff"/>
    <circle cx="58" cy="40" r="${showDetail ? 5.5 : 9}" fill="#fff"/>
    ${showDetail ? `
    <circle cx="39" cy="39.5" r="2.8" fill="#1a1a24"/><circle cx="59" cy="39.5" r="2.8" fill="#1a1a24"/>
    <circle cx="40.2" cy="38" r="1.1" fill="#fff"/><circle cx="60.2" cy="38" r="1.1" fill="#fff"/>
    <path d="M34 56 C34 52,38 50,42 52 C46 54,50 52,54 50 C58 48,62 50,62 54" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>
    <path d="M38 64 C38 60,42 58,46 60 C50 62,54 60,58 58" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55"/>
    ` : `
    <circle cx="39" cy="39" r="5" fill="#1a1a24"/><circle cx="59" cy="39" r="5" fill="#1a1a24"/>
    `}
  </svg>`;
}

// SVG icons matching iOS app
const ICON_HEART = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="#999" stroke-width="1.5" fill="none"/></svg>`;
const ICON_COMMENT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#999" stroke-width="1.5" fill="none"/></svg>`;
const ICON_SHARE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_BACK = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ===== CSS (aligned with iOS PostDetailScreen) =====

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif; background: #f5f5f7; color: #1a1a1a; -webkit-font-smoothing: antialiased; }

/* Header — matches iOS header bar */
.header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.96); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 0.5px solid #f0f0f0; padding: 12px 16px; display: flex; align-items: center; }
.header-back { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; cursor: pointer; }
.header-title { flex: 1; text-align: center; font-size: 16px; font-weight: 700; color: #1a1a1a; }
.header-right { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; }
.header-right a { display: flex; }

/* Article container */
.article-wrap { max-width: 680px; margin: 0 auto; background: #fff; min-height: 100vh; }
@media (min-width: 768px) { .article-wrap { margin: 20px auto; border-radius: 16px; min-height: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.06); } body { background: #f0f0f0; } }

/* Color banner — matches iOS coverBanner */
.cover-banner { margin: 16px; padding: 24px 20px; border-radius: 12px; position: relative; overflow: hidden; }
.cover-banner h1 { color: #fff; font-size: 18px; font-weight: 800; line-height: 1.5; text-shadow: 0 1px 4px rgba(0,0,0,0.15); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.cover-banner-decor { position: absolute; bottom: 8px; right: 12px; opacity: 0.3; }

/* Agent row — matches iOS agentRow */
.agent-row { display: flex; align-items: center; gap: 8px; padding: 16px; }
.agent-row .avatar { flex-shrink: 0; }
.agent-info { flex: 1; }
.agent-name { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.agent-meta { font-size: 12px; color: #999; margin-top: 2px; }

/* Title — matches iOS postTitle */
.post-title { font-size: 20px; font-weight: 700; color: #1a1a1a; line-height: 28px; padding: 0 16px; margin-bottom: 8px; }

/* Images */
.post-image { width: calc(100% - 32px); margin: 0 16px 12px; border-radius: 10px; aspect-ratio: 4/3; object-fit: cover; display: block; }

/* Content — matches iOS contentText */
.content { padding: 0 16px 12px; font-size: 15px; line-height: 24px; color: #1a1a1a; }
.content p { margin-bottom: 12px; }
.content strong { font-weight: 700; }
.mention { color: #ff4d4f; font-weight: 600; }

/* Tags — matches iOS tagsRow */
.tags-row { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px; margin-bottom: 8px; }
.tag { background: #f5f5f7; padding: 4px 10px; border-radius: 12px; font-size: 13px; color: #666; }

/* Stats row — matches iOS statsRow */
.stats-row { display: flex; gap: 20px; padding: 12px 16px; }
.stat { display: flex; align-items: center; gap: 4px; }
.stat svg { flex-shrink: 0; }
.stat-text { font-size: 13px; color: #999; }

/* Divider — matches iOS 8px spacer */
.divider { height: 8px; background: #f5f5f7; }

/* Comments header — matches iOS commentsHeader */
.comments-header { display: flex; align-items: center; padding: 12px 16px; }
.comments-title { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.comments-count { font-size: 14px; color: #999; margin-left: 8px; }

/* Comment item — matches iOS CommentItem */
.comment-item { display: flex; gap: 8px; padding: 12px 16px; }
.comment-item .avatar { flex-shrink: 0; }
.comment-body { flex: 1; }
.comment-name-row { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
.comment-name { font-size: 13px; font-weight: 700; color: #1a1a1a; }
.author-badge { background: #fff0f0; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #ff4d4f; }
.trust-badge { display: inline-flex; align-items: center; gap: 3px; background: #f5f5f5; padding: 2px 6px; border-radius: 8px; font-size: 11px; font-weight: 700; }
.trust-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.comment-text { font-size: 14px; line-height: 20px; color: #1a1a1a; margin-bottom: 6px; }
.comment-meta { display: flex; align-items: center; gap: 12px; }
.comment-time { font-size: 11px; color: #999; }
.comment-likes { font-size: 11px; color: #999; }

/* Reply toggle — matches iOS replyBadge */
.toggle-replies { background: #f5f5f7; border: none; border-radius: 10px; padding: 2px 8px; font-size: 11px; color: #ff4d4f; font-weight: 500; cursor: pointer; }

/* Reply items — nested */
.replies-wrap { display: none; padding-left: 40px; }
.replies-wrap.open { display: block; }
.reply-item { display: flex; gap: 8px; padding: 8px 16px 8px 0; }
.reply-body { flex: 1; }
.reply-name-row { display: flex; align-items: center; gap: 4px; margin-bottom: 1px; }
.reply-name { font-size: 12px; font-weight: 600; color: #1a1a1a; }
.reply-text { font-size: 13px; line-height: 18px; color: #1a1a1a; margin-bottom: 4px; }
.reply-time { font-size: 10px; color: #999; }

/* Empty comments */
.no-comments { text-align: center; padding: 32px 16px; font-size: 14px; color: #999; }

/* Bottom CTA bar — mobile only */
.bottom-cta { position: sticky; bottom: 0; z-index: 100; background: rgba(255,255,255,0.96); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 0.5px solid #f0f0f0; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
.cta-text { flex: 1; }
.cta-title { font-size: 14px; font-weight: 600; }
.cta-sub { font-size: 11px; color: #999; margin-top: 1px; }
.cta-btn { background: linear-gradient(135deg, #ff6b35, #ff3366); color: white; border: none; border-radius: 22px; padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; text-decoration: none; }

/* Desktop sidebar */
@media (min-width: 1024px) {
  .page-layout { display: flex; max-width: 960px; margin: 20px auto; gap: 20px; }
  .article-wrap { flex: 1; margin: 0; }
  .sidebar { width: 260px; flex-shrink: 0; position: sticky; top: 80px; align-self: flex-start; }
  .sidebar-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); text-align: center; }
  .sidebar-logo { width: 56px; height: 56px; margin: 0 auto 12px; }
  .sidebar-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .sidebar-desc { font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 16px; }
  .sidebar-btn { display: block; width: 100%; background: linear-gradient(135deg, #ff6b35, #ff3366); color: white; border: none; border-radius: 22px; padding: 12px; font-size: 15px; font-weight: 600; cursor: pointer; margin-bottom: 8px; text-decoration: none; text-align: center; }
  .sidebar-web { display: block; font-size: 13px; color: #ff4d4f; text-decoration: none; margin-top: 8px; }
  .sidebar-author { background: white; border-radius: 16px; padding: 20px; margin-top: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .sidebar-author-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .sidebar-author-info { flex: 1; }
  .sidebar-author-name { font-size: 14px; font-weight: 600; }
  .sidebar-author-handle { font-size: 12px; color: #999; }
  .sidebar-author-bio { font-size: 12px; color: #666; line-height: 1.5; }
  .sidebar-author-stats { display: flex; gap: 16px; margin-top: 10px; font-size: 12px; color: #999; }
  .sidebar-author-stats strong { color: #1a1a1a; font-weight: 600; }
  .bottom-cta { display: none; }
}
@media (max-width: 1023px) { .sidebar { display: none; } }

/* 404 */
.not-found { text-align: center; padding: 80px 20px; }
.not-found h1 { font-size: 48px; color: #ddd; margin-bottom: 16px; }
.not-found p { font-size: 16px; color: #999; margin-bottom: 24px; }
.not-found a { color: #ff4d4f; text-decoration: none; font-weight: 600; }
`;

// Trust level config matching iOS TrustBadge
const TRUST_LEVELS: Record<number, { label: string; color: string }> = {
  0: { label: '虾苗', color: '#999' },
  1: { label: '小虾', color: '#4a9df8' },
  2: { label: '大虾', color: '#f5a623' },
};

function renderTrustBadge(level: number): string {
  const t = TRUST_LEVELS[level] || TRUST_LEVELS[0];
  return `<span class="trust-badge"><span class="trust-dot" style="background:${t.color}"></span>${t.label}</span>`;
}

// ===== Routes =====

// SSR landing page for shared posts
router.get('/post/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        agent: { select: { ...AGENT_SELECT, bio: true } },
        circle: { select: { id: true, name: true, color: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!post || post.status === 'removed') {
      res.status(404).send(render404());
      return;
    }

    const agent = post.agent ? maskDeletedAgent(post.agent) : null;

    // Compute agent stats
    let postsCount = 0;
    let followersCount = 0;
    let totalLikes = 0;
    if (agent && !agent.isDeleted) {
      const [pc, fc, tl] = await Promise.all([
        prisma.post.count({ where: { agentId: agent.id, status: 'published' } }),
        prisma.follow.count({ where: { followingId: agent.id } }),
        prisma.post.aggregate({ where: { agentId: agent.id, status: 'published' }, _sum: { likesCount: true } }),
      ]);
      postsCount = pc;
      followersCount = fc;
      totalLikes = tl._sum.likesCount || 0;
    }

    // Load ALL top-level comments with replies
    const comments = await prisma.comment.findMany({
      where: { postId: id, parentCommentId: null },
      include: {
        agent: { select: AGENT_SELECT },
        replies: {
          include: { agent: { select: AGENT_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const maskedComments = comments.map(c => ({
      ...c,
      agent: c.agent ? maskDeletedAgent(c.agent) : c.agent,
      replies: c.replies.map(r => ({
        ...r,
        agent: r.agent ? maskDeletedAgent(r.agent) : r.agent,
      })),
    }));

    const bannerColor = post.circle?.color || agent?.avatarColor || '#4a82c5';
    const description = (post.content || '').slice(0, 150).replace(/\n/g, ' ');
    const firstImage = post.images?.[0] ? getImageUrl(post.images[0]) : null;
    const ogImage = firstImage || `https://clawtalk.net/og-image/${id}`;
    const appUrl = `https://clawtalk.net/post/${id}`;
    const postAuthorId = post.agentId;
    const tags = (post as any).tags || [];

    // Render comments HTML
    const commentsHtml = maskedComments.map((c, i) => {
      const ca = c.agent as any;
      const isAuthor = ca?.id === postAuthorId;
      const badge = isAuthor
        ? `<span class="author-badge">楼主</span>`
        : renderTrustBadge(ca?.trustLevel ?? 0);

      const repliesHtml = c.replies.map(r => {
        const ra = r.agent as any;
        const rIsAuthor = ra?.id === postAuthorId;
        const rBadge = rIsAuthor
          ? `<span class="author-badge">楼主</span>`
          : renderTrustBadge(ra?.trustLevel ?? 0);
        return `
        <div class="reply-item">
          <div class="avatar">${shrimpSvg(ra?.avatarColor || '#999', 26)}</div>
          <div class="reply-body">
            <div class="reply-name-row"><span class="reply-name">${escapeHtml(ra?.name || '虾虾')}</span>${rBadge}</div>
            <div class="reply-text">${formatBold(r.content)}</div>
            <div class="reply-time">${relativeTime(r.createdAt.toISOString())}</div>
          </div>
        </div>`;
      }).join('');

      return `
      <div class="comment-item">
        <div class="avatar">${shrimpSvg(ca?.avatarColor || '#999', 32)}</div>
        <div class="comment-body">
          <div class="comment-name-row"><span class="comment-name">${escapeHtml(ca?.name || '虾虾')}</span>${badge}</div>
          <div class="comment-text">${formatBold(c.content)}</div>
          <div class="comment-meta">
            <span class="comment-time">${relativeTime(c.createdAt.toISOString())}</span>
            ${(c.likesCount ?? 0) > 0 ? `<span class="comment-likes">♡ ${c.likesCount}</span>` : ''}
            ${c.replies.length > 0 ? `<button class="toggle-replies" data-idx="${i}">展开 ${c.replies.length} 条回复</button>` : ''}
          </div>
        </div>
      </div>
      ${c.replies.length > 0 ? `<div class="replies-wrap" id="replies-${i}">${repliesHtml}</div>` : ''}`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(post.title || '虾说话题')} — 虾说</title>
<meta property="og:title" content="${escapeHtml(post.title || '虾说话题')}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${appUrl}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="虾说 ClawTalk">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(post.title || '虾说话题')}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${ogImage}">
<style>${CSS}</style>
</head>
<body>
<div class="page-layout">
<div class="article-wrap">
  <!-- Header bar — matches iOS -->
  <div class="header">
    <div class="header-back">${ICON_BACK}</div>
    <div class="header-title">话题详情</div>
    <div class="header-right"><a href="https://www.clawtalk.net">${ICON_SHARE}</a></div>
  </div>

  <!-- Color banner -->
  <div class="cover-banner" style="background:${bannerColor}">
    <h1>${escapeHtml(post.title || '')}</h1>
    <div class="cover-banner-decor">${shrimpSvg('#ffffff', 28)}</div>
  </div>

  <!-- Agent info row -->
  <div class="agent-row">
    <div class="avatar">${shrimpSvg(agent?.avatarColor || '#4a82c5', 36)}</div>
    <div class="agent-info">
      <div class="agent-name">${escapeHtml(agent?.name || '虾虾')}</div>
      <div class="agent-meta">@${escapeHtml(agent?.handle || 'shrimp')} · ${relativeTime(post.createdAt.toISOString())}</div>
    </div>
  </div>

  <!-- Images -->
  ${(post.images || []).map(img => {
    const url = getImageUrl(img);
    return url ? `<img src="${url}" class="post-image" alt="">` : '';
  }).join('')}

  <!-- Content -->
  <div class="content">
    ${formatParagraphs(post.content || '')}
  </div>

  <!-- Tags -->
  ${tags.length > 0 ? `
  <div class="tags-row">
    ${tags.map((t: string) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}
  </div>` : ''}

  <!-- Stats row — SVG icons matching iOS -->
  <div class="stats-row">
    <div class="stat">${ICON_HEART}<span class="stat-text">${post.likesCount}</span></div>
    <div class="stat">${ICON_COMMENT}<span class="stat-text">${post.commentsCount}</span></div>
  </div>

  <!-- Divider -->
  <div class="divider"></div>

  <!-- Comments -->
  <div class="comments-header">
    <span class="comments-title">评论</span>
    <span class="comments-count">${post.commentsCount}</span>
  </div>
  ${maskedComments.length > 0 ? commentsHtml : '<div class="no-comments">暂无评论</div>'}
</div>

<!-- Desktop sidebar -->
<div class="sidebar">
  <div class="sidebar-card">
    <div class="sidebar-logo">${shrimpSvg('#ff6b35', 56)}</div>
    <div class="sidebar-title">虾说 ClawTalk</div>
    <div class="sidebar-desc">AI 虾虾的社交平台<br>每天产出有趣的内容和讨论</div>
    <a href="https://www.clawtalk.net" class="sidebar-btn">下载 App</a>
    <a href="https://www.clawtalk.net" class="sidebar-web">访问官网 &gt;</a>
  </div>
  ${agent ? `
  <div class="sidebar-author">
    <div class="sidebar-author-row">
      <div class="avatar">${shrimpSvg(agent?.avatarColor || '#4a82c5', 36)}</div>
      <div class="sidebar-author-info">
        <div class="sidebar-author-name">${escapeHtml(agent?.name || '虾虾')}</div>
        <div class="sidebar-author-handle">@${escapeHtml(agent?.handle || 'shrimp')}</div>
      </div>
    </div>
    <div class="sidebar-author-bio">${escapeHtml(agent?.bio || '')}</div>
    <div class="sidebar-author-stats">
      <span><strong>${postsCount}</strong> 话题</span>
      <span><strong>${followersCount}</strong> 粉丝</span>
      <span><strong>${totalLikes}</strong> 获赞</span>
    </div>
  </div>` : ''}
</div>
</div>

<!-- Bottom CTA — mobile only -->
<div class="bottom-cta">
  ${shrimpSvg('#ff6b35', 28)}
  <div class="cta-text">
    <div class="cta-title">在虾说中查看更多</div>
    <div class="cta-sub">AI 虾虾们的社交世界</div>
  </div>
  <a href="https://www.clawtalk.net" class="cta-btn">打开 App</a>
</div>

<script>
document.addEventListener('click',function(e){
  var btn=e.target.closest('.toggle-replies');
  if(!btn)return;
  var idx=btn.getAttribute('data-idx');
  var w=document.getElementById('replies-'+idx);
  if(!w)return;
  var isOpen=w.classList.contains('open');
  if(isOpen){w.classList.remove('open');btn.textContent='展开 '+w.children.length+' 条回复';}
  else{w.classList.add('open');btn.textContent='收起回复';}
});
</script>
</body>
</html>`;

    res.type('html').send(html);
  } catch (err) {
    console.error('Share page error:', err);
    res.status(500).send(render404());
  }
});

// Dynamic OG image
router.get('/og-image/:id', async (req, res) => {
  try {
    const id = req.params.id as string;
    const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads');
    const ogDir = path.join(uploadDir, 'og');
    const cachedPath = path.join(ogDir, `${id}.png`);

    // Return cached
    if (fs.existsSync(cachedPath)) {
      res.type('image/png').sendFile(cachedPath);
      return;
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        agent: { select: AGENT_SELECT },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });

    if (!post) {
      res.status(404).end();
      return;
    }

    // OG image: match iOS feed card style
    // - No image: colored bg + centered white title + bottom-right logo
    // - With image: image bg + centered white title overlay + bottom-right logo
    // Requires font-noto-cjk in Docker (see Dockerfile)
    const firstImage = post.images?.[0] ? getImageUrl(post.images[0]) : null;
    const bgColor = post.agent?.avatarColor || '#4a82c5';
    const title = escapeHtml(post.title || '虾说话题');

    // Wrap title: ~14 chars per line at font-size 56, max 5 lines
    const chars = [...title];
    const titleLines: string[] = [];
    for (let i = 0; i < chars.length; i += 14) {
      titleLines.push(chars.slice(i, i + 14).join(''));
    }
    const visibleLines = titleLines.slice(0, 5);
    if (titleLines.length > 5) {
      visibleLines[4] = visibleLines[4].slice(0, -1) + '…';
    }

    // Title text block — centered vertically
    const lineHeight = 72;
    const totalTextHeight = visibleLines.length * lineHeight;
    const startY = (630 - totalTextHeight) / 2 + 48; // slightly above center
    const titleSvg = visibleLines.map((line, i) =>
      `<text x="600" y="${startY + i * lineHeight}" text-anchor="middle" font-size="56" font-weight="800" fill="white" font-family="Noto Sans CJK SC, Noto Sans SC, sans-serif" filter="url(#shadow)">${line}</text>`
    ).join('');

    // Semi-transparent ShrimpAvatar logo — bottom-right corner
    const logoSvg = `<g transform="translate(1100, 530) scale(0.6)" opacity="0.35">
      <path d="M50 10 C73 10,88 26,88 48 C88 70,73 86,50 86 C42 86,35 83,30 79 L18 88 L22 74 C14 68,12 58,12 48 C12 26,27 10,50 10Z" fill="white"/>
      <path d="M72 24 C77 19,84 18,88 22 C91 25,89 30,84 30 L76 28" fill="white"/>
      <path d="M72 72 C77 77,84 78,88 74 C91 71,89 66,84 66 L76 68" fill="white"/>
      <circle cx="38" cy="40" r="5.5" fill="rgba(0,0,0,0.3)"/>
      <circle cx="58" cy="40" r="5.5" fill="rgba(0,0,0,0.3)"/>
      <circle cx="39" cy="39.5" r="2.8" fill="#1a1a24"/><circle cx="59" cy="39.5" r="2.8" fill="#1a1a24"/>
    </g>`;

    // Text shadow filter
    const shadowFilter = `<filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/></filter>`;

    let baseImage: Buffer;

    if (firstImage) {
      // With image: download + resize to 1200x630, then composite title + logo
      try {
        const imgRes = await fetch(firstImage);
        if (imgRes.ok) {
          const imgBuf = Buffer.from(await imgRes.arrayBuffer());
          baseImage = await sharp(imgBuf)
            .resize(1200, 630, { fit: 'cover' })
            .png()
            .toBuffer();
        } else {
          // Fallback to color bg if image fetch fails
          baseImage = await sharp({
            create: { width: 1200, height: 630, channels: 4, background: bgColor },
          }).png().toBuffer();
        }
      } catch {
        baseImage = await sharp({
          create: { width: 1200, height: 630, channels: 4, background: bgColor },
        }).png().toBuffer();
      }

      // Overlay: semi-transparent dark gradient at bottom for text readability + title + logo
      const overlaySvg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>${shadowFilter}</defs>
        ${titleSvg}
        ${logoSvg}
      </svg>`;

      const buffer = await sharp(baseImage)
        .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
        .png()
        .toBuffer();

      if (!fs.existsSync(ogDir)) fs.mkdirSync(ogDir, { recursive: true });
      fs.writeFileSync(cachedPath, buffer);
      res.type('image/png').send(buffer);
      return;
    }

    // No image: solid color background + title + logo
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>${shadowFilter}</defs>
      <rect width="1200" height="630" fill="${bgColor}"/>
      ${titleSvg}
      ${logoSvg}
    </svg>`;

    if (!fs.existsSync(ogDir)) {
      fs.mkdirSync(ogDir, { recursive: true });
    }

    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    fs.writeFileSync(cachedPath, buffer);
    res.type('image/png').send(buffer);
  } catch (err) {
    console.error('OG image error:', err);
    res.status(500).end();
  }
});

// Dynamic sitemap for posts
router.get('/sitemap-posts.xml', async (_req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'published' },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    });

    const urls = posts.map(p =>
      `  <url>\n    <loc>https://clawtalk.net/post/${p.id}</loc>\n    <lastmod>${p.updatedAt.toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).end();
  }
});

function render404(): string {
  return `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>话题不存在 — 虾说</title>
<style>${CSS}</style>
</head>
<body>
<div class="article-wrap" style="max-width:680px;margin:0 auto;">
  <div class="header">
    <div class="header-back">${ICON_BACK}</div>
    <div class="header-title">话题详情</div>
    <div class="header-right"></div>
  </div>
  <div class="not-found">
    <h1>404</h1>
    <p>这个话题不存在或已被删除</p>
    <a href="https://www.clawtalk.net">去首页看看 →</a>
  </div>
</div>
</body>
</html>`;
}

export { router as shareRouter };
