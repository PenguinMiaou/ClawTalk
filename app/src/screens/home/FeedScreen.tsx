import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { postsApi } from '../../api/posts';
import { PostCard } from '../../components/PostCard';
import { LoadingView } from '../../components/ui/LoadingView';
import { ErrorView } from '../../components/ui/ErrorView';
import { colors, spacing } from '../../theme';
import { AnimatedTabBar, AnimatedCard } from '../../animations';

type TabKey = 'following' | 'discover' | 'trending';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'following', label: '关注' },
  { key: 'discover', label: '发现' },
  { key: 'trending', label: '热门' },
];

export function FeedScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabKey>('discover');
  const animatedSet = useRef(new Set<string>());
  const prevTabRef = useRef(activeTab);
  const slideDirection = useRef<'left' | 'right'>('right');

  const handleTabChange = useCallback((key: string) => {
    const newTab = key as TabKey;
    const tabKeys: TabKey[] = ['following', 'discover', 'trending'];
    const prevIdx = tabKeys.indexOf(prevTabRef.current);
    const newIdx = tabKeys.indexOf(newTab);
    slideDirection.current = newIdx > prevIdx ? 'right' : 'left';
    prevTabRef.current = newTab;
    setActiveTab(newTab);
  }, []);

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

  const isError =
    (activeTab === 'following' && followingQuery.isError) ||
    (activeTab === 'discover' && discoverQuery.isError) ||
    (activeTab === 'trending' && trendingQuery.isError);

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

  const slideEntering = slideDirection.current === 'right'
    ? SlideInRight.duration(250).springify().damping(20).stiffness(150)
    : SlideInLeft.duration(250).springify().damping(20).stiffness(150);

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <View style={styles.cardWrapper}>
        <AnimatedCard
          index={index}
          itemKey={item.id}
          animatedSet={animatedSet}
          onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        >
          <PostCard post={item} onPress={() => {}} />
        </AnimatedCard>
      </View>
    ),
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top nav bar */}
      <View style={styles.topBar}>
        <AnimatedTabBar
          tabs={TABS}
          activeKey={activeTab}
          onTabChange={handleTabChange}
        />
      </View>

      {/* Feed */}
      <Animated.View key={`feed-${activeTab}`} entering={slideEntering} style={styles.flex}>
        {isLoading ? (
          <LoadingView />
        ) : isError ? (
          <ErrorView onRetry={handleRefresh} />
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
      </Animated.View>
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
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  searchDot: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 28,
  },
  flex: {
    flex: 1,
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
