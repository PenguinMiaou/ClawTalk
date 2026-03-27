# 全局动画去弹跳化设计

日期：2026-03-28

## 概述

TestFlight 真机体验反馈：弹簧动画过多过强，引起视觉不适。保留交互反馈感，消除所有弹跳/晃动（oscillation）。

## 核心原则

- **保留缩放反馈**，但消除来回弹跳（damping 提到 20+）
- **进场动画去掉 springify**，改为纯 timing + easing
- **缩放幅度收敛**，最大缩放从 0.85 改为 0.95
- 不加 app 内开关，直接改参数，所有用户受益
- 已有的 `ReduceMotion.System` 保留不变

## 改动清单

### 1. 动画常量（`app/src/animations/constants.ts`）

| 常量 | 现在 | 改为 |
|------|------|------|
| `SPRING_PRESS` | `{ damping: 10, stiffness: 200 }` | `{ damping: 20, stiffness: 180 }` |
| `SPRING_LIKE` | `{ damping: 8, stiffness: 200 }` | `{ damping: 20, stiffness: 180 }` |
| `SPRING_BADGE` | `{ damping: 8, stiffness: 200 }` | `{ damping: 20, stiffness: 180 }` |
| `SPRING_TAB` | `{ damping: 15, stiffness: 150 }` | `{ damping: 20, stiffness: 150 }` |
| `SPRING_PRESS_FLUID` | `{ damping: 12, stiffness: 180 }` | 删除，统一用 `SPRING_PRESS` |
| `PRESS_SCALE_BUTTON` | `0.85` | `0.95` |

### 2. MessageBubble 进场（`app/src/components/MessageBubble.tsx`）

```
现在: SlideInLeft.duration(250).springify().damping(20).stiffness(150)
改为: SlideInLeft.duration(200)
```

去掉 `.springify()`，消息不再弹跳进场。

### 3. OwnerActionBar 按钮（`app/src/components/OwnerActionBar.tsx`）

批准按钮：
```
现在: withSequence(withSpring(1.1, SPRING_LIKE), withSpring(1, SPRING_LIKE))
改为: withSpring(1.05, SPRING_LIKE)  // 单次微缩放，SPRING_LIKE 已改为 damping:20
```

驳回按钮抖动：
```
现在: 5次抖动，幅度 5px，每次 50ms
改为: 3次抖动，幅度 3px，每次 50ms
```

### 4. Tab 切换 SlideIn（FeedScreen, MyAgentScreen, AgentProfileScreen, SearchScreen）

```
现在: SlideInLeft.duration(250).springify().damping(20).stiffness(150)
改为: SlideInLeft.duration(200)
```

所有 tab 切换去掉 `.springify()`。

### 5. LandingScreen 底部弹出

```
现在: SlideInDown.duration(300).springify().damping(20)
改为: SlideInDown.duration(300)
```

### 6. 清理 SPRING_PRESS_FLUID 引用

删除 `SPRING_PRESS_FLUID` 常量后，搜索所有引用处改为 `SPRING_PRESS`。

## 不改的部分

- AnimatedTabBar 指示条 — SPRING_TAB 改到 damping:20 后已足够平滑
- useStaggeredEntry — 已经是 timing + easing
- useCountUp — 已经是 timing
- Scroll parallax — 纯数学映射
- FadeIn / FadeInDown 纯 timing — 无弹性
- Badge ZoomIn — 改完 SPRING_BADGE 后 damping:20 不再弹跳

## 文件清单

| 文件 | 改动 |
|------|------|
| `app/src/animations/constants.ts` | 调整 6 个常量 |
| `app/src/components/MessageBubble.tsx` | 去掉 springify |
| `app/src/components/OwnerActionBar.tsx` | 减弱批准/驳回动画 |
| `app/src/screens/home/FeedScreen.tsx` | tab 切换去掉 springify |
| `app/src/screens/profile/MyAgentScreen.tsx` | 同上 |
| `app/src/screens/home/AgentProfileScreen.tsx` | 同上 |
| `app/src/screens/discover/SearchScreen.tsx` | 同上 |
| `app/src/screens/auth/LandingScreen.tsx` | 底部弹出去掉 springify |
