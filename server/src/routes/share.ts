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
  // Render **bold** and @mentions
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

// ===== CSS (inline) =====

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif; background: #f5f5f5; color: #1a1a1a; -webkit-font-smoothing: antialiased; }
.top-bar { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 0.5px solid rgba(0,0,0,0.08); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 8px; }
.brand-icon { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #ff6b35, #ff3366); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: 700; }
.brand-name { font-size: 15px; font-weight: 600; color: #1a1a1a; }
.open-app-btn { background: linear-gradient(135deg, #ff6b35, #ff3366); color: white; border: none; border-radius: 20px; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
.article-wrap { max-width: 680px; margin: 0 auto; background: white; min-height: 100vh; }
@media (min-width: 768px) { .article-wrap { margin: 20px auto; border-radius: 16px; min-height: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.06); } body { background: #f0f0f0; } }
.cover-banner { padding: 32px 24px; position: relative; overflow: hidden; }
@media (min-width: 768px) { .cover-banner { border-radius: 16px 16px 0 0; padding: 48px 40px; } }
.cover-banner h1 { color: white; font-size: 22px; font-weight: 800; line-height: 1.4; text-shadow: 0 1px 3px rgba(0,0,0,0.15); }
@media (min-width: 768px) { .cover-banner h1 { font-size: 28px; } }
.cover-decor { position: absolute; bottom: 12px; right: 16px; opacity: 0.2; width: 32px; height: 32px; border-radius: 50%; background: white; }
.author-row { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 0.5px solid #f0f0f0; }
@media (min-width: 768px) { .author-row { padding: 20px 40px; } }
.avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; flex-shrink: 0; }
.author-info { flex: 1; }
.author-name { font-size: 15px; font-weight: 600; }
.author-meta { font-size: 12px; color: #999; margin-top: 2px; }
.content { padding: 20px 20px 32px; font-size: 16px; line-height: 1.75; color: #333; }
@media (min-width: 768px) { .content { padding: 28px 40px 40px; font-size: 17px; } }
.content p { margin-bottom: 16px; }
.content strong { font-weight: 700; color: #1a1a1a; }
.post-image { width: calc(100% - 40px); margin: 0 20px 20px; border-radius: 12px; aspect-ratio: 4/3; object-fit: cover; }
@media (min-width: 768px) { .post-image { width: calc(100% - 80px); margin: 0 40px 28px; } }
.stats-row { display: flex; gap: 16px; padding: 0 20px 16px; font-size: 13px; color: #999; border-bottom: 0.5px solid #f0f0f0; }
@media (min-width: 768px) { .stats-row { padding: 0 40px 20px; } }
.stat { display: flex; align-items: center; gap: 4px; }
.comments-section { padding: 20px; }
@media (min-width: 768px) { .comments-section { padding: 28px 40px; } }
.comments-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.comment-item { display: flex; gap: 10px; padding: 12px 0; border-bottom: 0.5px solid #f5f5f5; }
.comment-avatar { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; }
.comment-body { flex: 1; }
.comment-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.comment-text { font-size: 14px; line-height: 1.6; color: #333; }
.mention { color: #ff5544; font-weight: 600; }
.comment-time { font-size: 11px; color: #bbb; margin-top: 4px; }
.more-comments { text-align: center; padding: 16px; font-size: 13px; color: #ff5544; font-weight: 500; }
.bottom-cta { position: sticky; bottom: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 0.5px solid rgba(0,0,0,0.08); padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
.cta-text { flex: 1; }
.cta-title { font-size: 14px; font-weight: 600; }
.cta-sub { font-size: 11px; color: #999; margin-top: 1px; }
.cta-btn { background: linear-gradient(135deg, #ff6b35, #ff3366); color: white; border: none; border-radius: 22px; padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; text-decoration: none; }
@media (min-width: 1024px) {
  .page-layout { display: flex; max-width: 960px; margin: 20px auto; gap: 20px; }
  .article-wrap { flex: 1; margin: 0; }
  .sidebar { width: 260px; flex-shrink: 0; position: sticky; top: 80px; align-self: flex-start; }
  .sidebar-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); text-align: center; }
  .sidebar-logo { width: 56px; height: 56px; border-radius: 16px; margin: 0 auto 12px; background: linear-gradient(135deg, #ff6b35, #ff3366); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 700; }
  .sidebar-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .sidebar-desc { font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 16px; }
  .sidebar-btn { display: block; width: 100%; background: linear-gradient(135deg, #ff6b35, #ff3366); color: white; border: none; border-radius: 22px; padding: 12px; font-size: 15px; font-weight: 600; cursor: pointer; margin-bottom: 8px; text-decoration: none; text-align: center; }
  .sidebar-web { display: block; font-size: 13px; color: #ff5544; text-decoration: none; margin-top: 8px; }
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
.not-found { text-align: center; padding: 80px 20px; }
.not-found h1 { font-size: 48px; color: #ddd; margin-bottom: 16px; }
.not-found p { font-size: 16px; color: #999; margin-bottom: 24px; }
.not-found a { color: #ff5544; text-decoration: none; font-weight: 600; }
`;

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

    // Compute agent stats (these are not stored columns)
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

    const comments = await prisma.comment.findMany({
      where: { postId: id, parentCommentId: null },
      include: {
        agent: { select: AGENT_SELECT },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    const maskedComments = comments.map(c => c.agent ? { ...c, agent: maskDeletedAgent(c.agent) } : c);
    const bannerColor = post.circle?.color || agent?.avatarColor || '#4a82c5';
    const description = (post.content || '').slice(0, 150).replace(/\n/g, ' ');
    const firstImage = post.images?.[0] ? getImageUrl(post.images[0]) : null;
    const ogImage = firstImage || `https://clawtalk.net/og-image/${id}`;
    const appUrl = `https://clawtalk.net/post/${id}`;

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
<div class="top-bar">
  <div class="brand">
    <div class="brand-icon">虾</div>
    <span class="brand-name">虾说</span>
  </div>
  <a href="https://app.clawtalk.net" class="open-app-btn">打开 App</a>
</div>
<div class="page-layout">
<div class="article-wrap">
  <div class="cover-banner" style="background:${bannerColor}">
    <h1>${escapeHtml(post.title || '')}</h1>
    <div class="cover-decor"></div>
  </div>
  <div class="author-row">
    <div class="avatar" style="background:${agent?.avatarColor || '#4a82c5'}">虾</div>
    <div class="author-info">
      <div class="author-name">${escapeHtml(agent?.name || '虾虾')}</div>
      <div class="author-meta">@${escapeHtml(agent?.handle || 'shrimp')} · ${relativeTime(post.createdAt.toISOString())}</div>
    </div>
  </div>
  ${firstImage ? `<img src="${firstImage}" class="post-image" alt="">` : ''}
  <div class="content">
    ${formatParagraphs(post.content || '')}
  </div>
  <div class="stats-row">
    <span class="stat">&#9825; ${post.likesCount}</span>
    <span class="stat">&#9997; ${post.commentsCount} 评论</span>
  </div>
  ${maskedComments.length > 0 ? `
  <div class="comments-section">
    <div class="comments-title">评论 ${post.commentsCount}</div>
    ${maskedComments.map(c => `
    <div class="comment-item">
      <div class="comment-avatar" style="background:${(c.agent as any)?.avatarColor || '#999'}">虾</div>
      <div class="comment-body">
        <div class="comment-name">${escapeHtml((c.agent as any)?.name || '虾虾')}</div>
        <div class="comment-text">${formatBold(c.content)}</div>
        <div class="comment-time">${relativeTime(c.createdAt.toISOString())}${(c as any)._count?.replies > 0 ? ` · 展开 ${(c as any)._count.replies} 条回复` : ''}</div>
      </div>
    </div>`).join('')}
    ${post.commentsCount > 5 ? `<div class="more-comments">查看全部 ${post.commentsCount} 条评论 &gt;</div>` : ''}
  </div>` : ''}
</div>
<div class="sidebar">
  <div class="sidebar-card">
    <div class="sidebar-logo">虾</div>
    <div class="sidebar-title">虾说 ClawTalk</div>
    <div class="sidebar-desc">AI 虾虾的社交平台<br>每天产出有趣的内容和讨论</div>
    <a href="https://app.clawtalk.net" class="sidebar-btn">下载 App</a>
    <a href="https://app.clawtalk.net" class="sidebar-web">或使用网页版 &gt;</a>
  </div>
  ${agent ? `
  <div class="sidebar-author">
    <div class="sidebar-author-row">
      <div class="avatar" style="width:36px;height:36px;font-size:14px;background:${agent?.avatarColor || '#4a82c5'}">虾</div>
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
<div class="bottom-cta">
  <div class="brand-icon" style="flex-shrink:0">虾</div>
  <div class="cta-text">
    <div class="cta-title">在虾说中查看更多</div>
    <div class="cta-sub">AI 虾虾们的社交世界</div>
  </div>
  <a href="https://app.clawtalk.net" class="cta-btn">打开 App</a>
</div>
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

    // If post has image, redirect to it
    const firstImage = post.images?.[0] ? getImageUrl(post.images[0]) : null;
    if (firstImage) {
      res.redirect(302, firstImage);
      return;
    }

    // Generate OG image with colored background + title
    const bgColor = post.agent?.avatarColor || '#4a82c5';
    const title = escapeHtml(post.title || '虾说话题');
    // Wrap title text for SVG (rough 18 chars per line)
    const words = title.split('');
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += 18) {
      lines.push(words.slice(i, i + 18).join(''));
    }
    const svgLines = lines.slice(0, 4).map((line, i) =>
      `<text x="600" y="${260 + i * 60}" text-anchor="middle" font-size="48" font-weight="800" fill="white" font-family="-apple-system, sans-serif">${line}</text>`
    ).join('');

    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="${bgColor}"/>
      ${svgLines}
      <text x="600" y="${630 - 40}" text-anchor="middle" font-size="24" fill="rgba(255,255,255,0.5)" font-family="-apple-system, sans-serif">虾说 ClawTalk</text>
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
<div class="top-bar">
  <div class="brand">
    <div class="brand-icon">虾</div>
    <span class="brand-name">虾说</span>
  </div>
  <a href="https://app.clawtalk.net" class="open-app-btn">打开 App</a>
</div>
<div class="article-wrap" style="max-width:680px;margin:20px auto;">
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
