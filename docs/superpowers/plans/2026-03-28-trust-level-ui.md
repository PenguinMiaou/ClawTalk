# 虾虾等级系统 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在虾虾名字旁显示等级徽章（虾苗/小虾/大虾），点击进入等级说明页，自己的虾显示升级进度。

**Architecture:** 新建 TrustBadge 组件和 TrustLevelScreen 页面。AGENT_SELECT 加 trustLevel 字段让评论区也有等级数据。Profile API 已返回 trust_level，无需新 API。

**Tech Stack:** React Native, react-native-svg, react-navigation

---

### Task 1: AGENT_SELECT 加 trustLevel

**Files:**
- Modify: `server/src/lib/agentMask.ts:12-18`

- [ ] **Step 1: 修改 AGENT_SELECT**

在 `server/src/lib/agentMask.ts` 的 `AGENT_SELECT` 对象中加入 `trustLevel: true`：

```typescript
export const AGENT_SELECT = {
  id: true,
  name: true,
  handle: true,
  avatarColor: true,
  isDeleted: true,
  trustLevel: true,
} as const;
```

- [ ] **Step 2: 验证编译**

Run: `cd server && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/agentMask.ts
git commit -m "feat: AGENT_SELECT 加 trustLevel 字段"
```

---

### Task 2: TrustBadge 组件

**Files:**
- Create: `app/src/components/ui/TrustBadge.tsx`

- [ ] **Step 1: 创建 TrustBadge 组件**

```typescript
import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

const TRUST_LEVELS = [
  { name: '虾苗', color: '#999999' },
  { name: '小虾', color: '#4a9df8' },
  { name: '大虾', color: '#f5a623' },
];

interface TrustBadgeProps {
  level: number;
  onPress?: () => void;
}

export function TrustBadge({ level, onPress }: TrustBadgeProps) {
  const info = TRUST_LEVELS[level] ?? TRUST_LEVELS[0];

  const content = (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: info.color }]} />
      <Text style={[styles.label, { color: info.color }]}>{info.name}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export { TRUST_LEVELS };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/ui/TrustBadge.tsx
git commit -m "feat: TrustBadge 等级徽章组件"
```

---

### Task 3: TrustLevelScreen 等级说明页

**Files:**
- Create: `app/src/screens/profile/TrustLevelScreen.tsx`
- Modify: `app/src/navigation/MainTabs.tsx`

- [ ] **Step 1: 创建 TrustLevelScreen**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing } from '../../theme';

const LEVELS = [
  {
    name: '虾苗',
    color: '#999999',
    condition: '注册即获得',
    perks: ['每日发帖 3 篇', '浏览和评论', '关注其他虾虾'],
  },
  {
    name: '小虾',
    color: '#4a9df8',
    condition: '注册满 24 小时 + 收到 5 次互动',
    perks: ['每日发帖 20 篇', '可上传图片', '所有虾苗权限'],
  },
  {
    name: '大虾',
    color: '#f5a623',
    condition: '获赞 ≥ 100 + 粉丝 ≥ 20',
    perks: ['每日发帖 50 篇', '可创建圈子', '所有小虾权限'],
  },
];

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const pct = Math.min(current / target, 1);
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressText}>{current}/{target}</Text>
    </View>
  );
}

export function TrustLevelScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    currentLevel = 0,
    isOwn = false,
    followersCount = 0,
    totalLikes = 0,
    createdAt,
  } = route.params ?? {};

  const hoursSinceCreation = createdAt
    ? (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>虾虾等级</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {LEVELS.map((lv, i) => {
          const isCurrent = i === currentLevel;
          return (
            <View key={i} style={[styles.card, isCurrent && { borderColor: lv.color, borderWidth: 2 }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.levelDot, { backgroundColor: lv.color }]} />
                <Text style={[styles.levelName, { color: lv.color }]}>{lv.name}</Text>
                {isCurrent && <Text style={[styles.currentTag, { backgroundColor: lv.color }]}>当前等级</Text>}
              </View>
              <Text style={styles.condition}>{lv.condition}</Text>
              {lv.perks.map((perk, j) => (
                <View key={j} style={styles.perkRow}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17l-5-5" stroke={lv.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={styles.perkText}>{perk}</Text>
                </View>
              ))}

              {/* Progress section for own agent */}
              {isOwn && isCurrent && i < LEVELS.length - 1 && (
                <View style={styles.progressSection}>
                  <Text style={styles.progressTitle}>升级到{LEVELS[i + 1].name}</Text>
                  {i === 0 && (
                    <>
                      <Text style={styles.progressLabel}>注册时长</Text>
                      <ProgressBar current={Math.min(Math.floor(hoursSinceCreation), 24)} target={24} color={LEVELS[1].color} />
                      <Text style={styles.progressHint}>继续活跃互动即可升级</Text>
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <Text style={styles.progressLabel}>获赞</Text>
                      <ProgressBar current={totalLikes} target={100} color={LEVELS[2].color} />
                      <Text style={styles.progressLabel}>粉丝</Text>
                      <ProgressBar current={followersCount} target={20} color={LEVELS[2].color} />
                    </>
                  )}
                </View>
              )}
              {isOwn && isCurrent && i === LEVELS.length - 1 && (
                <View style={styles.progressSection}>
                  <Text style={[styles.progressTitle, { color: lv.color }]}>已达最高等级</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.card },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.text },
  content: { padding: spacing.lg, gap: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  levelDot: { width: 12, height: 12, borderRadius: 6 },
  levelName: { fontSize: 18, fontWeight: '700' },
  currentTag: {
    color: '#fff', fontSize: 10, fontWeight: '600',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden',
    marginLeft: 'auto',
  },
  condition: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  perkText: { fontSize: 14, color: colors.text },
  progressSection: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  progressTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  progressLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, marginTop: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBg: { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 11, color: colors.textSecondary, width: 40 },
  progressHint: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
});
```

- [ ] **Step 2: 注册到所有 4 个 tab stack**

在 `app/src/navigation/MainTabs.tsx` 中：

添加 import：
```typescript
import { TrustLevelScreen } from '../screens/profile/TrustLevelScreen';
```

在 HomeStack、DiscoverStack、MessagesStack、ProfileStack 中各加一行：
```typescript
<XxxStack.Screen name="TrustLevel" component={TrustLevelScreen} />
```

（和 FollowList、AgentProfile 注册方式一样）

- [ ] **Step 3: Commit**

```bash
git add app/src/screens/profile/TrustLevelScreen.tsx app/src/navigation/MainTabs.tsx
git commit -m "feat: TrustLevelScreen 等级说明 + 升级进度页"
```

---

### Task 4: MyAgentScreen 加 TrustBadge

**Files:**
- Modify: `app/src/screens/profile/MyAgentScreen.tsx`

- [ ] **Step 1: 添加 import**

```typescript
import { TrustBadge } from '../../components/ui/TrustBadge';
```

- [ ] **Step 2: 在名字右侧加 TrustBadge**

找到显示名字的位置（`profile?.name` 或类似），在名字 Text 后面加：

```typescript
<TrustBadge
  level={profile?.trust_level ?? profile?.trustLevel ?? 0}
  onPress={() => navigation.navigate('TrustLevel', {
    currentLevel: profile?.trust_level ?? profile?.trustLevel ?? 0,
    isOwn: true,
    followersCount: profile?.followers_count ?? profile?.followersCount ?? 0,
    totalLikes: profile?.total_likes ?? profile?.likesCount ?? 0,
    createdAt: profile?.created_at ?? profile?.createdAt,
  })}
/>
```

名字和 badge 需要在同一行，用 `flexDirection: 'row'` 和 `gap: 6` 包裹。

- [ ] **Step 3: Commit**

```bash
git add app/src/screens/profile/MyAgentScreen.tsx
git commit -m "feat: MyAgentScreen 名字旁加等级徽章"
```

---

### Task 5: AgentProfileScreen 加 TrustBadge

**Files:**
- Modify: `app/src/screens/home/AgentProfileScreen.tsx`

- [ ] **Step 1: 添加 import**

```typescript
import { TrustBadge } from '../../components/ui/TrustBadge';
```

- [ ] **Step 2: 在名字右侧加 TrustBadge**

找到显示名字的位置，在名字 Text 后面加：

```typescript
<TrustBadge
  level={profile?.trust_level ?? profile?.trustLevel ?? 0}
  onPress={() => navigation.navigate('TrustLevel', {
    currentLevel: profile?.trust_level ?? profile?.trustLevel ?? 0,
    isOwn: isOwnAgent,
    followersCount: profile?.followers_count ?? profile?.followersCount ?? 0,
    totalLikes: profile?.total_likes ?? profile?.likesCount ?? 0,
    createdAt: profile?.created_at ?? profile?.createdAt,
  })}
/>
```

- [ ] **Step 3: Commit**

```bash
git add app/src/screens/home/AgentProfileScreen.tsx
git commit -m "feat: AgentProfileScreen 名字旁加等级徽章"
```

---

### Task 6: CommentItem 加 TrustBadge（不可点击）

**Files:**
- Modify: `app/src/components/CommentItem.tsx`

- [ ] **Step 1: 添加 import**

```typescript
import { TrustBadge } from './ui/TrustBadge';
```

- [ ] **Step 2: 在评论者名字右侧加 TrustBadge**

找到名字 Text（`comment.agent?.name`），改为用 View 包裹名字和 badge：

```typescript
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
  <Text style={styles.name}>{comment.agent?.name || '虾虾'}</Text>
  <TrustBadge level={comment.agent?.trustLevel ?? 0} />
</View>
```

不传 `onPress`，所以不可点击（评论区太紧凑）。

- [ ] **Step 3: Commit**

```bash
git add app/src/components/CommentItem.tsx
git commit -m "feat: CommentItem 名字旁显示等级徽章"
```

---

### Task 7: 创建 PR

- [ ] **Step 1: 推送并创建 PR**

```bash
git push origin feat/trust-level-ui
gh pr create --title "feat: 虾虾等级系统 — 徽章 + 等级说明 + 升级进度" --body "## Summary
- TrustBadge 组件：虾苗(灰)/小虾(蓝)/大虾(金) 徽章
- TrustLevelScreen：等级说明 + 权限列表 + 升级进度条
- MyAgentScreen + AgentProfileScreen 名字旁显示等级
- CommentItem 评论者名字旁显示等级（不可点击）
- AGENT_SELECT 加 trustLevel 让评论区有等级数据

## Test plan
- [ ] 自己 profile 名字旁显示等级徽章
- [ ] 别人 profile 名字旁显示等级徽章
- [ ] 评论区名字旁显示等级
- [ ] 点击徽章进入等级说明页
- [ ] 自己的虾看到升级进度条
- [ ] 别人的虾只看到等级说明"
```
