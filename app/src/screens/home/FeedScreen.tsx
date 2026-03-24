import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { postsApi } from '../../api/posts';
import { PostCard } from '../../components/PostCard';
import { colors, spacing } from '../../theme';

type TabKey = 'following' | 'discover' | 'trending';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'following', label: '关注' },
  { key: 'discover', label: '发现' },
  { key: 'trending', label: '热门' },
];

export function FeedScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabKey>('discover');

  // Infinite query for "关注"
  const followingQuery = useInfiniteQuery({
    queryKey: ['feed', 'following'],
    queryFn: ({ pageParam = 1 }) =>
      postsApi.getFeed({ page: pageParam, filter: 'following' }),
    getNextPageParam: (lastPage: any) =>
      lastPage?.nextPage ?? undefined,
    initialPageParam: 1,
    enabled: activeTab === 'following',
  });

  // Infinite query for "发现"
  const discoverQuery = useInfiniteQuery({
    queryKey: ['feed', 'discover'],
    queryFn: ({ pageParam = 1 }) =>
      postsApi.getFeed({ page: pageParam }),
    getNextPageParam: (lastPage: any) =>
      lastPage?.nextPage ?? undefined,
    initialPageParam: 1,
    enabled: activeTab === 'discover',
  });

  // Regular query for "热门"
  const trendingQuery = useQuery({
    queryKey: ['feed', 'trending'],
    queryFn: () => postsApi.getTrending(),
    enabled: activeTab === 'trending',
  });

  const getActiveData = useCallback((): any[] => {
    if (activeTab === 'following') {
      return followingQuery.data?.pages.flatMap((p: any) => p?.posts ?? p?.data ?? []) ?? [];
    }
    if (activeTab === 'discover') {
      return discoverQuery.data?.pages.flatMap((p: any) => p?.posts ?? p?.data ?? []) ?? [];
    }
    // trending
    const d = trendingQuery.data;
    return d?.posts ?? d?.data ?? (Array.isArray(d) ? d : []);
  }, [activeTab, followingQuery.data, discoverQuery.data, trendingQuery.data]);

  const isLoading =
    (activeTab === 'following' && followingQuery.isLoading) ||
    (activeTab === 'discover' && discoverQuery.isLoading) ||
    (activeTab === 'trending' && trendingQuery.isLoading);

  const isRefreshing =
    (activeTab === 'following' && followingQuery.isRefetching) ||
    (activeTab === 'discover' && discoverQuery.isRefetching) ||
    (activeTab === 'trending' && trendingQuery.isRefetching);

  const handleRefresh = () => {
    if (activeTab === 'following') followingQuery.refetch();
    else if (activeTab === 'discover') discoverQuery.refetch();
    else trendingQuery.refetch();
  };

  const handleEndReached = () => {
    if (activeTab === 'following' && followingQuery.hasNextPage && !followingQuery.isFetchingNextPage) {
      followingQuery.fetchNextPage();
    } else if (activeTab === 'discover' && discoverQuery.hasNextPage && !discoverQuery.isFetchingNextPage) {
      discoverQuery.fetchNextPage();
    }
    // trending has no pagination
  };

  const posts = getActiveData();

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.cardWrapper}>
        <PostCard
          post={item}
          onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        />
      </View>
    ),
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top nav bar */}
      <View style={styles.topBar}>
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {activeTab === tab.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.7}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx={11} cy={11} r={7} stroke={colors.text} strokeWidth={2} />
            <Path d="M20 20l-3.5-3.5" stroke={colors.text} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Feed */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlashList
          data={posts}
          renderItem={renderItem}
          numColumns={2}
          keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无内容</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabItem: {
    marginHorizontal: spacing.lg,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontWeight: 'bold',
    color: colors.text,
  },
  tabUnderline: {
    marginTop: 4,
    width: 20,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  searchBtn: {
    padding: 4,
  },
  listContent: {
  },
  cardWrapper: {
    flex: 1,
    padding: 3,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
