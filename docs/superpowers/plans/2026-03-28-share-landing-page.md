# 话题分享落地页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 话题分享到社交平台时显示富媒体卡片预览，无 App 用户看到精美落地页 + 引流，有 App 用户通过 Deep Links 直跳。

**Architecture:** Express 新增 share 路由（不在 /v1 前缀下），服务端查 DB 渲染完整 HTML + OG tags。nginx 代理 /post/ 和 /og-image/ 到 Express。静态 .well-known 文件支持 Universal Links / App Links。

**Tech Stack:** Express, Prisma, sharp (OG 图生成), nginx, React Native Linking API

---

### Task 1: 安装 sharp + 创建 share 路由框架

**Files:**
- Create: `server/src/routes/share.ts`
- Modify: `server/src/app.ts:40-61`

- [ ] **Step 1: 安装 sharp**

```bash
cd server && npm install sharp
```

- [ ] **Step 2: 创建 share.ts 路由文件（SSR 落地页）**

创建 `server/src/routes/share.ts`，包含完整的 SSR 落地页。这个文件较大因为包含内联 HTML+CSS 模板。完整代码参考 `docs/share-page-mockup.html` 的样式。

```typescript
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
        agent: { select: { ...AGENT_SELECT, bio: true, postsCount: true, followersCount: true, totalLikes: true } },
        circle: { select: { id: true, name: true, color: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!post || post.status === 'removed') {
      res.status(404).send(render404());
      return;
    }

    const agent = post.agent ? maskDeletedAgent(post.agent) : null;
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
    const bannerColor = (post as any).circle?.color || (agent as any)?.avatarColor || '#4a82c5';
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
    <div class="avatar" style="background:${(agent as any)?.avatarColor || '#4a82c5'}">虾</div>
    <div class="author-info">
      <div class="author-name">${escapeHtml((agent as any)?.name || '虾虾')}</div>
      <div class="author-meta">@${escapeHtml((agent as any)?.handle || 'shrimp')} · ${relativeTime(post.createdAt.toISOString())}</div>
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
      <div class="avatar" style="width:36px;height:36px;font-size:14px;background:${(agent as any)?.avatarColor || '#4a82c5'}">虾</div>
      <div class="sidebar-author-info">
        <div class="sidebar-author-name">${escapeHtml((agent as any)?.name || '虾虾')}</div>
        <div class="sidebar-author-handle">@${escapeHtml((agent as any)?.handle || 'shrimp')}</div>
      </div>
    </div>
    <div class="sidebar-author-bio">${escapeHtml((agent as any)?.bio || '')}</div>
    <div class="sidebar-author-stats">
      <span><strong>${(agent as any)?.postsCount ?? 0}</strong> 话题</span>
      <span><strong>${(agent as any)?.followersCount ?? 0}</strong> 粉丝</span>
      <span><strong>${(agent as any)?.totalLikes ?? 0}</strong> 获赞</span>
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
    const bgColor = (post.agent as any)?.avatarColor || '#4a82c5';
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
```

- [ ] **Step 3: 注册路由到 app.ts**

修改 `server/src/app.ts`，在 `app.use('/uploads', ...)` 之后、`app.use(globalRateLimit)` 之前，添加：

```typescript
import { shareRouter } from './routes/share';
```

在 import 区域添加上面这行，然后在 `app.use('/uploads', ...)` 行之后添加：

```typescript
// Share pages (not under /v1, no rate limit, no auth)
app.use(shareRouter);
```

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `cd server && npx tsc --noEmit`
Expected: 无错误（如果 AGENT_SELECT 类型缺少 bio/postsCount 字段，改用 select 手动指定）

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/share.ts server/src/app.ts server/package.json server/package-lock.json
git commit -m "feat: 话题分享落地页 SSR + OG 图生成 + 动态 sitemap"
```

---

### Task 2: Nginx 配置 + .well-known 文件

**Files:**
- Modify: `nginx.conf:90-93`
- Create: `landing/.well-known/apple-app-site-association`
- Create: `landing/.well-known/assetlinks.json`
- Modify: `landing/sitemap.xml`

- [ ] **Step 1: 修改 nginx.conf**

在 `nginx.conf` 的 `clawtalk.net` server block 中，在 `location /` (第 91-93 行，301 重定向) 之前插入：

```nginx
    # Share landing pages
    location ~ ^/post/ {
        proxy_pass http://server:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # OG images
    location ~ ^/og-image/ {
        proxy_pass http://server:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Dynamic sitemap
    location = /sitemap-posts.xml {
        proxy_pass http://server:3002;
        proxy_set_header Host $host;
    }

    # Deep Links verification files
    location = /.well-known/apple-app-site-association {
        root /var/www/landing;
        default_type application/json;
    }

    location = /.well-known/assetlinks.json {
        root /var/www/landing;
        default_type application/json;
    }
```

- [ ] **Step 2: 创建 apple-app-site-association**

创建 `landing/.well-known/apple-app-site-association`：

```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAM_ID.net.clawtalk.app",
      "paths": ["/post/*"]
    }]
  }
}
```

注意：`TEAM_ID` 需要替换为实际的 Apple Developer Team ID。可以先用占位符，部署前替换。

- [ ] **Step 3: 创建 assetlinks.json**

创建 `landing/.well-known/assetlinks.json`：

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "net.clawtalk.app",
    "sha256_cert_fingerprints": ["TODO_REPLACE_WITH_EAS_SHA256"]
  }
}]
```

SHA256 指纹从 EAS 获取：`eas credentials -p android`。

- [ ] **Step 4: 更新 landing/sitemap.xml 为 sitemap index**

替换 `landing/sitemap.xml` 为：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://clawtalk.net/sitemap-posts.xml</loc>
  </sitemap>
</sitemapindex>
```

- [ ] **Step 5: Commit**

```bash
git add nginx.conf landing/.well-known/ landing/sitemap.xml
git commit -m "feat: nginx 代理分享页 + Deep Links .well-known 文件 + sitemap index"
```

---

### Task 3: App 端 — Share URL + Deep Links 配置

**Files:**
- Modify: `app/src/screens/home/PostDetailScreen.tsx`
- Modify: `app/app.json`

- [ ] **Step 1: 修改 PostDetailScreen Share URL**

在 `app/src/screens/home/PostDetailScreen.tsx` 中，找到 Share 按钮的 `onPress` 里的 URL：

```typescript
// 改前
const url = `https://app.clawtalk.net/post/${postId}`;
// 改后
const url = `https://clawtalk.net/post/${postId}`;
```

- [ ] **Step 2: 修改 app.json 添加 Deep Links**

在 `app/app.json` 的 `expo.ios` 下添加：

```json
"associatedDomains": ["applinks:clawtalk.net"]
```

在 `expo.android` 下添加：

```json
"intentFilters": [
  {
    "action": "VIEW",
    "autoVerify": true,
    "data": [
      {
        "scheme": "https",
        "host": "clawtalk.net",
        "pathPrefix": "/post/"
      }
    ],
    "category": ["BROWSABLE", "DEFAULT"]
  }
]
```

- [ ] **Step 3: Commit**

```bash
git add app/src/screens/home/PostDetailScreen.tsx app/app.json
git commit -m "feat: Share URL 改为 clawtalk.net + Deep Links 配置"
```

---

### Task 4: App 端 — Linking URL 处理

**Files:**
- Modify: `app/src/navigation/RootNavigator.tsx` (或 App 入口)

- [ ] **Step 1: 找到 RootNavigator 或 App 入口**

读取 `app/src/navigation/RootNavigator.tsx`，在 NavigationContainer 上配置 `linking` prop。

- [ ] **Step 2: 添加 Linking 配置**

在 NavigationContainer 上添加 `linking` prop：

```typescript
import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const linking: LinkingOptions<any> = {
  prefixes: ['https://clawtalk.net', Linking.createURL('/')],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: {
            screens: {
              PostDetail: 'post/:postId',
            },
          },
        },
      },
    },
  },
};

// 在 NavigationContainer 上：
<NavigationContainer linking={linking}>
```

- [ ] **Step 3: Commit**

```bash
git add app/src/navigation/RootNavigator.tsx
git commit -m "feat: Linking 配置 — Deep Link URL 跳转 PostDetail"
```

---

### Task 5: 创建 PR

- [ ] **Step 1: 推送并创建 PR**

```bash
git push origin feat/share-landing-page
gh pr create --title "feat: 话题分享落地页 + OG 卡片 + Deep Links + SEO" --body "## Summary
- Express SSR 落地页（响应式：手机 + PC）
- 动态 OG tags（社交平台卡片预览）
- 动态 OG 封面图生成（sharp + SVG）
- iOS Universal Links + Android App Links
- 动态 sitemap（最近 1000 条帖子）
- App 端 Share URL 改域名 + Linking 配置

## Test plan
- [ ] 浏览器打开 clawtalk.net/post/{id} 看到落地页
- [ ] 手机端窄屏 + PC 端宽屏 响应式正常
- [ ] 分享链接到 Telegram/Twitter 看到卡片预览
- [ ] 帖子不存在返回 404 页面
- [ ] /og-image/{id} 返回彩色封面 PNG
- [ ] /sitemap-posts.xml 返回 XML 列表
- [ ] iOS Universal Links 跳 App（需 rebuild）
- [ ] Android App Links 跳 App（需 rebuild）"
```
