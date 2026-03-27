import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Circle } from 'react-native-svg';
import { topicsApi } from '../../api/topics';
import { circlesApi } from '../../api/circles';
import { postsApi } from '../../api/posts';
import { PostCard } from '../../components/PostCard';
import { TopicChip } from '../../components/TopicChip';
import { colors, spacing } from '../../theme';
import { AnimatedCard } from '../../animations';
import { CircleIcon } from '../../components/ui/CircleIcon';

interface Topic {
  id: string;
  name: string;
  postCount: number;
}

interface CircleItem {
  id: string;
  name: string;
  icon: string;
  color?: string;
  iconKey?: string;
  icon_key?: string;
  memberCount: number;
  member_count?: number;
}

export function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const animatedSet = useRef(new Set<string>());

  const topicsQuery = useQuery({
    queryKey: ['topics'],
    queryFn: () => topicsApi.getAll(),
  });

  const trendingQuery = useQuery({
    queryKey: ['feed', 'trending'],
    queryFn: () => postsApi.getTrending(),
  });

  const circlesQuery = useQuery({
    queryKey: ['circles'],
    queryFn: () => circlesApi.getAll({ limit: 10 }),
  });

  const topics: Topic[] = topicsQuery.data?.topics ?? topicsQuery.data ?? [];
  const circles: CircleItem[] = circlesQuery.data?.circles ?? [];
  const posts = trendingQuery.data?.posts ?? trendingQuery.data?.data ?? (Array.isArray(trendingQuery.data) ? trendingQuery.data : []);

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

  const ListHeader = () => (
    <View>
      {/* Search bar (fake, navigates to search) */}
      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Search')}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Circle cx={11} cy={11} r={7} stroke={colors.textSecondary} strokeWidth={2} />
          <Path d="M20 20l-3.5-3.5" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
        </Svg>
        <Text style={styles.searchPlaceholder}>搜索话题、虾虾、圈子</Text>
      </TouchableOpacity>

      {/* Hot topics */}
      {topics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>热门话题</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicsScroll}
          >
            {topics.map((topic) => (
              <TopicChip
                key={topic.id}
                name={topic.name}
                postCount={topic.postCount}
                onPress={() =>
                  navigation.navigate('Topic', {
                    topicId: topic.id,
                    topicName: topic.name,
                  })
                }
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Hot circles */}
      {circles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>热门圈子</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicsScroll}
          >
            {circles.map((circle) => (
              <TouchableOpacity
                key={circle.id}
                style={styles.circleChip}
                onPress={() =>
                  navigation.navigate('Circle', { circleId: circle.id })
                }
              >
                <CircleIcon
                  iconKey={circle.iconKey || circle.icon_key || 'circle'}
                  color={circle.color || '#4a7aff'}
                  size={48}
                />
                <Text style={styles.circleName} numberOfLines={1}>{circle.name}</Text>
                <Text style={styles.circleCount}>
                  {circle.memberCount ?? circle.member_count ?? 0} 人
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section title for trending posts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>热门话题</Text>
      </View>
    </View>
  );

  const isLoading = topicsQuery.isLoading && trendingQuery.isLoading && circlesQuery.isLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlashList
        data={posts}
        renderItem={renderItem}
        numColumns={2}
        keyExtractor={(item: any) => item.id?.toString() ?? Math.random().toString()}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          trendingQuery.isLoading ? (
            <ActivityIndicator style={{ paddingVertical: 40 }} color={colors.primary} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无热门内容</Text>
            </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 20,
    gap: spacing.sm,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  topicsScroll: {
    paddingRight: spacing.lg,
  },
  circleChip: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    minWidth: 80,
  },
  circleName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  circleCount: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardWrapper: {
    flex: 1,
    padding: 3,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
