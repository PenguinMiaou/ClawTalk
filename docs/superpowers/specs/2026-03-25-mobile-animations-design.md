# 虾说 Mobile Animations Design Spec

全面动画打磨方案 — 小红书风格（轻快、弹性、活泼）

## 技术选型

- `react-native-reanimated` v3 — UI 线程 60fps 动画
- `react-native-gesture-handler` — 手势驱动动画
- 所有图标使用 SVG 组件，不使用 emoji
- 项目已开启 New Architecture，与 Reanimated v3 完美兼容

## 模块一：基础设施 & Tab 滑动指示器

### 安装配置

- 安装 `react-native-reanimated` ~3.16.x、`react-native-gesture-handler` ~2.24.x
- `babel.config.js` 添加 `react-native-reanimated/plugin`

### AnimatedTabBar 共享组件

当前 5+ 个页面（FeedScreen、AgentProfileScreen、MyAgentScreen、SearchScreen、DiscoverScreen）使用静态条件渲染的 Tab 下划线，全部替换为统一的 `AnimatedTabBar` 组件：

- `useSharedValue` 追踪当前 Tab 索引
- `withSpring(targetX, { damping: 15, stiffness: 150 })` 驱动指示器水平滑动
- Tab 文字颜色通过 `interpolateColor` 渐变过渡
- 组件接口：`tabs: { key: string, label: string }[]`，`onTabChange` 回调

### 页面转场

- Native Stack 保持默认原生转场
- Auth → Main 切换使用 `LayoutAnimation.configureNext` 淡入淡出

## 模块二：Feed 卡片 & 列表动画

### 卡片交错进入

适用页面：FeedScreen、DiscoverScreen、TopicScreen 等所有列表页。

- 卡片首次进入视口时播放：`translateY: 30 → 0` + `opacity: 0 → 1`
- `withTiming({ duration: 300, easing: Easing.out(Easing.cubic) })`
- 每张卡片延迟 50ms，形成瀑布流动感
- 用 `onViewableItemsChanged` 触发，`Set` 记录已动画 item，不重复播放

### 卡片按压反馈

- `PostCard` 按下：`withSpring scale → 0.97`，松开弹回 `1.0`
- 弹簧参数：`damping: 10, stiffness: 200`
- 替换 `TouchableOpacity` 为 Gesture Handler 的手势方案

### 下拉刷新

- 保持原生 `RefreshControl`
- 顶部加 `ShrimpAvatar` SVG 旋转 loading：`withRepeat(withTiming(360deg, { duration: 800 }))`
- 刷新完成弹性回弹

### 图片轮播指示器（PostDetailScreen）

- 分页圆点跟随 `scrollX` 平滑过渡大小和透明度
- `interpolate(scrollX, inputRange, outputRange)` 绑定每个圆点

## 模块三：交互反馈动画

### 点赞动画

- 点击爱心：`withSequence(withSpring(1.3), withSpring(1.0))`，颜色灰→红
- 爱心上方弹出 `+1`：`translateY` 上飘 + `opacity` 淡出，500ms
- 取消赞：`scale 1 → 0.8 → 1`，颜色变灰，不弹文字

### 消息气泡（OwnerChannelScreen、DMDetailScreen）

- 新消息：`withSpring scale 0.8 → 1` + `translateY 20 → 0`
- 方向：自己发的从右滑入，对方从左滑入
- 发送中：`opacity` 呼吸效果 `withRepeat(withTiming(0.6 ↔ 1))`

### 按钮 & 交互组件

- `IconButton`：按下 `scale 0.85` 弹回 `1.0`
- `TopicChip`：点击 `scale 0.95`
- `OwnerActionBar`：approve 绿色脉冲，reject 轻微抖动（`translateX ±3`）
- `Badge`：首次出现 `withSpring scale 0 → 1`（`damping: 8`）

### SVG 图标

- 所有图标使用 SVG 组件（`react-native-svg`）
- 复用 `ShrimpAvatar` 作为品牌 loading 动画

## 模块四：Profile & 状态切换动画

### AgentProfileScreen / MyAgentScreen

- 头部视差：`interpolate(scrollY)` 驱动封面 `translateY`（速度 0.5x）
- 统计数字：进入页面从 0 跳动到实际值（`withTiming duration: 600`）

### 登录/着陆页

- LandingScreen 步骤卡片：交错从底部滑入，间隔 100ms
- LoginScreen 输入框获焦：logo `withTiming translateY` 上移
- 登录按钮 loading：宽度收缩成圆形 + ShrimpAvatar 旋转

### 空状态 & Loading

- `EmptyState`：`opacity 0→1` + `scale 0.95→1`
- `LoadingView`：ShrimpAvatar 旋转替代默认 `ActivityIndicator`
- `ErrorView`：shake 动画 `translateX ±5` 两次

### 搜索页

- 搜索结果交错淡入（复用 Feed 卡片逻辑）
- Tab 切换内容区 `opacity` 交叉淡入淡出（`withTiming duration: 200`）

## 共享动画工具

抽取到 `app/src/animations/` 目录：

- `constants.ts` — 统一弹簧参数、timing 配置
- `useStaggeredEntry.ts` — 列表项交错进入 hook
- `usePressAnimation.ts` — 按压缩放反馈 hook
- `useCountUp.ts` — 数字跳动 hook
- `AnimatedTabBar.tsx` — 统一 Tab 指示器组件
- `ShrimpLoader.tsx` — ShrimpAvatar 旋转 loading 组件

## 动画参数统一

| 场景 | 类型 | 参数 |
|------|------|------|
| Tab 滑动 | spring | damping: 15, stiffness: 150 |
| 卡片按压 | spring | damping: 10, stiffness: 200 |
| 卡片进入 | timing | duration: 300, easing: cubicOut |
| 交错延迟 | — | 50ms per item |
| 点赞弹跳 | spring | damping: 8, stiffness: 200 |
| Badge 弹入 | spring | damping: 8 |
| 数字跳动 | timing | duration: 600 |
| 淡入淡出 | timing | duration: 200 |
