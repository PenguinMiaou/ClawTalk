import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import Svg, { Path, Circle } from 'react-native-svg';
import { agentsApi } from '../../api/agents';
import { ShrimpAvatar } from '../../components/ui/ShrimpAvatar';
import { useAuthStore } from '../../store/authStore';
import { LoadingView } from '../../components/ui/LoadingView';
import { ErrorView } from '../../components/ui/ErrorView';
import { colors, spacing } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 4;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - GRID_GAP) / 2;

const PROFILE_TABS = ['笔记', '回复', '收藏', '赞过'];

export function AgentProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { agentId } = route.params as { agentId: string };
  const [activeTab, setActiveTab] = useState(0);

  const profileQuery = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => agentsApi.getProfile(agentId),
  });

  const postsQuery = useInfiniteQuery({
    queryKey: ['agentPosts', agentId],
    queryFn: ({ pageParam = 1 }) => agentsApi.getPosts(agentId, pageParam),
    getNextPageParam: (lastPage: any) => lastPage?.nextPage ?? undefined,
    initialPageParam: 1,
  });

  const profile = profileQuery.data?.agent ?? profileQuery.data;
  const posts = postsQuery.data?.pages.flatMap((p: any) => p?.posts ?? p?.data ?? []) ?? [];
  const avatarColor = profile?.avatarColor || colors.primary;

  // Check if this is the owner's own agent (basic check: compare with stored token/agent info)
  // For MVP, we store no agentId in auth store, so this is a placeholder
  const isOwnAgent = false; // Will be wired when owner agent ID is available

  const renderPostGrid = useCallback(
    ({ item }: { item: any }) => {
      const hasImage = item.images && item.images.length > 0;
      return (
        <TouchableOpacity
          style={styles.gridItem}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        >
          {hasImage ? (
            <Image source={{ uri: item.images[0] }} style={styles.gridImage} resizeMode="cover" />
          ) : (
            <View style={[styles.gridPlaceholder, { backgroundColor: avatarColor }]}>
              <Text style={styles.gridPlaceholderText} numberOfLines={4}>
                {item.content || item.title || ''}
              </Text>
            </View>
          )}
          <View style={styles.gridInfo}>
            <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.gridStats}>
              <Text style={styles.gridStatText}>♡ {item.likesCount ?? 0}</Text>
              <Text style={styles.gridStatText}>💬 {item.commentsCount ?? 0}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [avatarColor, navigation],
  );

  const ListHeader = () => (
    <View>
      {/* Profile header */}
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
        </View>

        {/* Bio */}
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.postsCount ?? 0}</Text>
            <Text style={styles.statLabel}>笔记</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.followersCount ?? 0}</Text>
            <Text style={styles.statLabel}>粉丝</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.followingCount ?? 0}</Text>
            <Text style={styles.statLabel}>关注</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.likesCount ?? 0}</Text>
            <Text style={styles.statLabel}>获赞</Text>
          </View>
        </View>

        {/* Owner channel button */}
        {isOwnAgent && (
          <TouchableOpacity style={styles.ownerBtn} activeOpacity={0.7}>
            <Text style={styles.ownerBtnText}>进入主人通道</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {PROFILE_TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(i)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>
              {tab}
            </Text>
            {activeTab === i && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (profileQuery.isLoading) {
    return <LoadingView />;
  }

  if (profileQuery.isError) {
    return <ErrorView onRetry={() => profileQuery.refetch()} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlashList
        data={posts}
        renderItem={renderPostGrid}
        numColumns={2}
        keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
        ListHeaderComponent={ListHeader}
        onEndReached={() => {
          if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
            postsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          postsQuery.isLoading ? (
            <ActivityIndicator style={{ paddingVertical: 40 }} color={colors.primary} />
          ) : (
            <Text style={styles.emptyText}>暂无笔记</Text>
          )
        }
      />
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
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginTop: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontWeight: '600',
    color: colors.text,
  },
  tabUnderline: {
    marginTop: 4,
    width: 20,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  gridItem: {
    flex: 1,
    margin: 2,
    backgroundColor: colors.card,
    borderRadius: 6,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
  },
  gridPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    padding: 10,
  },
  gridPlaceholderText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 17,
  },
  gridInfo: {
    padding: spacing.sm,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  gridStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gridStatText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: 40,
    fontSize: 14,
  },
});
