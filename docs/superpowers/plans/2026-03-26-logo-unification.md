# Logo 统一 (Fa) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Fa 设计（橙红渐变对话气泡 + 双钳子 + 大眼睛 + 声波嘴）统一全平台 logo/icon/favicon。

**Architecture:** 在 `app/assets/` 创建 SVG 源文件，用 Chrome headless 渲染各尺寸 PNG。同步更新 landing 页 SVG sprite、OG image、App 内 ShrimpAvatar 组件。

**Tech Stack:** SVG, Chrome headless (PNG 渲染), React Native SVG

---

## Fa Logo SVG 定义 (Master Reference)

所有后续任务中使用此 SVG 作为唯一源。viewBox 为 `0 0 100 100`。

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6b35"/>
      <stop offset="100%" stop-color="#ff3366"/>
    </linearGradient>
  </defs>
  <!-- Main bubble body -->
  <path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="url(#g)"/>
  <!-- Upper claw prong -->
  <path d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28" fill="url(#g)"/>
  <!-- Lower claw prong -->
  <path d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68" fill="url(#g)"/>
  <!-- Eyes -->
  <circle cx="38" cy="40" r="5.5" fill="#fff"/>
  <circle cx="58" cy="40" r="5.5" fill="#fff"/>
  <circle cx="39" cy="39.5" r="2.8" fill="#1a1a24"/>
  <circle cx="59" cy="39.5" r="2.8" fill="#1a1a24"/>
  <circle cx="40.2" cy="38" r="1.1" fill="#fff"/>
  <circle cx="60.2" cy="38" r="1.1" fill="#fff"/>
  <!-- Sound wave mouth -->
  <path d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>
  <path d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55"/>
</svg>
```

**小尺寸简化版 (32px 以下)** — 去掉钳子和声波第二行，放大眼睛：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff6b35"/>
      <stop offset="100%" stop-color="#ff3366"/>
    </linearGradient>
  </defs>
  <path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="url(#g)"/>
  <circle cx="38" cy="40" r="9" fill="#fff"/>
  <circle cx="58" cy="40" r="9" fill="#fff"/>
  <circle cx="39" cy="39" r="5" fill="#1a1a24"/>
  <circle cx="59" cy="39" r="5" fill="#1a1a24"/>
</svg>
```

**单色版 (monochrome)** — 用于 Android monochrome icon，纯灰色填充，去掉渐变和颜色：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="#666"/>
  <path d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28" fill="#666"/>
  <path d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68" fill="#666"/>
  <circle cx="38" cy="40" r="5.5" fill="#fff"/>
  <circle cx="58" cy="40" r="5.5" fill="#fff"/>
  <circle cx="39" cy="39.5" r="2.8" fill="#333"/>
  <circle cx="59" cy="39.5" r="2.8" fill="#333"/>
  <path d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>
  <path d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55"/>
</svg>
```

---

### Task 1: 生成 PNG 资源文件

**Files:**
- Create: `app/assets/logo-render.html` (临时渲染模板)
- Replace: `app/assets/icon.png` (1024x1024)
- Replace: `app/assets/adaptive-icon.png` (1024x1024)
- Replace: `app/assets/android-icon-foreground.png` (512x512)
- Replace: `app/assets/android-icon-background.png` (512x512)
- Replace: `app/assets/android-icon-monochrome.png` (432x432)
- Replace: `app/assets/favicon.png` (48x48)
- Replace: `app/assets/splash-icon.png` (1024x1024)

- [ ] **Step 1: 创建渲染 HTML 模板**

创建 `app/assets/logo-render.html`，包含所有需要渲染的尺寸变体。每个变体用一个固定尺寸的 `<div>` 包裹，方便逐个截图。

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; }
  body { background: transparent; }
  .render { position: absolute; top: 0; left: 0; }
</style>
</head>
<body>
<!-- 根据截图时的 --window-size 切换显示内容 -->
<div class="render" id="icon-1024" style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center;background:#fff;">
  <svg width="900" height="900" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ff6b35"/>
        <stop offset="100%" stop-color="#ff3366"/>
      </linearGradient>
    </defs>
    <path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="url(#g)"/>
    <path d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28" fill="url(#g)"/>
    <path d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68" fill="url(#g)"/>
    <circle cx="38" cy="40" r="5.5" fill="#fff"/>
    <circle cx="58" cy="40" r="5.5" fill="#fff"/>
    <circle cx="39" cy="39.5" r="2.8" fill="#1a1a24"/>
    <circle cx="59" cy="39.5" r="2.8" fill="#1a1a24"/>
    <circle cx="40.2" cy="38" r="1.1" fill="#fff"/>
    <circle cx="60.2" cy="38" r="1.1" fill="#fff"/>
    <path d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>
    <path d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55"/>
  </svg>
</div>
</body>
</html>
```

- [ ] **Step 2: 用 Chrome headless 渲染 icon.png (1024x1024)**

创建专门的渲染 HTML，然后截图：

```bash
# icon.png — 白底，完整 Fa logo 居中
cat > /tmp/clawtalk-icon.html << 'HTMLEOF'
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;}body{width:1024px;height:1024px;background:#fff;display:flex;align-items:center;justify-content:center;}</style></head><body>
<svg width="820" height="820" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#ff3366"/></linearGradient></defs>
<path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="url(#g)"/>
<path d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28" fill="url(#g)"/>
<path d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68" fill="url(#g)"/>
<circle cx="38" cy="40" r="5.5" fill="#fff"/><circle cx="58" cy="40" r="5.5" fill="#fff"/>
<circle cx="39" cy="39.5" r="2.8" fill="#1a1a24"/><circle cx="59" cy="39.5" r="2.8" fill="#1a1a24"/>
<circle cx="40.2" cy="38" r="1.1" fill="#fff"/><circle cx="60.2" cy="38" r="1.1" fill="#fff"/>
<path d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>
<path d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55"/>
</svg>
</body></html>
HTMLEOF

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --screenshot=app/assets/icon.png \
  --window-size=1024,1024 --default-background-color=0 \
  /tmp/clawtalk-icon.html
```

Verify: `file app/assets/icon.png` → should show `PNG image data, 1024 x 1024`

- [ ] **Step 3: 渲染 adaptive-icon.png (1024x1024)**

与 icon.png 相同内容，白底。

```bash
cp app/assets/icon.png app/assets/adaptive-icon.png
```

- [ ] **Step 4: 渲染 android-icon-foreground.png (512x512, 透明背景)**

```bash
cat > /tmp/clawtalk-fg.html << 'HTMLEOF'
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;}body{width:512px;height:512px;background:transparent;display:flex;align-items:center;justify-content:center;}</style></head><body>
<svg width="340" height="340" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#ff3366"/></linearGradient></defs>
<path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="url(#g)"/>
<path d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28" fill="url(#g)"/>
<path d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68" fill="url(#g)"/>
<circle cx="38" cy="40" r="5.5" fill="#fff"/><circle cx="58" cy="40" r="5.5" fill="#fff"/>
<circle cx="39" cy="39.5" r="2.8" fill="#1a1a24"/><circle cx="59" cy="39.5" r="2.8" fill="#1a1a24"/>
<circle cx="40.2" cy="38" r="1.1" fill="#fff"/><circle cx="60.2" cy="38" r="1.1" fill="#fff"/>
<path d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>
<path d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55"/>
</svg>
</body></html>
HTMLEOF

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --screenshot=app/assets/android-icon-foreground.png \
  --window-size=512,512 --default-background-color=0 \
  /tmp/clawtalk-fg.html
```

- [ ] **Step 5: 渲染 android-icon-background.png (512x512, 纯渐变)**

```bash
cat > /tmp/clawtalk-bg.html << 'HTMLEOF'
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;}body{width:512px;height:512px;background:linear-gradient(135deg,#ff6b35,#ff3366);}</style></head><body></body></html>
HTMLEOF

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --screenshot=app/assets/android-icon-background.png \
  --window-size=512,512 --default-background-color=0 \
  /tmp/clawtalk-bg.html
```

- [ ] **Step 6: 渲染 android-icon-monochrome.png (432x432)**

```bash
cat > /tmp/clawtalk-mono.html << 'HTMLEOF'
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;}body{width:432px;height:432px;background:transparent;display:flex;align-items:center;justify-content:center;}</style></head><body>
<svg width="300" height="300" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="#666"/>
<path d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28" fill="#666"/>
<path d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68" fill="#666"/>
<circle cx="38" cy="40" r="5.5" fill="#fff"/><circle cx="58" cy="40" r="5.5" fill="#fff"/>
<circle cx="39" cy="39.5" r="2.8" fill="#333"/><circle cx="59" cy="39.5" r="2.8" fill="#333"/>
<path d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>
<path d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55"/>
</svg>
</body></html>
HTMLEOF

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --screenshot=app/assets/android-icon-monochrome.png \
  --window-size=432,432 --default-background-color=0 \
  /tmp/clawtalk-mono.html
```

- [ ] **Step 7: 渲染 favicon.png (48x48, 简化版)**

```bash
cat > /tmp/clawtalk-fav.html << 'HTMLEOF'
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;}body{width:48px;height:48px;background:transparent;display:flex;align-items:center;justify-content:center;}</style></head><body>
<svg width="44" height="44" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#ff3366"/></linearGradient></defs>
<path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="url(#g)"/>
<circle cx="38" cy="40" r="9" fill="#fff"/><circle cx="58" cy="40" r="9" fill="#fff"/>
<circle cx="39" cy="39" r="5" fill="#1a1a24"/><circle cx="59" cy="39" r="5" fill="#1a1a24"/>
</svg>
</body></html>
HTMLEOF

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --screenshot=app/assets/favicon.png \
  --window-size=48,48 --default-background-color=0 \
  /tmp/clawtalk-fav.html
```

- [ ] **Step 8: 渲染 splash-icon.png (1024x1024, 透明背景)**

```bash
cat > /tmp/clawtalk-splash.html << 'HTMLEOF'
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;}body{width:1024px;height:1024px;background:transparent;display:flex;align-items:center;justify-content:center;}</style></head><body>
<svg width="600" height="600" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#ff3366"/></linearGradient></defs>
<path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="url(#g)"/>
<path d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28" fill="url(#g)"/>
<path d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68" fill="url(#g)"/>
<circle cx="38" cy="40" r="5.5" fill="#fff"/><circle cx="58" cy="40" r="5.5" fill="#fff"/>
<circle cx="39" cy="39.5" r="2.8" fill="#1a1a24"/><circle cx="59" cy="39.5" r="2.8" fill="#1a1a24"/>
<circle cx="40.2" cy="38" r="1.1" fill="#fff"/><circle cx="60.2" cy="38" r="1.1" fill="#fff"/>
<path d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/>
<path d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55"/>
</svg>
</body></html>
HTMLEOF

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --screenshot=app/assets/splash-icon.png \
  --window-size=1024,1024 --default-background-color=0 \
  /tmp/clawtalk-splash.html
```

- [ ] **Step 9: 清理临时渲染文件**

```bash
rm -f app/assets/logo-render.html
rm -f /tmp/clawtalk-icon.html /tmp/clawtalk-fg.html /tmp/clawtalk-bg.html
rm -f /tmp/clawtalk-mono.html /tmp/clawtalk-fav.html /tmp/clawtalk-splash.html
```

- [ ] **Step 10: 验证所有 PNG 尺寸**

```bash
file app/assets/icon.png app/assets/adaptive-icon.png app/assets/android-icon-foreground.png app/assets/android-icon-background.png app/assets/android-icon-monochrome.png app/assets/favicon.png app/assets/splash-icon.png
```

Expected: 每个文件显示 `PNG image data` 和正确尺寸。

- [ ] **Step 11: Commit**

```bash
git add app/assets/icon.png app/assets/adaptive-icon.png app/assets/android-icon-foreground.png app/assets/android-icon-background.png app/assets/android-icon-monochrome.png app/assets/favicon.png app/assets/splash-icon.png
git commit -m "feat: replace all app icons with Fa logo (gradient bubble + claw + eyes + sound wave)"
```

---

### Task 2: 更新 app.json 添加 monochromeImage

**Files:**
- Modify: `app/app.json:19-25` (android.adaptiveIcon section)

- [ ] **Step 1: 添加 monochromeImage 配置**

在 `app/app.json` 的 `android.adaptiveIcon` 中添加 `monochromeImage` 字段：

```json
    "android": {
      "package": "net.clawtalk.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/android-icon-foreground.png",
        "monochromeImage": "./assets/android-icon-monochrome.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true
    },
```

- [ ] **Step 2: Commit**

```bash
git add app/app.json
git commit -m "feat: add monochromeImage to android adaptiveIcon config"
```

---

### Task 3: 更新 Landing 页 SVG sprite 和 favicon

**Files:**
- Modify: `landing/index.html:12` (favicon link)
- Modify: `landing/index.html:353` (#icon-shrimp symbol)

- [ ] **Step 1: 替换 favicon**

将第 12 行的 emoji favicon 替换为 Fa SVG inline。

旧值:
```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🦞</text></svg>">
```

新值:
```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23ff6b35'/%3E%3Cstop offset='100%25' stop-color='%23ff3366'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M50 10 C73 10,88 26,88 48 C88 70,73 86,50 86 C42 86,35 83,30 79 L18 88 L22 74 C14 68,12 58,12 48 C12 26,27 10,50 10Z' fill='url(%23g)'/%3E%3Ccircle cx='38' cy='40' r='9' fill='%23fff'/%3E%3Ccircle cx='58' cy='40' r='9' fill='%23fff'/%3E%3Ccircle cx='39' cy='39' r='5' fill='%231a1a24'/%3E%3Ccircle cx='59' cy='39' r='5' fill='%231a1a24'/%3E%3C/svg%3E">
```

- [ ] **Step 2: 替换 #icon-shrimp symbol**

将第 353 行的 `<symbol id="icon-shrimp" ...>` 替换为 Fa 的 path。注意：symbol 内不能用 `<defs>` + `<linearGradient>`（因为 `<use>` 外部引用时 gradient 不可见），所以用 `currentColor` 让颜色由 CSS 控制：

旧值:
```html
<symbol id="icon-shrimp" viewBox="0 0 24 24"><path d="M12 2C9.5 2 7.5 3.5 ..." fill="currentColor"/></symbol>
```

新值:
```html
<symbol id="icon-shrimp" viewBox="0 0 100 100"><path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="currentColor"/><path d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28" fill="currentColor"/><path d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68" fill="currentColor"/><circle cx="38" cy="40" r="5.5" fill="#fff"/><circle cx="58" cy="40" r="5.5" fill="#fff"/><circle cx="39" cy="39.5" r="2.8" fill="currentColor" opacity="0.8"/><circle cx="59" cy="39.5" r="2.8" fill="currentColor" opacity="0.8"/></symbol>
```

注意 viewBox 从 `0 0 24 24` 变成了 `0 0 100 100`。Landing 页使用 `icon-shrimp` 的地方 (line 407, 460) 通过 CSS 设定大小，不需要改。

- [ ] **Step 3: Commit**

```bash
git add landing/index.html
git commit -m "feat: update landing favicon and shrimp icon to Fa logo"
```

---

### Task 4: 更新 OG image

**Files:**
- Modify: `landing/og-image.html:62` (emoji → SVG)
- Regenerate: `landing/og-image.png`

- [ ] **Step 1: 替换 og-image.html 中的 emoji**

将第 62 行：
```html
<div class="emoji">🦞</div>
```

替换为内联 Fa SVG：
```html
<div class="emoji"><svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff6b35"/><stop offset="100%" stop-color="#ff3366"/></linearGradient></defs><path d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z" fill="url(#g)"/><path d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28" fill="url(#g)"/><path d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68" fill="url(#g)"/><circle cx="38" cy="40" r="5.5" fill="#fff"/><circle cx="58" cy="40" r="5.5" fill="#fff"/><circle cx="39" cy="39.5" r="2.8" fill="#1a1a24"/><circle cx="59" cy="39.5" r="2.8" fill="#1a1a24"/><circle cx="40.2" cy="38" r="1.1" fill="#fff"/><circle cx="60.2" cy="38" r="1.1" fill="#fff"/><path d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.9"/><path d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.55"/></svg></div>
```

- [ ] **Step 2: 重新截图生成 og-image.png**

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --screenshot=landing/og-image.png \
  --window-size=1200,630 --default-background-color=0 \
  landing/og-image.html
```

- [ ] **Step 3: 验证**

打开 `landing/og-image.png` 确认 logo 显示正确。

```bash
open landing/og-image.png
```

- [ ] **Step 4: Commit**

```bash
git add landing/og-image.html landing/og-image.png
git commit -m "feat: replace emoji with Fa logo in OG image"
```

---

### Task 5: 更新 ShrimpAvatar 组件

**Files:**
- Modify: `app/src/components/ui/ShrimpAvatar.tsx`

- [ ] **Step 1: 重写 ShrimpAvatar 使用 Fa logo**

将整个 `ShrimpAvatar.tsx` 替换为以下内容。保持原有接口 (`color`, `size`) 不变。`color` prop 现在用于控制渐变起始色（默认保持橙红）。

```tsx
import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';

interface ShrimpAvatarProps {
  color?: string;
  size?: number;
}

export function ShrimpAvatar({ color = '#ff6b35', size = 40 }: ShrimpAvatarProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="shrimpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor="#ff3366" />
        </LinearGradient>
      </Defs>
      {/* Main bubble body */}
      <Path
        d="M50 10 C73 10, 88 26, 88 48 C88 70, 73 86, 50 86 C42 86, 35 83, 30 79 L18 88 L22 74 C14 68, 12 58, 12 48 C12 26, 27 10, 50 10Z"
        fill="url(#shrimpGrad)"
      />
      {/* Upper claw */}
      <Path
        d="M72 24 C77 19, 84 18, 88 22 C91 25, 89 30, 84 30 L76 28"
        fill="url(#shrimpGrad)"
      />
      {/* Lower claw */}
      <Path
        d="M72 72 C77 77, 84 78, 88 74 C91 71, 89 66, 84 66 L76 68"
        fill="url(#shrimpGrad)"
      />
      {/* Eyes */}
      <Circle cx={38} cy={40} r={size > 32 ? 5.5 : 9} fill="#fff" />
      <Circle cx={58} cy={40} r={size > 32 ? 5.5 : 9} fill="#fff" />
      {size > 32 && (
        <>
          <Circle cx={39} cy={39.5} r={2.8} fill="#1a1a24" />
          <Circle cx={59} cy={39.5} r={2.8} fill="#1a1a24" />
          <Circle cx={40.2} cy={38} r={1.1} fill="#fff" />
          <Circle cx={60.2} cy={38} r={1.1} fill="#fff" />
        </>
      )}
      {size <= 32 && (
        <>
          <Circle cx={39} cy={39} r={5} fill="#1a1a24" />
          <Circle cx={59} cy={39} r={5} fill="#1a1a24" />
        </>
      )}
      {/* Sound wave mouth — only at larger sizes */}
      {size > 32 && (
        <>
          <Path
            d="M34 56 C34 52, 38 50, 42 52 C46 54, 50 52, 54 50 C58 48, 62 50, 62 54"
            stroke="#fff"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            opacity={0.9}
          />
          <Path
            d="M38 64 C38 60, 42 58, 46 60 C50 62, 54 60, 58 58"
            stroke="#fff"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
            opacity={0.55}
          />
        </>
      )}
    </Svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/ui/ShrimpAvatar.tsx
git commit -m "feat: update ShrimpAvatar to use Fa logo design"
```

---

### Task 6: 目视验证

- [ ] **Step 1: 在浏览器检查 landing 页**

```bash
open landing/index.html
```

检查：
- 导航栏 logo 图标是否显示为 Fa 轮廓
- Hero 右侧手机 mockup 内的 logo 是否一致
- 浏览器 tab 的 favicon 是否为渐变气泡

- [ ] **Step 2: 检查 OG image**

```bash
open landing/og-image.png
```

确认 Fa SVG logo 替代了原来的 🦞 emoji。

- [ ] **Step 3: 检查 app assets**

```bash
open app/assets/icon.png
open app/assets/favicon.png
open app/assets/splash-icon.png
open app/assets/android-icon-monochrome.png
```

确认所有 PNG 都是 Fa logo，无残留的蓝色 A 或灰色占位符。

- [ ] **Step 4: 清理 concept 文件**

```bash
rm -f docs/logo-concepts.html docs/logo-concepts-f.html docs/logo-concepts-f2.html
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: remove logo concept exploration files"
```
