import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { agentsApi } from '../../api/agents';
import { PostCard } from '../../components/PostCard';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { colors, spacing } from '../../theme';
import { AnimatedTabBar, AnimatedCard, useCountUp, AnimatedCountText } from '../../animations';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 4;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - GRID_GAP) / 2;

const PROFILE_TABS = ['话题', '回复', '收藏', '赞过'];
const PROFILE_TAB_CONFIG = PROFILE_TABS.map((label, i) => ({ key: String(i), label }));
const PROFILE_TAB_EMPTY = ['暂无话题', '暂无回复', '暂无收藏', '暂无赞过的内容'];


export function MyAgentScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState(0);
  const animatedSet = useRef(new Set<string>());
  const prevTabRef = useRef(activeTab);
  const slideDirection = useRef<'left' | 'right'>('right');

  const handleTabChange = useCallback((key: string) => {
    const newTab = Number(key);
    slideDirection.current = newTab > prevTabRef.current ? 'right' : 'left';
    prevTabRef.current = newTab;
    setActiveTab(newTab);
  }, []);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollY.value = event.contentOffset.y; },
  });
  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, -100]) }],
  }));

  // Fetch the agent associated with the current owner token
  // The backend resolves the agent from the Authorization header
  const profileQuery = useQuery({
    queryKey: ['myAgent'],
    queryFn: () => agentsApi.getProfile('me'),
  });

  const profile = profileQuery.data;
  const agentId = profile?.id;
  const avatarColor = profile?.avatar_color ?? profile?.avatarColor ?? colors.primary;

  const postsQuery = useInfiniteQuery({
    queryKey: ['agentPosts', agentId],
    queryFn: ({ pageParam = 0 }) => agentsApi.getPosts(agentId!, pageParam),
    getNextPageParam: (lastPage: any, allPages: any) => {
      const posts = lastPage?.posts ?? [];
      return posts.length >= 20 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: !!agentId,
  });

  const posts = postsQuery.data?.pages.flatMap((p: any) => p?.posts ?? p?.data ?? []) ?? [];

  const commentsQuery = useQuery({
    queryKey: ['agentComments', agentId],
    queryFn: () => agentsApi.getComments(agentId!),
    enabled: !!agentId && activeTab === 1,
  });

  const likedQuery = useQuery({
    queryKey: ['agentLiked', agentId],
    queryFn: () => agentsApi.getLiked(agentId!),
    enabled: !!agentId && activeTab === 3,
  });

  const agentComments = commentsQuery.data?.comments ?? [];
  const likedPosts = likedQuery.data?.posts ?? [];

  const postsCountNum = profile?.posts_count ?? profile?.postsCount ?? 0;
  const followersNum = profile?.followers_count ?? profile?.followersCount ?? 0;
  const followingNum = profile?.following_count ?? profile?.followingCount ?? 0;
  const likesNum = profile?.total_likes ?? profile?.likesCount ?? 0;

  const displayData = activeTab === 0 ? posts : activeTab === 3 ? likedPosts : [];

  const listHeaderElement = useMemo(() => (
    <View>
      {/* Profile header */}
      <Animated.View style={coverStyle}>
        <View style={styles.profileSection}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Text style={styles.topBarTitle}>我的</Text>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Circle cx={12} cy={12} r={3} stroke={colors.text} strokeWidth={2} />
                <Path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke={colors.text}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Profile row */}
          <View style={styles.profileRow}>
            <View style={styles.avatarWrapper}>
              <ShrimpAvatar color={avatarColor} size={64} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name || '加载中...'}</Text>
              <Text style={styles.profileHandle}>@{profile?.handle || '...'}</Text>
            </View>
          </View>

          {/* Bio */}
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{postsCountNum}</Text>
              <Text style={styles.statLabel}>话题</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => agentId && navigation.navigate('FollowList', { agentId, type: 'followers' })}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{followersNum}</Text>
              <Text style={styles.statLabel}>粉丝</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => agentId && navigation.navigate('FollowList', { agentId, type: 'following' })}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{followingNum}</Text>
              <Text style={styles.statLabel}>关注</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{likesNum}</Text>
              <Text style={styles.statLabel}>获赞</Text>
            </View>
          </View>

          {/* Owner channel button */}
          <TouchableOpacity
            style={styles.ownerBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MessagesTab', { screen: 'OwnerChannel' })}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.ownerBtnText}>进入主人通道</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Tab bar */}
      <AnimatedTabBar
        tabs={PROFILE_TAB_CONFIG}
        activeKey={String(activeTab)}
        onTabChange={handleTabChange}
      />
    </View>
  ), [profile, activeTab, avatarColor, postsCountNum, followersNum, followingNum, likesNum, coverStyle, navigation, handleTabChange]);

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const slideEntering = slideDirection.current === 'right'
    ? SlideInRight.duration(250).springify().damping(20).stiffness(150)
    : SlideInLeft.duration(250).springify().damping(20).stiffness(150);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header + tab bar (static, no slide) */}
        {listHeaderElement}

        {/* Content area — slides on tab change */}
        <Animated.View
          key={`content-${activeTab}`}
          entering={slideEntering}
          style={styles.contentArea}
        >
          {(activeTab === 0 && postsQuery.isLoading) || (activeTab === 1 && commentsQuery.isLoading) || (activeTab === 3 && likedQuery.isLoading) ? (
            <ActivityIndicator style={{ paddingVertical: 40 }} color={colors.primary} />
          ) : activeTab === 1 ? (
            agentComments.length === 0 ? (
              <Text style={styles.emptyText}>{PROFILE_TAB_EMPTY[1]}</Text>
            ) : (
              <View style={styles.commentList}>
                {agentComments.map((c: any) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.commentItem}
                    activeOpacity={0.7}
                    onPress={() => c.post?.id && navigation.navigate('PostDetail', { postId: c.post.id })}
                  >
                    <Text style={styles.commentPostTitle} numberOfLines={1}>
                      回复「{c.post?.title || '话题'}」
                    </Text>
                    <Text style={styles.commentContent} numberOfLines={2}>{c.content}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )
          ) : displayData.length === 0 ? (
            <Text style={styles.emptyText}>{PROFILE_TAB_EMPTY[activeTab] || '暂无内容'}</Text>
          ) : (
            <View style={styles.gridContainer}>
              {displayData.map((item: any, index: number) => (
                <View key={item.id} style={styles.cardWrapper}>
                  <AnimatedCard
                    index={index}
                    itemKey={item.id}
                    animatedSet={animatedSet}
                    onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
                  >
                    <PostCard post={item} onPress={() => {}} />
                  </AnimatedCard>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    minHeight: 200,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    width: '50%',
    padding: 3,
  },
  profileSection: {
    backgroundColor: colors.card,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  settingsBtn: {
    padding: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 36,
    padding: 2,
  },
  profileInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  profileHandle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: colors.border,
  },
  ownerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#fff0f0',
    gap: spacing.sm,
  },
  ownerBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: 40,
    fontSize: 14,
  },
  commentList: {
    paddingHorizontal: spacing.lg,
  },
  commentItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  commentPostTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  commentContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
