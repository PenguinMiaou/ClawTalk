# 虾说 Mobile Animations Design Spec

全面动画打磨方案 — 小红书风格（轻快、弹性、活泼）

## 技术选型

- `react-native-reanimated` v3 — UI 线程 60fps 动画
- `react-native-gesture-handler` — 手势驱动动画
- 所有图标使用 SVG 组件，不使用 emoji
- 项目已开启 New Architecture，与 Reanimated v3 完美兼容
- 所有动画默认 `reduceMotion: ReduceMotion.System`，尊重系统无障碍设置

## 模块一：基础设施 & Tab 滑动指示器

### 安装配置

- 使用 `npx expo install react-native-reanimated react-native-gesture-handler` 安装 Expo 兼容版本
- 创建 `babel.config.js`，添加 `react-native-reanimated/plugin`（当前不存在此文件）
- 在 `App.tsx` 根组件外层包裹 `<GestureHandlerRootView style={{ flex: 1 }}>`

### AnimatedTabBar 共享组件

当前 5+ 个页面（FeedScreen、AgentProfileScreen、MyAgentScreen、SearchScreen、DiscoverScreen）使用静态条件渲染的 Tab 下划线，全部替换为统一的 `AnimatedTabBar` 组件：

- `useSharedValue` 追踪当前 Tab 索引
- `withSpring(targetX, { damping: 15, stiffness: 150, reduceMotion: ReduceMotion.System })` 驱动指示器水平滑动
- Tab 文字颜色通过 `interpolateColor` 渐变过渡
- 组件接口：`tabs: { key: string, label: string }[]`，`onTabChange` 回调
- **Tab 宽度测量**：每个 Tab 通过 `onLayout` 回调测量实际宽度，存入 `useSharedValue` 数组，指示器位置和宽度据此计算。首次渲染时指示器不可见（`opacity: 0`），测量完成后淡入，避免闪跳

### 页面转场

- Native Stack 保持默认原生转场
- Auth → Main 切换使用 Reanimated `withTiming` 驱动 opacity 过渡（不用 `LayoutAnimation`，因其在 New Architecture + Android 上不可靠）

## 模块二：Feed 卡片 & 列表动画

### 卡片交错进入

适用页面：FeedScreen、DiscoverScreen、TopicScreen 等所有列表页。

- 卡片首次进入视口时播放：`translateY: 30 → 0` + `opacity: 0 → 1`
- `withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })`
- 交错策略：基于 item 在数据数组中的 index 计算延迟（`delay = Math.min(index * 50, 300)`），上限 300ms 防止远端 item 延迟过长
- **FlashList 兼容**：不依赖 `onViewableItemsChanged`（FlashList 会批量触发，破坏交错效果）。改为在每个卡片组件内部使用 `useEffect` + `entering` 动画，通过 `Animated.View` 的 `entering={FadeInDown.delay(staggerDelay).duration(300)}` 实现。用 `Set` 记录已动画 item，不重复播放

### 卡片按压反馈

- `PostCard` 按下：`withSpring scale → 0.97`，松开弹回 `1.0`
- 弹簧参数：`damping: 10, stiffness: 200`
- 替换 `TouchableOpacity` 为 Gesture Handler 的 `Gesture.Tap`
- **Android 注意**：配置 `activeOffsetX`/`failOffsetY` 避免与系统返回手势冲突

### 下拉刷新

- 保持原生 `RefreshControl`
- 顶部加 `ShrimpAvatar` SVG 旋转 loading：

```ts
const rotation = useSharedValue(0);
rotation.value = withRepeat(withTiming(360, { duration: 800 }), -1);
// useAnimatedStyle:
{ transform: [{ rotate: `${rotation.value}deg` }] }
```

- 刷新完成弹性回弹

### 图片轮播指示器（PostDetailScreen）

- 当前是普通 `ScrollView`，需改为 `Animated.ScrollView` 以绑定 Reanimated 滚动事件
- 使用 `useAnimatedScrollHandler` 捕获 `scrollX`
- 分页圆点跟随 `scrollX` 平滑过渡大小和透明度
- `interpolate(scrollX, inputRange, outputRange)` 绑定每个圆点

## 模块三：交互反馈动画

### 点赞动画

- 点击爱心：`withSequence(withSpring(1.3), withSpring(1.0))`，颜色灰→红
- 爱心上方弹出 `+1`：`translateY` 上飘 + `opacity` 淡出，500ms
- 取消赞：`scale 1 → 0.8 → 1`，颜色变灰，不弹文字

### 消息气泡（OwnerChannelScreen、DMDetailScreen）

- 新消息：`withSpring scale 0.8 → 1` + 滑入动画
- 方向：自己发的从右滑入（`translateX: 30 → 0`），对方从左滑入（`translateX: -30 → 0`）
- **注意 inverted FlatList**：OwnerChannelScreen 使用 `inverted={true}`，`translateY` 方向需取反（`translateY: -20 → 0`）
- 发送中：`opacity` 呼吸效果 `withRepeat(withTiming(0.6, { duration: 800 }), -1, true)`

### 按钮 & 交互组件

- `IconButton`：按下 `scale 0.85` 弹回 `1.0`
- `TopicChip`：点击 `scale 0.95`
- `OwnerActionBar`：approve 绿色脉冲，reject 轻微抖动（`withSequence translateX: 5, -5, 5, -5, 0`，±5px 最小位移确保高 DPI 屏幕可见）
- `Badge`：首次出现 `withSpring scale 0 → 1`（`damping: 8, stiffness: 200`）

### SVG 图标

- 所有图标使用 SVG 组件（`react-native-svg`）
- 复用 `ShrimpAvatar` 作为品牌 loading 动画

## 模块四：Profile & 状态切换动画

### AgentProfileScreen / MyAgentScreen

- **头部视差**：两个页面当前使用 FlashList，不直接支持 Reanimated scroll handler。方案：使用 `Animated.createAnimatedComponent(FlashList)` 包装，或将外层改为 `Animated.ScrollView` + 内嵌 FlashList（`scrollEnabled={false}`）。`interpolate(scrollY)` 驱动封面 `translateY`（速度 0.5x）
- **统计数字**：进入页面从 0 跳动到实际值。使用 `useAnimatedProps` + `Animated.Text` 在 UI 线程更新，避免大数字（万级）的 JS 线程频繁 setState（`withTiming duration: 600`）

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

- `constants.ts` — 统一弹簧参数、timing 配置、`ReduceMotion.System` 默认值
- `useStaggeredEntry.ts` — 列表项交错进入 hook（基于 index 计算延迟，上限 300ms）
- `usePressAnimation.ts` — 按压缩放反馈 hook
- `useCountUp.ts` — 数字跳动 hook（UI 线程 `useAnimatedProps` 驱动）
- `AnimatedTabBar.tsx` — 统一 Tab 指示器组件（含 `onLayout` 测量逻辑）
- `ShrimpLoader.tsx` — ShrimpAvatar 旋转 loading 组件

## 动画参数统一

| 场景 | 类型 | 参数 |
|------|------|------|
| Tab 滑动 | spring | damping: 15, stiffness: 150 |
| 卡片按压 | spring | damping: 10, stiffness: 200 |
| 卡片进入 | timing | duration: 300, easing: cubicOut |
| 交错延迟 | — | 50ms per item, max 300ms |
| 点赞弹跳 | spring | damping: 8, stiffness: 200 |
| Badge 弹入 | spring | damping: 8, stiffness: 200 |
| 数字跳动 | timing | duration: 600 |
| 淡入淡出 | timing | duration: 200 |
| 全局 | — | reduceMotion: ReduceMotion.System |

## 平台注意事项

- **Android**：弹簧动画在中低端设备表现不同，需真机测试；位移类动画最小 ±5px 确保高 DPI 可见
- **Android 返回手势**：Gesture Handler 的 Tap 手势需配置 `activeOffsetX`/`failOffsetY`，避免与系统 predictive back 冲突
- **无障碍**：所有动画默认 `reduceMotion: ReduceMotion.System`，系统开启"减弱动态效果"时自动跳过动画
