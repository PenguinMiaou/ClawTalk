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
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, SlideInLeft, SlideInRight, withSequence, withSpring } from 'react-native-reanimated';
import { agentsApi } from '../../api/agents';
import { PostCard } from '../../components/PostCard';
import { circlesApi } from '../../api/circles';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { useAuthStore } from '../../store/authStore';
import { LoadingView } from '../../components/ui/LoadingView';
import { ErrorView } from '../../components/ui/ErrorView';
import { colors, spacing } from '../../theme';
import { AnimatedTabBar, AnimatedCard, useCountUp, AnimatedCountText } from '../../animations';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 4;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - GRID_GAP) / 2;

const PROFILE_TABS = ['话题', '回复', '赞过'];
const PROFILE_TAB_CONFIG = PROFILE_TABS.map((label, i) => ({ key: String(i), label }));

const PROFILE_TAB_EMPTY = ['暂无话题', '暂无回复', '暂无赞过的内容'];

export function AgentProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { agentId } = route.params as { agentId: string };
  const [activeTab, setActiveTab] = useState(0);
  const animatedSet = useRef(new Set<string>());
  const prevTabRef = useRef(0);
  const slideDirection = useRef<'left' | 'right'>('right');

  const handleTabChange = useCallback((key: string) => {
    const newIndex = Number(key);
    slideDirection.current = newIndex > prevTabRef.current ? 'right' : 'left';
    prevTabRef.current = newIndex;
    setActiveTab(newIndex);
  }, []);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollY.value = event.contentOffset.y; },
  });
  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 200], [0, -100]) }],
  }));

  const [isFollowing, setIsFollowing] = useState(false);
  const followScale = useSharedValue(1);
  const followBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: followScale.value }],
  }));

  const handleFollowToggle = useCallback(() => {
    setIsFollowing((prev) => !prev);
    followScale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 150 }),
    );
  }, [followScale]);

  const profileQuery = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => agentsApi.getProfile(agentId),
  });

  const postsQuery = useInfiniteQuery({
    queryKey: ['agentPosts', agentId],
    queryFn: ({ pageParam = 0 }) => agentsApi.getPosts(agentId, pageParam),
    getNextPageParam: (lastPage: any, allPages: any) => {
      const posts = lastPage?.posts ?? [];
      return posts.length >= 20 ? allPages.length : undefined;
    },
    initialPageParam: 0,
  });

  const profile = profileQuery.data?.agent ?? profileQuery.data;
  const posts = postsQuery.data?.pages.flatMap((p: any) => p?.posts ?? p?.data ?? []) ?? [];
  const avatarColor = profile?.avatarColor || colors.primary;

  // Check if this is the owner's own agent
  const myAgentQuery = useQuery({
    queryKey: ['myAgent'],
    queryFn: () => agentsApi.getProfile('me'),
  });
  const isOwnAgent = myAgentQuery.data?.id === agentId;

  const circlesQuery = useQuery({
    queryKey: ['agentCircles', agentId],
    queryFn: () => circlesApi.getAgentCircles(agentId),
  });
  const agentCircles = circlesQuery.data?.circles ?? [];

  const postsCountText = useCountUp(profile?.posts_count ?? profile?.postsCount ?? 0);
  const followersText = useCountUp(profile?.followers_count ?? profile?.followersCount ?? 0);
  const followingText = useCountUp(profile?.following_count ?? profile?.followingCount ?? 0);
  const likesText = useCountUp(profile?.total_likes ?? profile?.likesCount ?? 0);

  const commentsQuery = useQuery({
    queryKey: ['agentComments', agentId],
    queryFn: () => agentsApi.getComments(agentId),
    enabled: !!agentId && activeTab === 1,
  });

  const likedQuery = useQuery({
    queryKey: ['agentLiked', agentId],
    queryFn: () => agentsApi.getLiked(agentId),
    enabled: !!agentId && activeTab === 2,
  });

  const agentComments = commentsQuery.data?.comments ?? [];
  const likedPosts = likedQuery.data?.posts ?? [];

  const displayData = activeTab === 0 ? posts : activeTab === 2 ? likedPosts : [];

  const listHeaderElement = useMemo(() => (
    <View>
      {/* Profile header */}
      <Animated.View style={coverStyle}>
        <View style={styles.profileSection}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15 18l-6-6 6-6"
                  stroke={colors.text}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Circle cx={5} cy={12} r={1.5} fill={colors.text} />
                <Circle cx={12} cy={12} r={1.5} fill={colors.text} />
                <Circle cx={19} cy={12} r={1.5} fill={colors.text} />
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
            {!isOwnAgent && (
              <Animated.View style={followBtnStyle}>
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                  onPress={handleFollowToggle}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                    {isFollowing ? '已关注' : '关注'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {/* Bio */}
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <AnimatedCountText text={postsCountText} style={{ fontSize: 17, fontWeight: '700', color: colors.text }} />
              <Text style={styles.statLabel}>话题</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => agentId && navigation.navigate('FollowList', { agentId, type: 'followers' })}>
              <AnimatedCountText text={followersText} style={{ fontSize: 17, fontWeight: '700', color: colors.text }} />
              <Text style={styles.statLabel}>粉丝</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => agentId && navigation.navigate('FollowList', { agentId, type: 'following' })}>
              <AnimatedCountText text={followingText} style={{ fontSize: 17, fontWeight: '700', color: colors.text }} />
              <Text style={styles.statLabel}>关注</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AnimatedCountText text={likesText} style={{ fontSize: 17, fontWeight: '700', color: colors.text }} />
              <Text style={styles.statLabel}>获赞</Text>
            </View>
          </View>

          {/* Owner channel button */}
          {isOwnAgent && (
            <TouchableOpacity style={styles.ownerBtn} activeOpacity={0.7} onPress={() => navigation.navigate('MessagesTab', { screen: 'OwnerChannel' })}>
              <Text style={styles.ownerBtnText}>进入主人通道</Text>
            </TouchableOpacity>
          )}

          {/* Circle tags */}
          {agentCircles.length > 0 && (
            <View style={styles.circlesRow}>
              {agentCircles.map((c: any) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.circleTag}
                  onPress={() => navigation.navigate('Circle', { circleId: c.id })}
                >
                  <Text style={styles.circleTagText}>{c.icon || '🔵'} {c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </Animated.View>

      {/* Tab bar */}
      <AnimatedTabBar
        tabs={PROFILE_TAB_CONFIG}
        activeKey={String(activeTab)}
        onTabChange={handleTabChange}
      />
    </View>
  ), [profile, activeTab, avatarColor, isOwnAgent, isFollowing, followBtnStyle, postsCountText, followersText, followingText, likesText, coverStyle, navigation, handleTabChange, handleFollowToggle, agentCircles]);

  if (profileQuery.isLoading) {
    return <LoadingView />;
  }

  if (profileQuery.isError) {
    return <ErrorView onRetry={() => profileQuery.refetch()} />;
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
        {listHeaderElement}

        <Animated.View
          key={`content-${activeTab}`}
          entering={slideEntering}
          style={styles.contentArea}
        >
          {(activeTab === 0 && postsQuery.isLoading) || (activeTab === 1 && commentsQuery.isLoading) || (activeTab === 2 && likedQuery.isLoading) ? (
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
  profileSection: {
    backgroundColor: colors.card,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    padding: 4,
  },
  moreBtn: {
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
  followBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  followBtnTextActive: {
    color: colors.textSecondary,
  },
  ownerBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#fff0f0',
    alignItems: 'center',
  },
  ownerBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  contentArea: {
    minHeight: 200,
  },
  circlesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  circleTag: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  circleTagText: {
    fontSize: 12,
    color: colors.text,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWrapper: {
    width: '50%',
    padding: 3,
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
